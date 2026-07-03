from __future__ import annotations

from dataclasses import dataclass

from .models.domain import MarketSize, ResolvedPlace


@dataclass(slots=True, frozen=True)
class ClassificationThresholds:
    mega_city_population: int
    large_city_population: int
    mid_city_population: int


@dataclass(slots=True)
class CityClassifier:
    """Classifies a city into a market size band from its population.

    Population is a proxy for market size; the bands are configurable so the
    system can be tuned per-region as real usage data arrives.
    """

    thresholds: ClassificationThresholds

    def classify(self, place: ResolvedPlace) -> MarketSize:
        population = place.population or 0
        if population >= self.thresholds.mega_city_population:
            return MarketSize.MEGA
        if population >= self.thresholds.large_city_population:
            return MarketSize.LARGE
        if population >= self.thresholds.mid_city_population:
            return MarketSize.MID
        return MarketSize.SMALL
