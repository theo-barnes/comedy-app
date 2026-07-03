from __future__ import annotations

from location.classifier import CityClassifier, ClassificationThresholds
from location.models.domain import MarketSize

from .fakes import resolved_city

THRESHOLDS = ClassificationThresholds(
    mega_city_population=5_000_000,
    large_city_population=1_000_000,
    mid_city_population=250_000,
)


def _classify(population: int | None) -> MarketSize:
    return CityClassifier(thresholds=THRESHOLDS).classify(resolved_city(population))


def test_mega_city() -> None:
    assert _classify(9_000_000) is MarketSize.MEGA


def test_large_city() -> None:
    assert _classify(1_500_000) is MarketSize.LARGE


def test_mid_city() -> None:
    assert _classify(300_000) is MarketSize.MID


def test_small_city() -> None:
    assert _classify(40_000) is MarketSize.SMALL


def test_unknown_population_is_small() -> None:
    assert _classify(None) is MarketSize.SMALL
