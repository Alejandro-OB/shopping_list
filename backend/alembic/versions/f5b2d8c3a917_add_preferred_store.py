"""add preferred store flag and uniqueness to product_stores

Revision ID: f5b2d8c3a917
Revises: e3a7c1d9f042
Create Date: 2026-09-24 13:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f5b2d8c3a917"
down_revision: Union[str, Sequence[str], None] = "e3a7c1d9f042"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "product_stores",
        sa.Column("is_preferred", sa.Boolean(), server_default="false", nullable=False),
    )
    # Índices parciales: los vínculos borrados son soft delete y quedan en la
    # tabla, así que una unicidad clásica impediría volver a vincular una tienda
    # que se quitó antes.
    op.execute(
        "CREATE UNIQUE INDEX uq_product_store_active "
        "ON product_stores (product_id, store_id) "
        "WHERE is_deleted = false"
    )
    op.execute(
        "CREATE UNIQUE INDEX uq_product_store_preferred "
        "ON product_stores (product_id) "
        "WHERE is_preferred = true AND is_deleted = false"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_product_store_preferred")
    op.execute("DROP INDEX IF EXISTS uq_product_store_active")
    op.drop_column("product_stores", "is_preferred")
