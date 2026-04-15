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
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

If you get a Windows error like `WinError 10048` (port already in use), pick another port:

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
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

## Challenge Vertical

**Smart Mobility Intelligence System**

Persona focus: daily urban commuter who needs safer route guidance, not only the fastest ETA.

## What This Solution Demonstrates

- Smart, dynamic assistant behavior: route mode changes from standard to safe detour when hazard is triggered.
- Context-aware decisioning: route risk is evaluated from hazard severity, freshness, and route profile.
- Google services integration:
	- Google Maps JavaScript API for map rendering, markers, and route visualization.
	- Cloud Run for deployed frontend hosting.
	- Google Cloud Storage static hosting used during development validation.
	- Optional Vertex AI integration for LLM-assisted route explanation and alert text.
- Real-world usability: clear controls (start, destination, hazard alert), visual detour rendering, and AI terminal status output.

## Architecture and Approach

- Backend (FastAPI):
	- Generates hazard feed (mocked for prototype).
	- Builds multiple route candidates.
	- Scores routes by risk and selects safest route.
	- Optionally invokes Vertex AI for explanation text.
- Frontend (React + Vite):
	- Renders dark-mode dashboard with map and control panel.
	- Draws standard route and detour route states.
	- Displays hazard marker and terminal alert.
- Deployment:
	- Frontend deployed to Cloud Run.

## Assumptions

- Hazard data is simulated in this round (no live city telemetry source).
- Route scoring is intentionally lightweight for explainability and speed.
- Vertex AI is optional so app remains functional without cloud credentials.

## How It Works (End-to-End)

1. User enters start and destination.
2. Frontend requests route computation/visualization.
3. Backend evaluates route options against hazards.
4. Safest route is selected.
5. On hazard alert, UI switches to detour route and shows terminal warning.

## Testing and Validation

- Backend unit tests:

```bash
python -m pytest -q
```

- Frontend production build validation:

```bash
cd frontend
npm install
npm run build
```

- Manual checks:
	- Health endpoint responds.
	- Map loads with valid API key and referrer restriction.
	- Hazard button toggles from standard route to detour route.

## Security Notes

- API keys restricted by HTTP referrer.
- Service account key files are ignored via `.gitignore`.
- Backend keeps cloud integration optional to reduce hard failures and secret leakage risk.

## Accessibility Notes

- High-contrast dark UI.
- Clear control labels and readable terminal text.
- Keyboard-friendly text inputs and buttons.

## Efficiency Notes

- Lightweight backend scoring logic for fast responses.
- Frontend bundles are small and cacheable.
- Cloud Run autoscaling minimizes idle resource usage.

## Deployment Links

- Public GitHub repository: `https://github.com/Govern0r111/hackathon`
- Cloud Run deployed frontend: `https://safepath-frontend-56631765862.asia-south1.run.app`

## Submission Compliance Checklist

- Public GitHub repository: Yes
- Single branch workflow (`main`): Yes
- Integrated Google services: Yes
- README includes vertical, approach, logic, assumptions, and run instructions: Yes
