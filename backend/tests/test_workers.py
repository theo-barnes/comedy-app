"""Worker process scheduling tests."""

from __future__ import annotations

from typing import Any

from workers import main as worker_main


class RecordingScheduler:
    """Records scheduled jobs without starting a blocking scheduler."""

    instance: 'RecordingScheduler | None' = None

    def __init__(self, **_: Any) -> None:
        self.jobs: list[tuple[Any, tuple[Any, ...], dict[str, Any]]] = []
        self.started = False
        RecordingScheduler.instance = self

    def add_job(self, function: Any, *args: Any, **kwargs: Any) -> None:
        self.jobs.append((function, args, kwargs))

    def start(self) -> None:
        self.started = True


class FakeContentService:
    """Provides the worker's media reconciliation dependency."""

    def reconcile_stale_media(self) -> tuple[int, int]:
        return (0, 0)


def test_worker_schedules_recurring_jobs(monkeypatch) -> None:
    """Recurring jobs must not be registered in APScheduler's paused state."""

    from apscheduler.schedulers import blocking
    from analytics import factory as analytics_factory
    from content import factory as content_factory
    from shared import cache
    from shared.config import settings
    from workers import rollup, trending

    monkeypatch.setattr(blocking, 'BlockingScheduler', RecordingScheduler)
    monkeypatch.setattr(analytics_factory, 'build_repository', lambda: object())
    monkeypatch.setattr(cache, 'create_cache', lambda _: object())
    monkeypatch.setattr(content_factory, 'get_service', FakeContentService)
    monkeypatch.setattr(rollup, 'run_rollup', lambda _: (0, 0))
    monkeypatch.setattr(trending, 'run_trending', lambda _, __: 0)
    monkeypatch.setattr(settings, 'database_url', 'postgresql://test')

    worker_main.main()

    scheduler = RecordingScheduler.instance
    assert scheduler is not None
    assert scheduler.started
    assert len(scheduler.jobs) == 3
    assert all('next_run_time' not in kwargs for _, _, kwargs in scheduler.jobs)