from __future__ import annotations

import math
from datetime import UTC, datetime

from app.models import Hazard, RouteCandidate, RouteStep
from app.services.geocode import pseudo_geocode


def _haversine_km(a: tuple[float, float], b: tuple[float, float]) -> float:
    lat1, lon1 = a
    lat2, lon2 = b
    r = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    x = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * r * math.asin(math.sqrt(x))


def build_route_candidates(*, start: str, destination: str, prefer_transit: bool) -> list[RouteCandidate]:
    """Create 2-3 plausible route options without external routing APIs."""

    s = pseudo_geocode(start)
    d = pseudo_geocode(destination)
    distance_km = max(0.3, _haversine_km(s, d))

    # Walking estimate: ~4.5 km/h
    walking_eta = max(6, int((distance_km / 4.5) * 60))

    routes: list[RouteCandidate] = []

    routes.append(
        RouteCandidate(
            id="route_main",
            name="Main streets (fastest)",
            eta_minutes=walking_eta,
            distance_km=round(distance_km, 2),
            steps=[
                RouteStep(instruction=f"Walk from {start} toward the main corridor", approx_minutes=max(2, walking_eta // 3)),
                RouteStep(instruction="Continue straight through major intersections", approx_minutes=max(2, walking_eta // 3)),
                RouteStep(instruction=f"Arrive at {destination}", approx_minutes=max(2, walking_eta - 2 * max(2, walking_eta // 3))),
            ],
            risk_score=0.0,
        )
    )

    routes.append(
        RouteCandidate(
            id="route_detour",
            name="Well-lit detour (safer)",
            eta_minutes=int(walking_eta * 1.18) + 2,
            distance_km=round(distance_km * 1.12, 2),
            steps=[
                RouteStep(instruction="Take a parallel avenue with better lighting", approx_minutes=max(3, walking_eta // 3)),
                RouteStep(instruction="Avoid the busiest intersection cluster", approx_minutes=max(3, walking_eta // 3)),
                RouteStep(instruction=f"Rejoin toward {destination}", approx_minutes=max(3, int(walking_eta * 1.18) + 2 - 2 * max(3, walking_eta // 3))),
            ],
            risk_score=0.0,
        )
    )

    if prefer_transit:
        routes.append(
            RouteCandidate(
                id="route_transit",
                name="Transit (fast if on-time)",
                eta_minutes=max(10, int(walking_eta * 0.65)),
                distance_km=round(distance_km, 2),
                steps=[
                    RouteStep(instruction="Walk to nearest stop", approx_minutes=6),
                    RouteStep(instruction="Ride 3–5 stops", approx_minutes=max(4, int(walking_eta * 0.35))),
                    RouteStep(instruction=f"Walk to {destination}", approx_minutes=5),
                ],
                risk_score=0.0,
            )
        )

    return routes


def score_routes_against_hazards(routes: list[RouteCandidate], hazards: list[Hazard]) -> list[RouteCandidate]:
    """Assign a risk score; lower is safer.

    This is intentionally simple: it treats hazards as adding risk and lightly
    penalizes longer ETA.
    """

    now = datetime.now(UTC)
    scored: list[RouteCandidate] = []
    for route in routes:
        hazard_risk = 0.0
        for hz in hazards:
            # Newer hazards matter more.
            age_minutes = max(0.0, (now - hz.last_updated).total_seconds() / 60.0)
            freshness = max(0.2, 1.0 - (age_minutes / 120.0))

            # Route-specific weighting: main streets tend to touch more hazards.
            route_factor = {
                "route_main": 1.00,
                "route_detour": 0.75,
                "route_transit": 0.90,
            }.get(route.id, 1.0)

            hazard_risk += hz.severity * freshness * route_factor

        eta_penalty = route.eta_minutes * 0.02
        route.risk_score = round(hazard_risk + eta_penalty, 3)
        scored.append(route)

    return scored


def choose_safest_route(routes: list[RouteCandidate]) -> RouteCandidate:
    if not routes:
        raise ValueError("No route candidates")
    return sorted(routes, key=lambda r: (r.risk_score, r.eta_minutes))[0]
