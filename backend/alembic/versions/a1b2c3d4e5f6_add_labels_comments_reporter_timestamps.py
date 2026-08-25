"""add labels comments task reporter and timestamps

Revision ID: a1b2c3d4e5f6
Revises: 735d4d0e2865
Create Date: 2026-08-20 01:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "735d4d0e2865"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "projects",
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.execute("UPDATE projects SET updated_at = created_at WHERE updated_at IS NULL")

    op.add_column(
        "project_members",
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.execute(
        "UPDATE project_members SET created_at = NOW() WHERE created_at IS NULL"
    )

    op.alter_column(
        "tasks",
        "description",
        existing_type=sa.String(length=255),
        type_=sa.Text(),
        existing_nullable=True,
    )

    op.add_column(
        "tasks",
        sa.Column("reporter_id", sa.Integer(), nullable=True),
    )
    op.execute(
        """
        UPDATE tasks
        SET reporter_id = projects.owner_id
        FROM projects
        WHERE tasks.project_id = projects.id
          AND tasks.reporter_id IS NULL
        """
    )
    op.create_foreign_key(
        "fk_tasks_reporter_id_users",
        "tasks",
        "users",
        ["reporter_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.alter_column("tasks", "reporter_id", nullable=False)

    op.add_column(
        "tasks",
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.execute("UPDATE tasks SET updated_at = created_at WHERE updated_at IS NULL")

    op.create_table(
        "labels",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=50), nullable=False),
        sa.Column("color", sa.String(length=7), server_default="#6B7280", nullable=False),
        sa.Column("created_by", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("project_id", "name"),
    )
    op.create_index(op.f("ix_labels_project_id"), "labels", ["project_id"], unique=False)

    op.create_table(
        "task_labels",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("task_id", sa.Integer(), nullable=False),
        sa.Column("label_id", sa.Integer(), nullable=False),
        sa.Column("tagged_by", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["label_id"], ["labels.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tagged_by"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("task_id", "label_id"),
    )
    op.create_index(op.f("ix_task_labels_task_id"), "task_labels", ["task_id"], unique=False)
    op.create_index(op.f("ix_task_labels_label_id"), "task_labels", ["label_id"], unique=False)

    op.create_table(
        "comments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("task_id", sa.Integer(), nullable=False),
        sa.Column("author_id", sa.Integer(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_comments_task_id"), "comments", ["task_id"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_comments_task_id"), table_name="comments")
    op.drop_table("comments")

    op.drop_index(op.f("ix_task_labels_label_id"), table_name="task_labels")
    op.drop_index(op.f("ix_task_labels_task_id"), table_name="task_labels")
    op.drop_table("task_labels")

    op.drop_index(op.f("ix_labels_project_id"), table_name="labels")
    op.drop_table("labels")

    op.drop_column("tasks", "updated_at")
    op.drop_constraint("fk_tasks_reporter_id_users", "tasks", type_="foreignkey")
    op.drop_column("tasks", "reporter_id")

    op.alter_column(
        "tasks",
        "description",
        existing_type=sa.Text(),
        type_=sa.String(length=255),
        existing_nullable=True,
    )

    op.drop_column("project_members", "created_at")
    op.drop_column("projects", "updated_at")
