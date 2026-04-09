from typing import Optional, Any
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select, and_

from app.models.action_token import ActionToken, ActionTokenType
from app.repositories.base_repo import BaseRepository

class ActionTokenRepository(BaseRepository[ActionToken, Any, Any]):
    def __init__(self, db: Session):
        super().__init__(ActionToken, db)

    def get_valid_token(self, token: str, token_type: ActionTokenType) -> Optional[ActionToken]:
        """
        Busca un token que sea del tipo correcto, no haya sido usado y no esté expirado.
        """
        now = datetime.now(timezone.utc)
        return self.db.execute(
            select(self.model).filter(
                and_(
                    self.model.token == token,
                    self.model.type == token_type,
                    self.model.is_used == False,
                    self.model.expires_at > now
                )
            )
        ).scalars().first()

    def mark_as_used(self, db_obj: ActionToken) -> ActionToken:
        """
        Invalida un token después de ser utilizado.
        """
        db_obj.is_used = True
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj
