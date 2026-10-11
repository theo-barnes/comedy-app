"""Execute the migration's backfill and CHECK expressions without external services."""

import importlib.util
from pathlib import Path
import sqlite3

import pytest

from events.models.orm import EventRow


class MigrationOperations:
    def __init__(self):
        self.columns = []
        self.statements = []
        self.checks = {}

    def add_column(self, table, column):
        self.columns.append((table, column))

    def execute(self, statement):
        self.statements.append(statement)

    def create_check_constraint(self, name, table, expression):
        assert table == 'events'
        self.checks[name] = expression


def migration(monkeypatch):
    path = Path(__file__).parents[1] / 'alembic/versions/0011_required_gig_images.py'
    spec = importlib.util.spec_from_file_location('required_image_migration', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    operations = MigrationOperations()
    monkeypatch.setattr(module, 'op', operations)
    module.upgrade()
    assert module.down_revision == '0010_gig_posters'
    column = operations.columns[0][1]
    assert column.name == 'publication_status' and column.nullable is False
    assert column.server_default.arg == 'draft'
    orm_checks = {
        constraint.name: str(constraint.sqltext)
        for constraint in EventRow.__table__.constraints if hasattr(constraint, 'sqltext')
    }
    for name, expression in operations.checks.items():
        assert expression == orm_checks[name]
    return operations


def connection():
    database = sqlite3.connect(':memory:')
    database.create_function('btrim', 1, lambda value: value.strip() if value else value)
    database.executescript("""
        CREATE TABLE events (
            id TEXT PRIMARY KEY, venue_id TEXT, title TEXT, status TEXT,
            poster_asset_id TEXT, poster_url TEXT, poster_width INTEGER, poster_height INTEGER,
            publication_status TEXT NOT NULL DEFAULT 'draft'
        );
        CREATE TABLE image_assets (
            id TEXT PRIMARY KEY, owner_id TEXT, event_id TEXT, purpose TEXT, status TEXT,
            output_type TEXT, display_key TEXT, width INTEGER, height INTEGER
        );
    """)
    return database


@pytest.mark.parametrize('invalid', [
    {}, {'missing': True}, {'event_id': 'wrong'}, {'owner_id': 'wrong'}, {'status': 'ready'},
    {'status': 'retired'}, {'purpose': 'avatar'}, {'output_type': None}, {'display_key': '  '},
    {'width': 0}, {'width': None}, {'height': -1}, {'width': 25},
    {'url': None}, {'url': '   '}, {'event_width': None}, {'event_height': 0},
])
def test_backfill_preserves_data_only_valid_bound_attached_managed_image_is_public(monkeypatch, invalid):
    operations = migration(monkeypatch)
    with connection() as database:
        event_values = (
            'gig', 'owner', 'Preserved Comedy', 'cancelled', 'asset',
            invalid.get('url', 'https://public/poster'),
            invalid.get('event_width', 24), invalid.get('event_height', 32), 'draft',
        )
        database.execute('INSERT INTO events VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', event_values)
        if not invalid.get('missing'):
            asset = {
                'id': 'asset', 'owner_id': 'owner', 'event_id': 'gig', 'purpose': 'gig-poster',
                'status': 'attached', 'output_type': 'image/png', 'display_key': 'posters/key',
                'width': 24, 'height': 32,
            }
            asset.update({key: value for key, value in invalid.items() if key in asset})
            database.execute('INSERT INTO image_assets VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                             tuple(asset.values()))
        for statement in operations.statements:
            database.execute(statement)
        row = database.execute('SELECT * FROM events').fetchone()
        assert row[:-1] == event_values[:-1]
        assert row[-1] == ('draft' if invalid else 'published')


@pytest.mark.parametrize('changes', [
    {'poster_asset_id': None}, {'poster_url': None}, {'poster_url': ''}, {'poster_url': '  '},
    {'poster_width': None}, {'poster_width': 0}, {'poster_height': None}, {'poster_height': -1},
    {'publication_status': 'scheduled'}, {'publication_status': None},
])
def test_migration_check_rejects_image_less_publication_and_direct_image_removal(monkeypatch, changes):
    operations = migration(monkeypatch)
    database = sqlite3.connect(':memory:')
    database.create_function('btrim', 1, lambda value: value.strip() if value else value)
    with database:
        checks = ', '.join(f'CHECK ({expression})' for expression in operations.checks.values())
        database.execute(f"""
            CREATE TABLE events (
                poster_asset_id TEXT, poster_url TEXT, poster_width INTEGER, poster_height INTEGER,
                publication_status TEXT NOT NULL DEFAULT 'draft', {checks}
            )
        """)
        database.execute("""
            INSERT INTO events VALUES ('asset', 'https://public/poster', 24, 32, 'published')
        """)
        fields = ', '.join(f'{key} = ?' for key in changes)
        with pytest.raises(sqlite3.IntegrityError):
            database.execute(f'UPDATE events SET {fields}', tuple(changes.values()))
        assert database.execute('SELECT publication_status FROM events').fetchone() == ('published',)
        database.execute("INSERT INTO events (publication_status) VALUES ('draft')")
