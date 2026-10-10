from __future__ import annotations

from scripts import migrate


class FakeResult:
    def __init__(self, revisions: list[str]) -> None:
        self.revisions = revisions

    def fetchall(self) -> list[tuple[str]]:
        return [(revision,) for revision in self.revisions]


class FakeConnection:
    class dialect:
        name = 'postgresql'

    def __init__(self) -> None:
        self.revisions = ['0009_media_status_default']
        self.statements: list[str] = []

    def __enter__(self) -> FakeConnection:
        return self

    def __exit__(self, *args: object) -> None:
        return None

    def execute(self, statement: object, parameters: object = None) -> FakeResult:
        self.statements.append(str(statement))
        return FakeResult(self.revisions)


class FakeEngine:
    def __init__(self, connection: FakeConnection) -> None:
        self.connection = connection
        self.disposed = False

    def connect(self) -> FakeConnection:
        return self.connection

    def dispose(self) -> None:
        self.disposed = True


def test_current_revisions_handles_unmigrated_database(monkeypatch) -> None:
    connection = FakeConnection()
    monkeypatch.setattr(migrate, 'inspect', lambda connection: type('Inspector', (), {
        'has_table': lambda self, table: False,
    })())
    assert migrate.current_revisions(connection) == ()
    assert connection.statements == []


def test_release_migration_locks_postgres_and_logs_revisions_without_url(
    monkeypatch, capsys
) -> None:
    connection = FakeConnection()
    engine = FakeEngine(connection)

    monkeypatch.setenv('DISCOVERY_DATABASE_URL', 'postgres://user:password@example.test/db')
    monkeypatch.setattr(migrate, 'create_engine', lambda *args, **kwargs: engine)
    monkeypatch.setattr(migrate, 'inspect', lambda connection: type('Inspector', (), {
        'has_table': lambda self, table: True,
    })())
    monkeypatch.setattr(migrate.os, 'chdir', lambda path: None)

    def upgrade(config, target) -> None:  # noqa: ANN001
        assert target == 'head'
        connection.revisions = ['0010_gig_posters']

    monkeypatch.setattr(migrate.command, 'upgrade', upgrade)

    assert migrate.run() == 0
    captured = capsys.readouterr()
    assert captured.out.splitlines() == [
        'migration_revision_before=0009_media_status_default',
        'migration_revision_after=0010_gig_posters',
    ]
    assert 'password' not in captured.out + captured.err
    assert any('pg_advisory_lock' in statement for statement in connection.statements)
    assert any('pg_advisory_unlock' in statement for statement in connection.statements)
    assert engine.disposed is True


def test_release_migration_requires_database_url(monkeypatch, capsys) -> None:
    monkeypatch.delenv('DISCOVERY_DATABASE_URL', raising=False)
    assert migrate.run() == 2
    assert capsys.readouterr().err == 'migration_failed code=database_not_configured\n'
