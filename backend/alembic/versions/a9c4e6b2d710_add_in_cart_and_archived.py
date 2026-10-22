"""add in_cart to list items and archived_at to lists

Revision ID: a9c4e6b2d710
Revises: f5b2d8c3a917
Create Date: 2026-10-22 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a9c4e6b2d710"
down_revision: Union[str, Sequence[str], None] = "f5b2d8c3a917"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "shopping_list_items",
        sa.Column("in_cart", sa.Boolean(), server_default="false", nullable=False),
    )
    # Nulo es "no archivada", que es lo que son todas las listas que ya existen.
    op.add_column(
        "shopping_lists",
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("shopping_lists", "archived_at")
    op.drop_column("shopping_list_items", "in_cart")
