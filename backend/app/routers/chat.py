from datetime import datetime
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.auth import get_current_user
from app.core.db import get_db
from app.core.storage import save_chat_file, save_audio_file, get_file_url
from app.core.websocket import manager
from app.models.user import (
    User, Consumer, Supplier, ConsumerStaff, SupplierStaff,
    ConsumerSupplierLink, ChatThread, ChatMessage, ChatAttachment,
    CannedReply, Product, UserPresence
)
from app.models.enums import LinkStatus
from pydantic import BaseModel
import json
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])


# Request/Response Models
class SendMessageRequest(BaseModel):
    message_text: str
    message_type: str = "TEXT"
    product_id: UUID | None = None
    attachment_urls: List[str] | None = None


class MessageResponse(BaseModel):
    id: UUID
    thread_id: UUID
    sender_id: UUID
    sender_type: str
    message_text: str
    message_type: str
    product_id: UUID | None
    sent_at: datetime
    read_at: datetime | None
    attachments: List[dict] = []

    class Config:
        from_attributes = True


class ThreadResponse(BaseModel):
    id: UUID
    link_id: UUID
    consumer_id: UUID
    supplier_id: UUID
    created_at: datetime
    last_message_at: datetime | None
    unread_count: int = 0

    class Config:
        from_attributes = True


class MarkAsReadRequest(BaseModel):
    message_ids: List[UUID]


class UserPresenceResponse(BaseModel):
    user_id: UUID
    is_online: bool
    last_seen: datetime
    connected_at: datetime | None

    class Config:
        from_attributes = True


# Helper Functions
def get_consumer_for_user(db: Session, user: User) -> Consumer | None:
    """Get consumer entity for current user"""
    consumer_staff = db.query(ConsumerStaff).filter(
        ConsumerStaff.user_id == user.id
    ).first()

    if not consumer_staff:
        return None

    return db.query(Consumer).filter(
        Consumer.id == consumer_staff.consumer_id
    ).first()


def get_supplier_for_user(db: Session, user: User) -> Supplier | None:
    """Get supplier entity for current user"""
    supplier_staff = db.query(SupplierStaff).filter(
        SupplierStaff.user_id == user.id
    ).first()

    if not supplier_staff:
        return None

    return db.query(Supplier).filter(
        Supplier.id == supplier_staff.supplier_id
    ).first()


def validate_link_access(
    db: Session,
    link_id: UUID,
    user: User,
    consumer: Consumer | None = None,
    supplier: Supplier | None = None
) -> ConsumerSupplierLink:
    """
    Validate that:
    1. Link exists
    2. Link is approved (ACCEPTED status)
    3. User has access to this link (either as consumer or supplier)
    """
    link = db.query(ConsumerSupplierLink).filter(
        ConsumerSupplierLink.id == link_id
    ).first()

    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Link not found"
        )

    # Check if link is approved
    if link.status != LinkStatus.ACCEPTED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chat is only available for approved links"
        )

    # Check if user has access to this link
    if consumer:
        if link.consumer_id != consumer.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this chat"
            )
    elif supplier:
        if link.supplier_id != supplier.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this chat"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User must be associated with either a consumer or supplier"
        )

    return link


def get_or_create_thread(db: Session, link_id: UUID) -> ChatThread:
    """Get existing thread or create new one for a link"""
    thread = db.query(ChatThread).filter(
        ChatThread.link_id == link_id
    ).first()

    if not thread:
        now = datetime.utcnow()
        thread = ChatThread(
            link_id=link_id,
            created_at=now,
            last_message_at=now
        )
        db.add(thread)
        db.commit()
        db.refresh(thread)

    return thread


# Endpoints

