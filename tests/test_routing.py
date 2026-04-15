from __future__ import annotations

from datetime import UTC, datetime

from app.models import Hazard, HazardType
from app.services.routing import build_route_candidates, choose_safest_route, score_routes_against_hazards


def test_choose_safest_route_picks_lowest_score():
    routes = build_route_candidates(start="A", destination="B", prefer_transit=False)
    hazards = [
        Hazard(
            id="hz1",
            type=HazardType.UNSAFE_INTERSECTION,
            severity=5,
            title="Unsafe",
            description="",
            lat=40.0,
            lon=-74.0,
            last_updated=datetime.now(UTC),
        )
    ]
    scored = score_routes_against_hazards(routes, hazards)
    safest = choose_safest_route(scored)
    assert safest.id in {"route_main", "route_detour"}
    assert safest.risk_score == min(r.risk_score for r in scored)

