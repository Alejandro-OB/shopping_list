"""add free items to shopping_list_items

Revision ID: c7f1a2b8e9d3
Revises: bd2e90b329a7
Create Date: 2026-06-08 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c7f1a2b8e9d3"
down_revision: Union[str, Sequence[str], None] = "bd2e90b329a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Hacer columnas nullable
    op.alter_column(
        "shopping_list_items", "product_store_id",
        existing_type=sa.BigInteger(),
        nullable=True,
    )
    op.alter_column(
        "shopping_list_items", "price_catalog_snapshot",
        existing_type=sa.Numeric(precision=10, scale=2),
        nullable=True,
    )

    # 2. Agregar columna free_name
    op.add_column(
        "shopping_list_items",
        sa.Column("free_name", sa.String(length=255), nullable=True),
    )

    # 3. Reemplazar el UniqueConstraint clásico por un índice parcial (solo aplica cuando product_store_id IS NOT NULL)
    op.drop_constraint(
        "uq_list_product_store",
        "shopping_list_items",
        type_="unique",
    )
    op.execute(
        "CREATE UNIQUE INDEX uq_list_product_store_partial "
        "ON shopping_list_items (list_id, product_store_id) "
        "WHERE product_store_id IS NOT NULL"
    )

    # 4. CHECK: exactamente uno de product_store_id o free_name
    op.create_check_constraint(
        "ck_item_linked_xor_free",
        "shopping_list_items",
        "(product_store_id IS NOT NULL AND free_name IS NULL) OR "
        "(product_store_id IS NULL AND free_name IS NOT NULL)",
    )


def downgrade() -> None:
    # 1. Quitar CHECK
    op.drop_constraint(
        "ck_item_linked_xor_free",
        "shopping_list_items",
        type_="check",
    )

    # 2. Quitar índice parcial y restaurar UniqueConstraint clásico
    op.execute("DROP INDEX IF EXISTS uq_list_product_store_partial")
    op.create_unique_constraint(
        "uq_list_product_store",
        "shopping_list_items",
        ["list_id", "product_store_id"],
    )

    # 3. Quitar columna free_name
    op.drop_column("shopping_list_items", "free_name")

    # 4. Restaurar NOT NULL en columnas
    op.alter_column(
        "shopping_list_items", "price_catalog_snapshot",
        existing_type=sa.Numeric(precision=10, scale=2),
        nullable=False,
    )
    op.alter_column(
        "shopping_list_items", "product_store_id",
        existing_type=sa.BigInteger(),
        nullable=False,
    )
