"""Reconcile users.cooperative_id with the User model

The cooperative migration (ec0542bcdc1a) creates the `cooperatives` and
`bulk_orders` tables and then adds `users.cooperative_id` through a
`batch_alter_table` block. On SQLite that block rebuilds the whole `users`
table, so it can be skipped or partially applied when the database is created
in more than one pass, leaving the schema stamped at head but missing the
column. The ORM then fails every User query with:

    sqlite3.OperationalError: no such column: users.cooperative_id

This revision is intentionally idempotent: it adds the column and the foreign
key only when they are actually absent, so it is a no-op on a healthy
database and a repair on a drifted one.

Revision ID: f1a2b3c4d5e6
Revises: ec0542bcdc1a
Create Date: 2026-09-22 00:35:00.000

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "f1a2b3c4d5e6"
down_revision = "ec0542bcdc1a"
branch_labels = None
depends_on = None


def _has_column(table_name, column_name):
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if table_name not in inspector.get_table_names():
        return False
    return column_name in {col["name"] for col in inspector.get_columns(table_name)}


def _has_foreign_key(table_name, fk_name):
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if table_name not in inspector.get_table_names():
        return False
    return fk_name in {fk.get("name") for fk in inspector.get_foreign_keys(table_name)}


def upgrade():
    if not _has_column("users", "cooperative_id"):
        with op.batch_alter_table("users", schema=None) as batch_op:
            batch_op.add_column(
                sa.Column("cooperative_id", sa.Integer(), nullable=True)
            )

    # SQLite only records a named FK when the table is rebuilt; skip when the
    # constraint is already present so re-running stays safe.
    if not _has_foreign_key("users", "fk_users_cooperative_id"):
        try:
            with op.batch_alter_table("users", schema=None) as batch_op:
                batch_op.create_foreign_key(
                    "fk_users_cooperative_id",
                    "cooperatives",
                    ["cooperative_id"],
                    ["id"],
                )
        except (sa.exc.OperationalError, sa.exc.IntegrityError):
            # An existing FK with an unnamed/auto-generated name is fine.
            pass


def downgrade():
    if _has_foreign_key("users", "fk_users_cooperative_id"):
        with op.batch_alter_table("users", schema=None) as batch_op:
            batch_op.drop_constraint("fk_users_cooperative_id", type_="foreignkey")
    if _has_column("users", "cooperative_id"):
        with op.batch_alter_table("users", schema=None) as batch_op:
            batch_op.drop_column("cooperative_id")
