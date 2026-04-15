# SafePath AI (Prototype)

Urban mobility micro-routing demo: enter a start + destination and get a “safest route” recommendation plus a 1‑sentence actionable alert. Uses simulated real-time hazards and (optionally) Vertex AI for LLM evaluation.

## Quickstart

1) Create a venv and install deps:

```bash
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

2) Run the API:

```bash
uvicorn app.main:app --reload
```

3) Open the UI:

- http://127.0.0.1:8000/

## Vertex AI (optional)

If you set `VERTEX_PROJECT` + `VERTEX_LOCATION` (and optionally `VERTEX_MODEL`) in a `.env`, the backend will attempt to use Vertex AI.

Vertex AI authentication is done via **Google Cloud credentials** (Application Default Credentials / service accounts), not by pasting API keys into the app.

Fastest local setup:

```bash
gcloud auth application-default login
```

Or set `GOOGLE_APPLICATION_CREDENTIALS` in your `.env` to a service account JSON file.

If Vertex isn’t configured, the demo still works using a deterministic local evaluator.

## API

- `POST /api/v1/safepath/route`
- Body:

```json
{ "start": "Union Square", "destination": "Times Square" }
```
