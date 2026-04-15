from __future__ import annotations

from datetime import UTC, datetime

from app.services.hazards import generate_mock_hazards


def test_generate_mock_hazards_is_deterministic_per_hour():
    now = datetime(2026, 4, 15, 12, 34, tzinfo=UTC)
    h1 = generate_mock_hazards(start="A", destination="B", count=5, now=now)
    h2 = generate_mock_hazards(start="A", destination="B", count=5, now=now)
    assert [x.model_dump() for x in h1] == [x.model_dump() for x in h2]


def test_generate_mock_hazards_count():
    now = datetime(2026, 4, 15, 12, 0, tzinfo=UTC)
    hazards = generate_mock_hazards(start="A", destination="B", count=8, now=now)
    assert len(hazards) == 8
