"""add content workflow and role-based authoring

Revision ID: 0004_content_workflow
Revises: 0003_account_security
Create Date: 2026-08-26
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0004_content_workflow"
down_revision: str | None = "0003_account_security"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("role", sa.String(length=24), server_default="learner", nullable=False))
    op.create_index("ix_users_role", "users", ["role"], unique=False)

    op.create_table(
        "scenario_content",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("scenario_id", sa.String(length=120), nullable=False),
        sa.Column("title", sa.String(length=240), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("latest_revision", sa.Integer(), nullable=False),
        sa.Column("published_revision", sa.Integer(), nullable=True),
        sa.Column("created_by_user_id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_scenario_content_scenario_id", "scenario_content", ["scenario_id"], unique=True)
    op.create_index("ix_scenario_content_status", "scenario_content", ["status"], unique=False)
    op.create_index("ix_scenario_content_created_by_user_id", "scenario_content", ["created_by_user_id"], unique=False)

    op.create_table(
        "scenario_revisions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("content_id", sa.String(length=36), nullable=False),
        sa.Column("revision_number", sa.Integer(), nullable=False),
        sa.Column("state", sa.String(length=32), nullable=False),
        sa.Column("document", sa.JSON(), nullable=False),
        sa.Column("created_by_user_id", sa.String(length=36), nullable=False),
        sa.Column("review_note", sa.String(length=2000), nullable=True),
        sa.Column("reviewed_by_user_id", sa.String(length=36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["content_id"], ["scenario_content.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["reviewed_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("content_id", "revision_number", name="uq_content_revision"),
    )
    op.create_index("ix_scenario_revisions_content_id", "scenario_revisions", ["content_id"], unique=False)
    op.create_index("ix_scenario_revisions_state", "scenario_revisions", ["state"], unique=False)
    op.create_index("ix_scenario_revisions_created_by_user_id", "scenario_revisions", ["created_by_user_id"], unique=False)
    op.create_index("ix_scenario_revisions_reviewed_by_user_id", "scenario_revisions", ["reviewed_by_user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_scenario_revisions_reviewed_by_user_id", table_name="scenario_revisions")
    op.drop_index("ix_scenario_revisions_created_by_user_id", table_name="scenario_revisions")
    op.drop_index("ix_scenario_revisions_state", table_name="scenario_revisions")
    op.drop_index("ix_scenario_revisions_content_id", table_name="scenario_revisions")
    op.drop_table("scenario_revisions")
    op.drop_index("ix_scenario_content_created_by_user_id", table_name="scenario_content")
    op.drop_index("ix_scenario_content_status", table_name="scenario_content")
    op.drop_index("ix_scenario_content_scenario_id", table_name="scenario_content")
    op.drop_table("scenario_content")
    op.drop_index("ix_users_role", table_name="users")
    op.drop_column("users", "role")
