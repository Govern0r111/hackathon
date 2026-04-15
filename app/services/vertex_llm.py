from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class VertexConfig:
    project: str
    location: str
    model: str


def _extract_json(text: str) -> dict[str, Any] | None:
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    snippet = text[start : end + 1]
    try:
        return json.loads(snippet)
    except Exception:
        return None


class VertexLLM:
    def __init__(self, config: VertexConfig):
        self._config = config

        # Lazy import so local dev/CI works without Vertex creds.
        try:
            import vertexai  # type: ignore
            from vertexai.generative_models import GenerativeModel  # type: ignore

            self._vertexai = vertexai
            self._GenerativeModel = GenerativeModel
            self._available = True
        except Exception:
            self._available = False
            self._vertexai = None
            self._GenerativeModel = None

    @property
    def available(self) -> bool:
        return self._available

    def pick_route_and_alert(
        self,
        *,
        start: str,
        destination: str,
        hazards: list[dict[str, Any]],
        routes: list[dict[str, Any]],
    ) -> dict[str, Any] | None:
        """Ask Vertex AI to choose the safest route and produce a one-sentence alert.

        Returns a dict like:
        {"chosen_route_id": "route_detour", "alert": "...", "explanation": "..."}
        """

        if not self.available:
            return None

        try:
            assert self._vertexai is not None
            assert self._GenerativeModel is not None

            self._vertexai.init(project=self._config.project, location=self._config.location)
            model = self._GenerativeModel(self._config.model)

            prompt = {
                "task": "Select the safest route for an urban commuter based on hazards.",
                "constraints": [
                    "Prefer safety over speed.",
                    "Return exactly ONE sentence in alert.",
                    "Return strict JSON only.",
                ],
                "input": {
                    "start": start,
                    "destination": destination,
                    "hazards": hazards,
                    "routes": routes,
                },
                "output_schema": {
                    "chosen_route_id": "string",
                    "alert": "string (one sentence)",
                    "explanation": "string (short)",
                },
            }

            response = model.generate_content(
                json.dumps(prompt),
                generation_config={"temperature": 0.2, "max_output_tokens": 256},
            )

            text = getattr(response, "text", None) or str(response)
            parsed = _extract_json(text)
            if not parsed:
                return None

            if "chosen_route_id" not in parsed or "alert" not in parsed:
                return None

            return parsed
        except Exception:
            return None
