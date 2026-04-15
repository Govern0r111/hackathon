from __future__ import annotations

import hashlib


def pseudo_geocode(place: str) -> tuple[float, float]:
    """Deterministic pseudo-geocode for hackathon demos.

    Converts an arbitrary string into a plausible lat/lon near a fixed city center.
    This avoids external APIs while keeping outputs stable for the same inputs.
    """

    # NYC-ish center; offsets are small enough to look local.
    base_lat, base_lon = 40.7128, -74.0060
    digest = hashlib.sha256(place.strip().lower().encode("utf-8")).digest()

    # Map two bytes into [-0.03, 0.03]
    lat_off = ((digest[0] / 255.0) - 0.5) * 0.06
    lon_off = ((digest[1] / 255.0) - 0.5) * 0.06
    return base_lat + lat_off, base_lon + lon_off
