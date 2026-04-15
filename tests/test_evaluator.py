from __future__ import annotations

from app.core.config import Settings
from app.models import RouteRequest
from app.services.evaluator import generate_route_response


def test_generate_route_response_without_vertex_uses_local_decision():
    settings = Settings(
        vertex_project=None,
        vertex_location=None,
        vertex_model=None,
        hazards_count=5,
    )
    payload = RouteRequest(start="MG Road Metro Station, Bengaluru", destination="Cubbon Park, Bengaluru")

    response = generate_route_response(payload, settings)

    assert response.decision.llm_used is False
    assert response.decision.chosen_route_id == response.safest_route.id
    assert isinstance(response.decision.alert, str)
    assert len(response.routes) >= 2


def test_generate_route_response_respects_hazards_count_setting():
    settings = Settings(vertex_project=None, vertex_location=None, vertex_model=None, hazards_count=3)
    payload = RouteRequest(start="A", destination="B")

    response = generate_route_response(payload, settings)

    assert len(response.hazards) == 3