@router.get("/threads", response_model=List[ThreadResponse])
def get_chat_threads(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all chat threads for the current user.
    Returns threads for approved links only.
    """
    consumer = get_consumer_for_user(db, current_user)
    supplier = get_supplier_for_user(db, current_user)

    if not consumer and not supplier:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User must be associated with either a consumer or supplier"
        )

    # Get approved links
    if consumer:
        links = db.query(ConsumerSupplierLink).filter(
            ConsumerSupplierLink.consumer_id == consumer.id,
            ConsumerSupplierLink.status == LinkStatus.ACCEPTED
        ).all()
    else:
        links = db.query(ConsumerSupplierLink).filter(
            ConsumerSupplierLink.supplier_id == supplier.id,
            ConsumerSupplierLink.status == LinkStatus.ACCEPTED
        ).all()

    threads = []
    for link in links:
        # Get or create thread for each accepted link
        thread = get_or_create_thread(db, link.id)

        # Calculate unread messages
        unread_count = db.query(ChatMessage).filter(
            ChatMessage.thread_id == thread.id,
            ChatMessage.sender_id != current_user.id,
            ChatMessage.read_at.is_(None)
        ).count()

        threads.append(ThreadResponse(
            id=thread.id,
            link_id=link.id,
            consumer_id=link.consumer_id,
            supplier_id=link.supplier_id,
            created_at=thread.created_at,
            last_message_at=thread.last_message_at,
            unread_count=unread_count
        ))

    return threads


@router.post("/links/{link_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    link_id: UUID,
    request: SendMessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Send a message in a chat thread.
    Requires approved link between consumer and supplier.
    """
    consumer = get_consumer_for_user(db, current_user)
    supplier = get_supplier_for_user(db, current_user)

    # Validate link access
    link = validate_link_access(db, link_id, current_user, consumer, supplier)

    # Get or create thread
    thread = get_or_create_thread(db, link_id)

    # Validate product reference if provided
    if request.product_id:
        product = db.query(Product).filter(
            Product.id == request.product_id
        ).first()

        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )

        # Validate product belongs to the supplier in this link
        if product.supplier_id != link.supplier_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product does not belong to this supplier"
            )

    # Determine sender type
    sender_type = "CONSUMER" if consumer else "SUPPLIER"

    # Create message
    message = ChatMessage(
        thread_id=thread.id,
        sender_id=current_user.id,
        sender_type=sender_type,
        message_text=request.message_text,
        message_type=request.message_type,
        product_id=request.product_id,
        sent_at=datetime.utcnow(),
        read_at=None
    )
    db.add(message)

    # Update thread's last message time
    thread.last_message_at = datetime.utcnow()

    db.commit()
    db.refresh(message)

    # Add attachments if provided
    attachments = []
    if request.attachment_urls:
        for url in request.attachment_urls:
            # Parse file info from URL (simplified - in production, validate and store properly)
            file_name = url.split('/')[-1]
            file_type = file_name.split('.')[-1] if '.' in file_name else 'unknown'

            attachment = ChatAttachment(
                message_id=message.id,
                file_url=url,
                file_type=file_type,
                file_name=file_name
            )
            db.add(attachment)
            attachments.append({
                "file_url": url,
                "file_type": file_type,
                "file_name": file_name
            })

        db.commit()

    # Broadcast message to WebSocket clients
    await manager.broadcast_to_link(
        link_id,
        {
            "type": "new_message",
            "data": {
                "id": str(message.id),
                "thread_id": str(message.thread_id),
                "sender_id": str(message.sender_id),
                "sender_type": message.sender_type,
                "message_text": message.message_text,
                "message_type": message.message_type,
                "product_id": str(message.product_id) if message.product_id else None,
                "sent_at": message.sent_at.isoformat(),
                "read_at": None,
                "attachments": attachments
            }
        }
    )

    return MessageResponse(
        id=message.id,
        thread_id=message.thread_id,
        sender_id=message.sender_id,
        sender_type=message.sender_type,
        message_text=message.message_text,
        message_type=message.message_type,
        product_id=message.product_id,
        sent_at=message.sent_at,
        read_at=message.read_at,
        attachments=attachments
    )


