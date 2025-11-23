"""WebSocket connection manager for real-time chat functionality."""

import json
import logging
from datetime import datetime
from typing import Dict, Set
from uuid import UUID

from fastapi import WebSocket
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections and message broadcasting for chat."""

    def __init__(self):
        """Initialize the connection manager."""
        # link_id -> set of (user_id, websocket) tuples
        self.active_connections: Dict[str, Set[tuple[str, WebSocket]]] = {}
        # Track last activity for heartbeat monitoring
        self.last_activity: Dict[WebSocket, datetime] = {}

    async def connect(
        self,
        websocket: WebSocket,
        link_id: UUID,
        user_id: UUID,
        db: Session
    ):
        """
        Accept and register a new WebSocket connection.

        Args:
            websocket: The WebSocket connection
            link_id: The consumer-supplier link ID
            user_id: The user ID
            db: Database session for presence updates
        """
        await websocket.accept()

        link_key = str(link_id)
        user_key = str(user_id)

        if link_key not in self.active_connections:
            self.active_connections[link_key] = set()

        self.active_connections[link_key].add((user_key, websocket))
        self.last_activity[websocket] = datetime.utcnow()

        logger.info(f"User {user_id} connected to link {link_id}")

        # Update user presence in database
        self._update_presence(db, user_id, link_id, is_online=True)

        # Notify other users in the link that this user is now online
        await self.broadcast_to_link(
            link_id,
            {
                "type": "user_online",
                "data": {
                    "user_id": str(user_id),
                    "timestamp": datetime.utcnow().isoformat()
                }
            },
            exclude_user=user_id
        )

    async def disconnect(
        self,
        websocket: WebSocket,
        link_id: UUID,
        user_id: UUID,
        db: Session
    ):
        """
        Unregister a WebSocket connection.

        Args:
            websocket: The WebSocket connection
            link_id: The consumer-supplier link ID
            user_id: The user ID
            db: Database session for presence updates
        """
        link_key = str(link_id)
        user_key = str(user_id)

        if link_key in self.active_connections:
            self.active_connections[link_key].discard((user_key, websocket))

            # Clean up empty link entries
            if not self.active_connections[link_key]:
                del self.active_connections[link_key]

        # Clean up activity tracking
        self.last_activity.pop(websocket, None)

        logger.info(f"User {user_id} disconnected from link {link_id}")

        # Update user presence in database
        self._update_presence(db, user_id, link_id, is_online=False)

        # Notify other users that this user is now offline
        await self.broadcast_to_link(
            link_id,
            {
                "type": "user_offline",
                "data": {
                    "user_id": str(user_id),
                    "last_seen": datetime.utcnow().isoformat()
                }
            },
            exclude_user=user_id
        )

    async def broadcast_to_link(
        self,
        link_id: UUID,
        message: dict,
        exclude_user: UUID = None
    ):
        """
        Broadcast a message to all connected users in a link.

        Args:
            link_id: The consumer-supplier link ID
            message: The message dictionary to broadcast
            exclude_user: Optional user ID to exclude from broadcast
        """
        link_key = str(link_id)
        exclude_key = str(exclude_user) if exclude_user else None

        if link_key not in self.active_connections:
            return

        message_json = json.dumps(message)
        disconnected = []

        for user_id, websocket in self.active_connections[link_key]:
            # Skip excluded user
            if exclude_key and user_id == exclude_key:
                continue

            try:
                await websocket.send_text(message_json)
                self.last_activity[websocket] = datetime.utcnow()
            except Exception as e:
                logger.error(f"Error broadcasting to user {user_id}: {e}")
                disconnected.append((user_id, websocket))

        # Clean up disconnected connections
        for user_id, websocket in disconnected:
            self.active_connections[link_key].discard((user_id, websocket))
            self.last_activity.pop(websocket, None)

    async def send_personal_message(
        self,
        websocket: WebSocket,
        message: dict
    ):
        """
        Send a message to a specific WebSocket connection.

        Args:
            websocket: The WebSocket connection
            message: The message dictionary to send
        """
        try:
            await websocket.send_text(json.dumps(message))
            self.last_activity[websocket] = datetime.utcnow()
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")

    def is_user_online(self, link_id: UUID, user_id: UUID) -> bool:
        """
        Check if a user is currently connected to a link.

        Args:
            link_id: The consumer-supplier link ID
            user_id: The user ID

        Returns:
            True if user is connected, False otherwise
        """
        link_key = str(link_id)
        user_key = str(user_id)

        if link_key not in self.active_connections:
            return False

        return any(uid == user_key for uid, _ in self.active_connections[link_key])

    def get_online_users(self, link_id: UUID) -> Set[str]:
        """
        Get all online users for a link.

        Args:
            link_id: The consumer-supplier link ID

        Returns:
            Set of user IDs currently connected
        """
        link_key = str(link_id)

        if link_key not in self.active_connections:
            return set()

        return {user_id for user_id, _ in self.active_connections[link_key]}

    def _update_presence(
        self,
        db: Session,
        user_id: UUID,
        link_id: UUID,
        is_online: bool
    ):
        """
        Update user presence in the database.

        Args:
            db: Database session
            user_id: The user ID
            link_id: The consumer-supplier link ID
            is_online: Whether the user is online
        """
        from app.models.user import UserPresence
        from uuid import uuid4

        # Check if presence record exists
        presence = db.query(UserPresence).filter(
            UserPresence.user_id == user_id,
            UserPresence.link_id == link_id
        ).first()

        now = datetime.utcnow()

        if presence:
            # Update existing record
            presence.is_online = is_online
            presence.last_seen = now
            if is_online:
                presence.connected_at = now
            else:
                presence.connected_at = None
        else:
            # Create new record
            presence = UserPresence(
                id=uuid4(),
                user_id=user_id,
                link_id=link_id,
                is_online=is_online,
                last_seen=now,
                connected_at=now if is_online else None
            )
            db.add(presence)

        db.commit()


# Global connection manager instance
manager = ConnectionManager()
