"""add inventory fields to products

Revision ID: e3a7c1d9f042
Revises: d8e2f7a4b1c5
Create Date: 2026-09-24 13:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e3a7c1d9f042"
down_revision: Union[str, Sequence[str], None] = "d8e2f7a4b1c5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # stock queda nullable y sin server_default a propósito: los productos que
    # ya existen tienen que quedar en NULL, o sea "sin inventario", para seguir
    # generándose por calendario. Con 0 quedarían todos bajo mínimo y entrarían
    # de golpe en la siguiente lista.
    op.add_column(
        "products",
        sa.Column("stock", sa.Numeric(10, 2), nullable=True),
    )
    op.add_column(
        "products",
        sa.Column("stock_min", sa.Numeric(10, 2), server_default="0", nullable=False),
    )
    op.add_column(
        "products",
        sa.Column("units_per_purchase", sa.Numeric(10, 2), server_default="1", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("products", "units_per_purchase")
    op.drop_column("products", "stock_min")
    op.drop_column("products", "stock")
