from datetime import datetime, timezone
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import BigInteger, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.db.base import Base

if TYPE_CHECKING:
    from app.models.product import Product
    from app.models.store import Store
    from app.models.shopping_list import ShoppingList

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_verified: Mapped[bool] = mapped_column(default=False, nullable=False)
    is_admin: Mapped[bool] = mapped_column(default=False, nullable=False)
    can_autogenerate_lists: Mapped[bool] = mapped_column(default=True, nullable=False)

    # Hogar compartido. Quien se une al hogar de otro trabaja sobre los datos
    # de esa persona —catálogo, tiendas, listas, métricas— en vez de los
    # suyos, que quedan guardados tal cual por si sale. Nulo es "mi propio
    # hogar". Solo hay un nivel: el dueño de un hogar no puede ser a su vez
    # miembro de otro.
    household_owner_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    # Código para que alguien se una a este hogar. Uno vigente a la vez:
    # generar otro invalida el anterior.
    household_invite_code: Mapped[Optional[str]] = mapped_column(String(16), unique=True, nullable=True)
    household_invite_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    @property
    def owner_id(self) -> int:
        """
        Dueño de los datos con los que trabaja este usuario: el del hogar al
        que se unió o él mismo. Es lo que usan las rutas de datos en lugar de
        `id`, que sigue siendo la identidad para la sesión y el perfil.
        """
        return self.household_owner_id or self.id

    # Relaciones
    household_owner: Mapped[Optional["User"]] = relationship(
        "User", remote_side="User.id", back_populates="household_members"
    )
    household_members: Mapped[List["User"]] = relationship(
        "User", back_populates="household_owner"
    )
    products: Mapped[List["Product"]] = relationship(
        "Product",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    stores: Mapped[List["Store"]] = relationship(
        "Store",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    shopping_lists: Mapped[List["ShoppingList"]] = relationship(
        "ShoppingList",
        back_populates="user",
        cascade="all, delete-orphan"
    )