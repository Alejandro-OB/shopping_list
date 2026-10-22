"""add shared household to users and budget to lists

Revision ID: b3d8f1e5c294
Revises: a9c4e6b2d710
Create Date: 2026-10-22 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b3d8f1e5c294"
down_revision: Union[str, Sequence[str], None] = "a9c4e6b2d710"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("household_owner_id", sa.BigInteger(), nullable=True))
    op.create_foreign_key(
        "fk_users_household_owner", "users", "users",
        ["household_owner_id"], ["id"], ondelete="SET NULL",
    )
    op.create_index("ix_users_household_owner_id", "users", ["household_owner_id"])
    op.add_column("users", sa.Column("household_invite_code", sa.String(16), nullable=True))
    op.create_unique_constraint("uq_users_household_invite_code", "users", ["household_invite_code"])
    op.add_column("users", sa.Column("household_invite_expires_at", sa.DateTime(timezone=True), nullable=True))

    op.add_column("shopping_lists", sa.Column("budget", sa.Numeric(12, 2), nullable=True))


def downgrade() -> None:
    op.drop_column("shopping_lists", "budget")
    op.drop_column("users", "household_invite_expires_at")
    op.drop_constraint("uq_users_household_invite_code", "users", type_="unique")
    op.drop_column("users", "household_invite_code")
    op.drop_index("ix_users_household_owner_id", table_name="users")
    op.drop_constraint("fk_users_household_owner", "users", type_="foreignkey")
    op.drop_column("users", "household_owner_id")
