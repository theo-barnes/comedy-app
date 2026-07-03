from __future__ import annotations

from dataclasses import dataclass, field

from ..models.domain import MarketSize
from .base import DiscoveryStrategy
from .large_city import LargeCityStrategy
from .mega_city import MegaCityStrategy
from .mid_city import MidCityStrategy
from .small_city import SmallCityStrategy


def _default_strategies() -> dict[MarketSize, DiscoveryStrategy]:
    return {
        MarketSize.MEGA: MegaCityStrategy(),
        MarketSize.LARGE: LargeCityStrategy(),
        MarketSize.MID: MidCityStrategy(),
        MarketSize.SMALL: SmallCityStrategy(),
    }


@dataclass(slots=True)
class StrategyRegistry:
    """Maps a market size to its discovery strategy.

    New market bands or overrides can be registered without modifying the
    service, keeping the strategy system extensible.
    """

    _strategies: dict[MarketSize, DiscoveryStrategy] = field(default_factory=_default_strategies)

    def register(self, market_size: MarketSize, strategy: DiscoveryStrategy) -> None:
        self._strategies[market_size] = strategy

    def get(self, market_size: MarketSize) -> DiscoveryStrategy:
        return self._strategies[market_size]