@router.get("/links/{link_id}/messages", response_model=List[MessageResponse])
def get_messages(
    link_id: UUID,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get messages from a chat thread.
    Requires approved link between consumer and supplier.
    """
    consumer = get_consumer_for_user(db, current_user)
    supplier = get_supplier_for_user(db, current_user)

    # Validate link access
    link = validate_link_access(db, link_id, current_user, consumer, supplier)

    # Get thread
    thread = db.query(ChatThread).filter(
        ChatThread.link_id == link_id
    ).first()

    if not thread:
        return []

    # Get messages
    messages = db.query(ChatMessage).filter(
        ChatMessage.thread_id == thread.id
    ).order_by(ChatMessage.sent_at.desc()).limit(limit).offset(offset).all()

    # Format response with attachments
    result = []
    for msg in messages:
        attachments_data = []
        for att in msg.attachments:
            attachments_data.append({
                "id": str(att.id),
                "file_url": att.file_url,
                "file_type": att.file_type,
                "file_name": att.file_name
            })

        result.append(MessageResponse(
            id=msg.id,
            thread_id=msg.thread_id,
            sender_id=msg.sender_id,
            sender_type=msg.sender_type,
            message_text=msg.message_text,
            message_type=msg.message_type,
            product_id=msg.product_id,
            sent_at=msg.sent_at,
            read_at=msg.read_at,
            attachments=attachments_data
        ))

    return result


@router.post("/messages/mark-read", status_code=status.HTTP_200_OK)
async def mark_messages_as_read(
    request: MarkAsReadRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Mark messages as read.
    Only the recipient can mark messages as read.
    """
    if not request.message_ids:
        return {"message": "No messages to mark as read"}

    # Get messages
    messages = db.query(ChatMessage).filter(
        ChatMessage.id.in_(request.message_ids)
    ).all()

    if not messages:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Messages not found"
        )

    consumer = get_consumer_for_user(db, current_user)
    supplier = get_supplier_for_user(db, current_user)

    marked_count = 0
    marked_message_ids = []
    link_ids_to_notify = set()
    read_at = datetime.utcnow()

    for message in messages:
        # Validate user has access to this message's thread
        thread = db.query(ChatThread).filter(
            ChatThread.id == message.thread_id
        ).first()

        if not thread:
            continue

        link = db.query(ConsumerSupplierLink).filter(
            ConsumerSupplierLink.id == thread.link_id
        ).first()

        if not link:
            continue

        # Check access
        has_access = False
        if consumer and link.consumer_id == consumer.id:
            has_access = True
        elif supplier and link.supplier_id == supplier.id:
            has_access = True

        if not has_access:
            continue

        # Only mark as read if user is not the sender and message is not already read
        if message.sender_id != current_user.id and message.read_at is None:
            message.read_at = read_at
            marked_count += 1
            marked_message_ids.append(str(message.id))
            link_ids_to_notify.add(link.id)

    db.commit()

    # Broadcast read receipts to WebSocket clients
    for link_id in link_ids_to_notify:
        await manager.broadcast_to_link(
            link_id,
            {
                "type": "messages_read",
                "data": {
                    "message_ids": marked_message_ids,
                    "read_by": str(current_user.id),
                    "read_at": read_at.isoformat()
                }
            }
        )

    return {
        "message": f"Marked {marked_count} messages as read",
        "marked_count": marked_count
    }


