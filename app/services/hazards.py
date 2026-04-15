from __future__ import annotations

import hashlib
import random
from datetime import UTC, datetime, timedelta

from app.models import Hazard, HazardType
from app.services.geocode import pseudo_geocode


def _seed_from_text(*parts: str) -> int:
    joined = "|".join(p.strip().lower() for p in parts)
    digest = hashlib.sha256(joined.encode("utf-8")).hexdigest()
    return int(digest[:12], 16)


def generate_mock_hazards(
    *,
    start: str,
    destination: str,
    count: int,
    now: datetime | None = None,
) -> list[Hazard]:
    """Generate localized 'real-time' hazards.

    Deterministic per (start, destination, hour) so the demo feels stable but still
    changes over time.
    """

    now = now or datetime.now(UTC)
    window = now.replace(minute=0, second=0, microsecond=0)
    rng = random.Random(_seed_from_text(start, destination, window.isoformat()))

    start_lat, start_lon = pseudo_geocode(start)
    end_lat, end_lon = pseudo_geocode(destination)

    hazard_catalog: list[tuple[HazardType, str, str, tuple[int, int]]] = [
        (HazardType.UNSAFE_INTERSECTION, "Unsafe intersection", "Near-miss reports in the last hour.", (3, 5)),
        (HazardType.TRANSIT_DELAY, "Transit delay", "Service disruption affecting local lines.", (2, 4)),
        (HazardType.CONSTRUCTION, "Construction", "Sidewalk closure and detour signage reported.", (1, 3)),
        (HazardType.LOW_LIGHTING, "Low lighting", "Poor visibility reported on this block.", (2, 4)),
        (HazardType.CROWDING, "Crowding", "High foot-traffic; slower walking speeds expected.", (1, 3)),
        (HazardType.ACCIDENT, "Traffic incident", "Reduced crossing time / congestion nearby.", (2, 4)),
    ]

    hazards: list[Hazard] = []
    for i in range(count):
        h_type, title, desc, sev_range = rng.choice(hazard_catalog)
        severity = rng.randint(sev_range[0], sev_range[1])

        # Place hazard roughly along the corridor between start and destination.
        t = (i + 1) / (count + 1)
        lat = (1 - t) * start_lat + t * end_lat
        lon = (1 - t) * start_lon + t * end_lon

        # Add small local jitter.
        lat += (rng.random() - 0.5) * 0.02
        lon += (rng.random() - 0.5) * 0.02

        hazards.append(
            Hazard(
                id=f"hz_{i}_{h_type.value}",
                type=h_type,
                severity=severity,
                title=title,
                description=desc,
                lat=round(lat, 6),
                lon=round(lon, 6),
                last_updated=window - timedelta(minutes=rng.randint(0, 55)),
            )
        )

    return hazards
