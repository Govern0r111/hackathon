from __future__ import annotations

from fastapi import APIRouter

from app.core.config import settings
from app.models import RouteRequest, RouteResponse
from app.services.evaluator import generate_route_response


router = APIRouter(prefix="/api/v1")


@router.post("/safepath/route", response_model=RouteResponse)
def safepath_route(payload: RouteRequest) -> RouteResponse:
    return generate_route_response(payload, settings)
