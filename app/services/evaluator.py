from __future__ import annotations

from datetime import UTC, datetime

from app.core.config import Settings
from app.models import RouteDecision, RouteRequest, RouteResponse
from app.services.hazards import generate_mock_hazards
from app.services.routing import build_route_candidates, choose_safest_route, score_routes_against_hazards
from app.services.vertex_llm import VertexConfig, VertexLLM


def _local_alert(decision_route_name: str, hazards_count: int) -> str:
    if hazards_count == 0:
        return f"All clear right now—take {decision_route_name} and keep an eye on crossings."
    if hazards_count <= 3:
        return f"Take {decision_route_name}; avoid the flagged intersections and expect minor slowdowns."
    return f"Take {decision_route_name}; avoid the highest‑risk intersection cluster and allow a few extra minutes."


def generate_route_response(payload: RouteRequest, settings: Settings) -> RouteResponse:
    generated_at = datetime.now(UTC)

    hazards = generate_mock_hazards(
        start=payload.start,
        destination=payload.destination,
        count=settings.hazards_count,
        now=generated_at,
    )

    routes = build_route_candidates(
        start=payload.start,
        destination=payload.destination,
        prefer_transit=payload.prefer_transit,
    )
    routes = score_routes_against_hazards(routes, hazards)

    safest = choose_safest_route(routes)

    llm_used = False
    explanation: str | None = None
    alert = _local_alert(safest.name, len(hazards))

    if settings.vertex_project and settings.vertex_location:
        vertex_model = settings.vertex_model or "gemini-1.5-flash-002"
        llm = VertexLLM(VertexConfig(project=settings.vertex_project, location=settings.vertex_location, model=vertex_model))
        if llm.available:
            hazards_dict = [h.model_dump() for h in hazards]
            routes_dict = [r.model_dump() for r in routes]
            out = llm.pick_route_and_alert(
                start=payload.start,
                destination=payload.destination,
                hazards=hazards_dict,
                routes=routes_dict,
            )
            if out and isinstance(out.get("chosen_route_id"), str) and isinstance(out.get("alert"), str):
                chosen_id = out["chosen_route_id"]
                match = next((r for r in routes if r.id == chosen_id), None)
                if match is not None:
                    safest = match
                alert = out["alert"].strip()
                explanation = (out.get("explanation") or "").strip() or None
                llm_used = True

    decision = RouteDecision(
        chosen_route_id=safest.id,
        alert=alert,
        llm_used=llm_used,
        explanation=explanation,
    )

    return RouteResponse(
        request=payload,
        generated_at=generated_at,
        hazards=hazards,
        routes=routes,
        decision=decision,
        safest_route=safest,
    )
