from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_healthz_returns_ok():
    resp = client.get("/healthz")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_safepath_route_endpoint_returns_valid_shape():
    payload = {
        "start": "MG Road Metro Station, Bengaluru",
        "destination": "Cubbon Park, Bengaluru",
        "prefer_transit": False,
        "risk_tolerance": "low",
    }
    resp = client.post("/api/v1/safepath/route", json=payload)
    assert resp.status_code == 200

    data = resp.json()
    assert "hazards" in data and isinstance(data["hazards"], list)
    assert "routes" in data and isinstance(data["routes"], list)
    assert "decision" in data and isinstance(data["decision"], dict)
    assert "safest_route" in data and isinstance(data["safest_route"], dict)

    # Safety decision should point to one of the returned route ids.
    route_ids = {route["id"] for route in data["routes"]}
    assert data["decision"]["chosen_route_id"] in route_ids
