"""add visitor event logging

Revision ID: 0006_visit_events
Revises: 0005_preproduction_hardening
"""

from alembic import op
import sqlalchemy as sa

revision = "0006_visit_events"
down_revision = "0005_preproduction_hardening"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "visit_events",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("visitor_id", sa.String(length=64), nullable=False),
        sa.Column("path", sa.String(length=300), nullable=False),
        sa.Column("referrer_host", sa.String(length=255), nullable=True),
        sa.Column("user_agent", sa.String(length=300), nullable=True),
        sa.Column("language", sa.String(length=32), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_visit_events_visitor_id"), "visit_events", ["visitor_id"], unique=False)
    op.create_index(op.f("ix_visit_events_path"), "visit_events", ["path"], unique=False)
    op.create_index(op.f("ix_visit_events_created_at"), "visit_events", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_visit_events_created_at"), table_name="visit_events")
    op.drop_index(op.f("ix_visit_events_path"), table_name="visit_events")
    op.drop_index(op.f("ix_visit_events_visitor_id"), table_name="visit_events")
    op.drop_table("visit_events")
