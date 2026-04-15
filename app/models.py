from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class HazardType(str, Enum):
    UNSAFE_INTERSECTION = "unsafe_intersection"
    TRANSIT_DELAY = "transit_delay"
    CONSTRUCTION = "construction"
    LOW_LIGHTING = "low_lighting"
    CROWDING = "crowding"
    ACCIDENT = "accident"


class Hazard(BaseModel):
    id: str
    type: HazardType
    severity: int = Field(ge=1, le=5)
    title: str
    description: str
    lat: float
    lon: float
    last_updated: datetime


class RouteStep(BaseModel):
    instruction: str
    approx_minutes: int = Field(ge=1, le=120)


class RouteCandidate(BaseModel):
    id: str
    name: str
    eta_minutes: int = Field(ge=1, le=240)
    distance_km: float = Field(gt=0)
    steps: list[RouteStep]
    risk_score: float = Field(ge=0)


class RouteRequest(BaseModel):
    start: str = Field(min_length=1, max_length=200)
    destination: str = Field(min_length=1, max_length=200)

    # Simple toggles for the prototype; optional and safe to ignore.
    prefer_transit: bool = False
    risk_tolerance: str = Field(default="low", pattern="^(low|medium|high)$")


class RouteDecision(BaseModel):
    chosen_route_id: str
    alert: str
    llm_used: bool
    explanation: str | None = None


class RouteResponse(BaseModel):
    request: RouteRequest
    generated_at: datetime
    hazards: list[Hazard]
    routes: list[RouteCandidate]
    decision: RouteDecision
    safest_route: RouteCandidate
