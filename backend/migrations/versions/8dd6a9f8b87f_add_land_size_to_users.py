"""add_land_size_to_users

Revision ID: 8dd6a9f8b87f
Revises: 3346388f13fe
Create Date: 2026-02-24 02:14:13.960562

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "8dd6a9f8b87f"
down_revision: Union[str, None] = "3346388f13fe"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add land_size column to users table
    op.add_column("users", sa.Column("land_size", sa.DECIMAL(10, 2), nullable=True))


def downgrade() -> None:
    # Remove land_size column from users table
    op.drop_column("users", "land_size")