@router.get("/links/{link_id}/presence", response_model=List[UserPresenceResponse])
def get_user_presence(
    link_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get online/offline presence status for users in a link.
    Returns presence information for both consumer and supplier users in the link.
    """
    consumer = get_consumer_for_user(db, current_user)
    supplier = get_supplier_for_user(db, current_user)

    # Validate link access
    link = validate_link_access(db, link_id, current_user, consumer, supplier)

    # Get presence records for this link
    presence_records = db.query(UserPresence).filter(
        UserPresence.link_id == link_id
    ).all()

    # If no records exist, create default offline records
    if not presence_records:
        # Get user IDs for consumer and supplier
        consumer_users = db.query(ConsumerStaff).filter(
            ConsumerStaff.consumer_id == link.consumer_id
        ).all()
        supplier_users = db.query(SupplierStaff).filter(
            SupplierStaff.supplier_id == link.supplier_id
        ).all()

        presence_records = []
        from uuid import uuid4
        now = datetime.utcnow()

        for consumer_user in consumer_users:
            # Check if user is actually online via WebSocket
            is_online = manager.is_user_online(link_id, consumer_user.user_id)
            presence = UserPresence(
                id=uuid4(),
                user_id=consumer_user.user_id,
                link_id=link_id,
                is_online=is_online,
                last_seen=now,
                connected_at=now if is_online else None
            )
            presence_records.append(presence)

        for supplier_user in supplier_users:
            is_online = manager.is_user_online(link_id, supplier_user.user_id)
            presence = UserPresence(
                id=uuid4(),
                user_id=supplier_user.user_id,
                link_id=link_id,
                is_online=is_online,
                last_seen=now,
                connected_at=now if is_online else None
            )
            presence_records.append(presence)
    else:
        # Update presence records with current WebSocket status
        for presence in presence_records:
            is_online = manager.is_user_online(link_id, presence.user_id)
            if presence.is_online != is_online:
                presence.is_online = is_online
                if not is_online:
                    presence.last_seen = datetime.utcnow()
                    presence.connected_at = None

    return [
        UserPresenceResponse(
            user_id=p.user_id,
            is_online=p.is_online,
            last_seen=p.last_seen,
            connected_at=p.connected_at
        )
        for p in presence_records
    ]


# Canned Replies Endpoints

@router.post("/canned-replies", status_code=status.HTTP_201_CREATED)
def create_canned_reply(
    title: str,
    content: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a canned reply template.
    Only supplier staff can create canned replies.
    """
    supplier = get_supplier_for_user(db, current_user)

    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only supplier staff can create canned replies"
        )

    canned_reply = CannedReply(
        supplier_id=supplier.id,
        title=title,
        content=content,
        created_by=current_user.id,
        created_at=datetime.utcnow(),
        is_active=True
    )
    db.add(canned_reply)
    db.commit()
    db.refresh(canned_reply)

    return {
        "id": canned_reply.id,
        "title": canned_reply.title,
        "content": canned_reply.content,
        "created_at": canned_reply.created_at
    }


@router.get("/canned-replies")
def get_canned_replies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all active canned replies for the supplier.
    Only supplier staff can access canned replies.
    """
    supplier = get_supplier_for_user(db, current_user)

    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only supplier staff can view canned replies"
        )

    replies = db.query(CannedReply).filter(
        CannedReply.supplier_id == supplier.id,
        CannedReply.is_active == True
    ).order_by(CannedReply.created_at.desc()).all()

    return [
        {
            "id": reply.id,
            "title": reply.title,
            "content": reply.content,
            "created_at": reply.created_at
        }
        for reply in replies
    ]


@router.put("/canned-replies/{reply_id}")
def update_canned_reply(
    reply_id: UUID,
    title: str | None = None,
    content: str | None = None,
    is_active: bool | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a canned reply.
    Only supplier staff can update their canned replies.
    """
    supplier = get_supplier_for_user(db, current_user)

    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only supplier staff can update canned replies"
        )

    reply = db.query(CannedReply).filter(
        CannedReply.id == reply_id,
        CannedReply.supplier_id == supplier.id
    ).first()

    if not reply:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Canned reply not found"
        )

    if title is not None:
        reply.title = title
    if content is not None:
        reply.content = content
    if is_active is not None:
        reply.is_active = is_active

    db.commit()
    db.refresh(reply)

    return {
        "id": reply.id,
        "title": reply.title,
        "content": reply.content,
        "is_active": reply.is_active
    }


