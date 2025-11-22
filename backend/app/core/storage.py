import os
import uuid
from pathlib import Path
from typing import BinaryIO
from fastapi import UploadFile, HTTPException, status

# File upload configuration
UPLOAD_DIR = Path("uploads")
CHAT_UPLOADS_DIR = UPLOAD_DIR / "chat"
AUDIO_UPLOADS_DIR = UPLOAD_DIR / "audio"

# Create upload directories if they don't exist
CHAT_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
AUDIO_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# File size limits (in bytes)
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
MAX_AUDIO_SIZE = 5 * 1024 * 1024   # 5 MB

# Allowed file types
ALLOWED_FILE_TYPES = {
    "image": ["image/jpeg", "image/png", "image/gif", "image/webp"],
    "document": [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain",
        "text/csv"
    ],
    "audio": [
        "audio/mpeg",
        "audio/mp4",
        "audio/wav",
        "audio/webm",
        "audio/ogg",
        "audio/aac",
        "audio/m4a"
    ]
}

ALLOWED_EXTENSIONS = {
    "image": [".jpg", ".jpeg", ".png", ".gif", ".webp"],
    "document": [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt", ".csv"],
    "audio": [".mp3", ".mp4", ".wav", ".webm", ".ogg", ".aac", ".m4a"]
}


def get_file_category(content_type: str, filename: str) -> str:
    """Determine file category based on content type and extension"""
    extension = Path(filename).suffix.lower()

    if content_type in ALLOWED_FILE_TYPES["audio"] or extension in ALLOWED_EXTENSIONS["audio"]:
        return "audio"
    elif content_type in ALLOWED_FILE_TYPES["image"] or extension in ALLOWED_EXTENSIONS["image"]:
        return "image"
    elif content_type in ALLOWED_FILE_TYPES["document"] or extension in ALLOWED_EXTENSIONS["document"]:
        return "document"
    else:
        return "other"


def validate_file(file: UploadFile, max_size: int = MAX_FILE_SIZE) -> tuple[str, str]:
    """
    Validate uploaded file.
    Returns tuple of (file_category, error_message)
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is required"
        )

    # Check file extension
    extension = Path(file.filename).suffix.lower()
    if not extension:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must have an extension"
        )

    # Determine file category
    category = get_file_category(file.content_type or "", file.filename)

    # Validate file type
    all_allowed_types = (
        ALLOWED_FILE_TYPES["image"] +
        ALLOWED_FILE_TYPES["document"] +
        ALLOWED_FILE_TYPES["audio"]
    )
    all_allowed_extensions = (
        ALLOWED_EXTENSIONS["image"] +
        ALLOWED_EXTENSIONS["document"] +
        ALLOWED_EXTENSIONS["audio"]
    )

    if file.content_type not in all_allowed_types and extension not in all_allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed types: images, documents, audio"
        )

    return category, extension


async def save_upload_file(
    upload_file: UploadFile,
    destination_dir: Path,
    max_size: int = MAX_FILE_SIZE
) -> tuple[str, str, str, int]:
    """
    Save uploaded file to disk.
    Returns tuple of (file_path, filename, file_type, file_size)
    """
    # Validate file
    category, extension = validate_file(upload_file, max_size)

    # Generate unique filename
    unique_filename = f"{uuid.uuid4()}{extension}"
    file_path = destination_dir / unique_filename

    # Read and save file
    file_size = 0
    try:
        contents = await upload_file.read()
        file_size = len(contents)

        # Check file size
        if file_size > max_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File too large. Maximum size is {max_size / (1024 * 1024):.1f} MB"
            )

        # Write file
        with open(file_path, "wb") as f:
            f.write(contents)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}"
        )
    finally:
        await upload_file.close()

    # Return relative path for storage in database
    relative_path = str(file_path.relative_to(UPLOAD_DIR))

    return relative_path, upload_file.filename, category, file_size


async def save_chat_file(upload_file: UploadFile) -> tuple[str, str, str, int]:
    """Save chat attachment file"""
    return await save_upload_file(upload_file, CHAT_UPLOADS_DIR, MAX_FILE_SIZE)


async def save_audio_file(upload_file: UploadFile) -> tuple[str, str, str, int]:
    """Save audio message file"""
    return await save_upload_file(upload_file, AUDIO_UPLOADS_DIR, MAX_AUDIO_SIZE)


def get_file_url(relative_path: str, base_url: str = "/uploads") -> str:
    """Generate URL for accessing uploaded file"""
    return f"{base_url}/{relative_path}"


def delete_file(relative_path: str) -> bool:
    """Delete uploaded file from disk"""
    try:
        file_path = UPLOAD_DIR / relative_path
        if file_path.exists():
            file_path.unlink()
            return True
        return False
    except Exception:
        return False
