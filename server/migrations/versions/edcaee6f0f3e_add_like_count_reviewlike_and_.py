"""Add like_count, ReviewLike, and ReviewComment models

Revision ID: edcaee6f0f3e
Revises: a1b2c3d4e5f6
Create Date: 2026-09-19 15:02:11.350534

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'edcaee6f0f3e'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('review_comments',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('review_id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('text', sa.Text(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['review_id'], ['reviews.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('review_likes',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('review_id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['review_id'], ['reviews.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('review_id', 'user_id', name='uq_review_like')
    )
    with op.batch_alter_table('reviews', schema=None) as batch_op:
        batch_op.add_column(sa.Column('like_count', sa.Integer(), nullable=False, server_default='0'))


def downgrade():
    with op.batch_alter_table('reviews', schema=None) as batch_op:
        batch_op.drop_column('like_count')

    op.drop_table('review_likes')
    op.drop_table('review_comments')