@router.delete("/canned-replies/{reply_id}")
def delete_canned_reply(
    reply_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete (deactivate) a canned reply.
    Only supplier staff can delete their canned replies.
    """
    supplier = get_supplier_for_user(db, current_user)

    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only supplier staff can delete canned replies"
        )

    reply = db.query(CannedReply).filter(
        CannedReply.id == reply_id,
        CannedReply.supplier_id == supplier.id
    ).first()

    if not reply:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Canned reply not found"
        )

    reply.is_active = False
    db.commit()

    return {"message": "Canned reply deleted successfully"}


# File Upload Endpoints

@router.post("/links/{link_id}/upload-file")
async def upload_chat_file(
    link_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a file attachment for chat.
    Supports images, documents (PDF, Word, Excel, etc.)
    Maximum file size: 10MB
    """
    consumer = get_consumer_for_user(db, current_user)
    supplier = get_supplier_for_user(db, current_user)

    # Validate link access
    validate_link_access(db, link_id, current_user, consumer, supplier)

    try:
        # Save file
        file_path, original_filename, file_type, file_size = await save_chat_file(file)
        file_url = get_file_url(file_path)

        return {
            "file_url": file_url,
            "file_name": original_filename,
            "file_type": file_type,
            "file_size": file_size,
            "message": "File uploaded successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"File upload failed: {str(e)}"
        )


@router.post("/links/{link_id}/upload-audio")
async def upload_audio_message(
    link_id: UUID,
    audio: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload an audio message.
    Supports: MP3, MP4, WAV, WebM, OGG, AAC, M4A
    Maximum file size: 5MB
    """
    consumer = get_consumer_for_user(db, current_user)
    supplier = get_supplier_for_user(db, current_user)

    # Validate link access
    validate_link_access(db, link_id, current_user, consumer, supplier)

    try:
        # Save audio file
        file_path, original_filename, file_type, file_size = await save_audio_file(audio)
        file_url = get_file_url(file_path)

        return {
            "audio_url": file_url,
            "file_name": original_filename,
            "file_type": file_type,
            "file_size": file_size,
            "duration": None,  # Could be extracted with libraries like mutagen
            "message": "Audio uploaded successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Audio upload failed: {str(e)}"
        )


@router.post("/links/{link_id}/send-audio-message", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_audio_message(
    link_id: UUID,
    audio: UploadFile = File(...),
    message_text: str = Form(default=""),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Send an audio message directly.
    This combines audio upload with message creation in one step.
    """
    consumer = get_consumer_for_user(db, current_user)
    supplier = get_supplier_for_user(db, current_user)

    # Validate link access
    link = validate_link_access(db, link_id, current_user, consumer, supplier)

    # Get or create thread
    thread = get_or_create_thread(db, link_id)

    try:
        # Save audio file
        file_path, original_filename, file_type, file_size = await save_audio_file(audio)
        file_url = get_file_url(file_path)

        # Determine sender type
        sender_type = "CONSUMER" if consumer else "SUPPLIER"

        # Create message
        message = ChatMessage(
            thread_id=thread.id,
            sender_id=current_user.id,
            sender_type=sender_type,
            message_text=message_text or "[Audio Message]",
            message_type="AUDIO",
            product_id=None,
            sent_at=datetime.utcnow(),
            read_at=None
        )
        db.add(message)
        db.flush()

        # Create attachment
        attachment = ChatAttachment(
            message_id=message.id,
            file_url=file_url,
            file_type=file_type,
            file_name=original_filename
        )
        db.add(attachment)

        # Update thread's last message time
        thread.last_message_at = datetime.utcnow()

        db.commit()
        db.refresh(message)

        return MessageResponse(
            id=message.id,
            thread_id=message.thread_id,
            sender_id=message.sender_id,
            sender_type=message.sender_type,
            message_text=message.message_text,
            message_type=message.message_type,
            product_id=message.product_id,
            sent_at=message.sent_at,
            read_at=message.read_at,
            attachments=[{
                "id": str(attachment.id),
                "file_url": file_url,
                "file_type": file_type,
                "file_name": original_filename
            }]
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send audio message: {str(e)}"
        )


@router.post("/links/{link_id}/send-with-files", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message_with_files(
    link_id: UUID,
    message_text: str = Form(...),
    message_type: str = Form(default="TEXT"),
    product_id: str = Form(default=None),
    files: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Send a message with file attachments.
    This endpoint supports multipart form data for uploading files along with the message.
    Maximum 5 files per message.
    """
    consumer = get_consumer_for_user(db, current_user)
    supplier = get_supplier_for_user(db, current_user)

    # Validate link access
    link = validate_link_access(db, link_id, current_user, consumer, supplier)

    # Validate number of files
    if len(files) > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 5 files per message"
        )

    # Get or create thread
    thread = get_or_create_thread(db, link_id)

    # Validate product reference if provided
    product_uuid = None
    if product_id:
        try:
            product_uuid = UUID(product_id)
            product = db.query(Product).filter(
                Product.id == product_uuid
            ).first()

            if not product:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Product not found"
                )

            if product.supplier_id != link.supplier_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Product does not belong to this supplier"
                )
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid product ID format"
            )

    try:
        # Determine sender type
        sender_type = "CONSUMER" if consumer else "SUPPLIER"

        # Create message
        message = ChatMessage(
            thread_id=thread.id,
            sender_id=current_user.id,
            sender_type=sender_type,
            message_text=message_text,
            message_type=message_type,
            product_id=product_uuid,
            sent_at=datetime.utcnow(),
            read_at=None
        )
        db.add(message)
        db.flush()

        # Upload and attach files
        attachments_data = []
        for file in files:
            if file.filename:  # Only process if file is provided
                file_path, original_filename, file_type, file_size = await save_chat_file(file)
                file_url = get_file_url(file_path)

                attachment = ChatAttachment(
                    message_id=message.id,
                    file_url=file_url,
                    file_type=file_type,
                    file_name=original_filename
                )
                db.add(attachment)
                attachments_data.append({
                    "file_url": file_url,
                    "file_type": file_type,
                    "file_name": original_filename
                })

        # Update thread's last message time
        thread.last_message_at = datetime.utcnow()

        db.commit()
        db.refresh(message)

        return MessageResponse(
            id=message.id,
            thread_id=message.thread_id,
            sender_id=message.sender_id,
            sender_type=message.sender_type,
            message_text=message.message_text,
            message_type=message.message_type,
            product_id=message.product_id,
            sent_at=message.sent_at,
            read_at=message.read_at,
            attachments=attachments_data
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send message with files: {str(e)}"
        )


# WebSocket endpoint for real-time chat
@router.websocket("/ws/{link_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    link_id: UUID,
    token: str,
):
    """
    WebSocket endpoint for real-time chat communication.

    Authentication: Pass JWT token as query parameter (?token=YOUR_TOKEN)

    Message Types (Client -> Server):
    - send_message: Send a new text message
    - mark_read: Mark messages as read
    - typing_start: Indicate user is typing
    - typing_stop: Indicate user stopped typing
    - ping: Heartbeat ping

    Message Types (Server -> Client):
    - new_message: New message received
    - message_read: Message(s) marked as read
    - user_online: User came online
    - user_offline: User went offline
    - typing: User is typing
    - pong: Heartbeat response
    - error: Error message
    - sync_messages: Sync missed messages after reconnection
    """
    db = None
    user_id = None

    try:
        # Authenticate user from token
        import jwt
        from jwt.exceptions import InvalidTokenError
        from app.core.config import settings
        from app.schemas import UserRead

        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            user_id = UUID(payload.get("sub"))
            if user_id is None:
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token")
                return
        except InvalidTokenError:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token")
            return

        # Get database session
        db = next(get_db())

        # Get user from database
        from app.auth.auth import get_user_by_id
        user = get_user_by_id(db, user_id)
        if not user:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="User not found")
            return

        # Get consumer or supplier for user
        consumer = get_consumer_for_user(db, user)
        supplier = get_supplier_for_user(db, user)

        # Validate link access
        try:
            link = validate_link_access(db, link_id, user, consumer, supplier)
        except HTTPException as e:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason=e.detail)
            return

        # Get sender type
        sender_type = "CONSUMER" if consumer else "SUPPLIER"

        # Connect to WebSocket manager
        await manager.connect(websocket, link_id, user_id, db)

        try:
            # Send initial sync message with online users
            online_users = list(manager.get_online_users(link_id))
            await manager.send_personal_message(websocket, {
                "type": "connected",
                "data": {
                    "message": "Connected to chat",
                    "link_id": str(link_id),
                    "online_users": online_users
                }
            })

            # Message handling loop
            while True:
                # Receive message from client
                data = await websocket.receive_text()
                message = json.loads(data)

                message_type = message.get("type")
                message_data = message.get("data", {})

                if message_type == "ping":
                    # Respond to heartbeat
                    await manager.send_personal_message(websocket, {
                        "type": "pong",
                        "data": {"timestamp": datetime.utcnow().isoformat()}
                    })

                elif message_type == "send_message":
                    # Send a new message
                    message_text = message_data.get("message_text")
                    message_type_value = message_data.get("message_type", "TEXT")
                    product_id = message_data.get("product_id")

                    if not message_text:
                        await manager.send_personal_message(websocket, {
                            "type": "error",
                            "data": {"message": "message_text is required"}
                        })
                        continue

                    # Get or create thread
                    thread = get_or_create_thread(db, link_id)

                    # Create message
                    from uuid import uuid4
                    new_message = ChatMessage(
                        id=uuid4(),
                        thread_id=thread.id,
                        sender_id=user_id,  # Use user_id (current_user.id) not consumer/supplier id
                        sender_type=sender_type,
                        message_text=message_text,
                        message_type=message_type_value,
                        product_id=UUID(product_id) if product_id else None,
                        sent_at=datetime.utcnow(),
                        read_at=None
                    )

                    db.add(new_message)
                    thread.last_message_at = datetime.utcnow()
                    db.commit()
                    db.refresh(new_message)

                    # Broadcast to all users in the link
                    await manager.broadcast_to_link(
                        link_id,
                        {
                            "type": "new_message",
                            "data": {
                                "id": str(new_message.id),
                                "thread_id": str(new_message.thread_id),
                                "sender_id": str(new_message.sender_id),
                                "sender_type": new_message.sender_type,
                                "message_text": new_message.message_text,
                                "message_type": new_message.message_type,
                                "product_id": str(new_message.product_id) if new_message.product_id else None,
                                "sent_at": new_message.sent_at.isoformat(),
                                "read_at": None,
                                "attachments": []
                            }
                        }
                    )

                elif message_type == "mark_read":
                    # Mark messages as read
                    message_ids = message_data.get("message_ids", [])
                    if message_ids:
                        read_at = datetime.utcnow()
                        updated_count = db.query(ChatMessage).filter(
                            ChatMessage.id.in_([UUID(mid) for mid in message_ids]),
                            ChatMessage.read_at.is_(None)
                        ).update({"read_at": read_at}, synchronize_session=False)

                        db.commit()

                        if updated_count > 0:
                            # Broadcast read receipt to sender
                            await manager.broadcast_to_link(
                                link_id,
                                {
                                    "type": "messages_read",
                                    "data": {
                                        "message_ids": message_ids,
                                        "read_by": str(user_id),
                                        "read_at": read_at.isoformat()
                                    }
                                }
                            )

                elif message_type == "typing_start":
                    # Broadcast typing indicator
                    await manager.broadcast_to_link(
                        link_id,
                        {
                            "type": "typing",
                            "data": {
                                "user_id": str(user_id),
                                "is_typing": True
                            }
                        },
                        exclude_user=user_id
                    )

                elif message_type == "typing_stop":
                    # Broadcast typing stopped
                    await manager.broadcast_to_link(
                        link_id,
                        {
                            "type": "typing",
                            "data": {
                                "user_id": str(user_id),
                                "is_typing": False
                            }
                        },
                        exclude_user=user_id
                    )

                else:
                    await manager.send_personal_message(websocket, {
                        "type": "error",
                        "data": {"message": f"Unknown message type: {message_type}"}
                    })

        except WebSocketDisconnect:
            logger.info(f"WebSocket disconnected for user {user_id}")
        except Exception as e:
            logger.error(f"Error in WebSocket handler: {e}")
            await manager.send_personal_message(websocket, {
                "type": "error",
                "data": {"message": f"Internal error: {str(e)}"}
            })
        finally:
            # Disconnect and clean up
            if user_id and db:
                await manager.disconnect(websocket, link_id, user_id, db)

    except Exception as e:
        logger.error(f"Fatal error in WebSocket endpoint: {e}")
    finally:
        if db:
            db.close()
