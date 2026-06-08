"""add category to products

Revision ID: d8e2f7a4b1c5
Revises: c7f1a2b8e9d3
Create Date: 2026-06-08 14:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d8e2f7a4b1c5"
down_revision: Union[str, Sequence[str], None] = "c7f1a2b8e9d3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "products",
        sa.Column("category", sa.String(length=50), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("products", "category")
