"""users: add login_link_token and login_link_expires_at for one-time sign-in links

Revision ID: d3e4f5a6b7c8
Revises: c2d3e4f5a6b7
Create Date: 2026-09-05 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d3e4f5a6b7c8"
down_revision: Union[str, Sequence[str], None] = "c2d3e4f5a6b7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("login_link_token", sa.String(), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column(
            "login_link_expires_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )
    op.create_index(
        op.f("ix_users_login_link_token"),
        "users",
        ["login_link_token"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_users_login_link_token"), table_name="users")
    op.drop_column("users", "login_link_expires_at")
    op.drop_column("users", "login_link_token")
