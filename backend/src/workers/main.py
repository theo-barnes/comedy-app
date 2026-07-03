from __future__ import annotations

from shared.logging import configure_logging, get_logger


def main() -> None:
    """Entry point for the ``platform-worker`` console script."""

    configure_logging()
    log = get_logger('worker')

    from apscheduler.schedulers.blocking import BlockingScheduler

    from analytics.factory import build_repository
    from shared.cache import create_cache
    from shared.config import settings
    from workers.rollup import run_rollup
    from workers.trending import run_trending

    if not settings.database_url:
        raise SystemExit('platform-worker requires DISCOVERY_DATABASE_URL')

    repository = build_repository()
    cache = create_cache(settings.redis_url)

    def rollup_job() -> None:
        content_rows, creator_rows = run_rollup(repository)
        log.info('rollup_complete', content_rows=content_rows, creator_rows=creator_rows)

    def trending_job() -> None:
        count = run_trending(repository, cache)
        log.info('trending_complete', entries=count)

    scheduler = BlockingScheduler(timezone='UTC')
    scheduler.add_job(rollup_job, 'interval', minutes=15, next_run_time=None)
    scheduler.add_job(trending_job, 'interval', minutes=5, next_run_time=None)

    # run both once at startup so fresh deployments have data immediately
    rollup_job()
    trending_job()

    log.info('worker_started')
    scheduler.start()


if __name__ == '__main__':
    main()
