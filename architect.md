## SafePath AI — hackathon architecture
Role: Act as a Senior Software Architect and Product Manager with 15+ years of experience in rapid prototyping and AI integration. Your goal is to help me win a hackathon by designing a solution that is technically sound, highly scalable, and implementable within a few hours.

Objective: I will provide you with a "Surprise Problem Statement." You must respond in the following structured format:

Requirement Analysis: Identify the 3 core "must-have" features that will impress judges.

The Stack: Recommend the fastest libraries/frameworks to use (prioritizing speed of deployment over "perfect" architecture).

Data Flow: A brief step-by-step logic of how the AI interacts with the user and the backend.

The "Hackathon Edge": Suggest one "wow" factor feature (e.g., a specific AI capability like sentiment analysis, voice-to-text, or real-time visualization) that is easy to implement but looks difficult.

Step-by-Step Execution Plan: Break down the next 4 hours into 30-minute sprints.

Constraints:

Prioritize GitHub Copilot friendly code (clean, standard patterns).

Avoid over-engineering. If a library exists to do it in one line, use it.

Focus on a Working Demo over a perfect UI.

### Requirement Analysis (3 must-haves)
1) **Safest-route decision in < 3 seconds**
	- Input: start + destination
	- Output: safest route + ETA + safety score
2) **Real-time hazards (simulated) that visibly affect routing**
	- Judges should see hazards change and the recommendation update.
3) **Actionable 1-sentence alert**
	- Something a commuter can do immediately (“Avoid X, take Y…”).

### The Stack (fastest to ship)
- Backend: **FastAPI + Pydantic**
- LLM evaluation: **Vertex AI (optional) with safe local fallback**
- Frontend: **single HTML file + Tailwind CDN + fetch()**
- CI: **GitHub Actions** running `pytest`

### Data Flow (end-to-end)
1) User enters start/destination in the UI.
2) UI calls `POST /api/v1/safepath/route`.
3) Backend generates localized hazards (deterministic per hour).
4) Backend builds 2–3 route candidates and scores them against hazards.
5) If Vertex AI is configured, LLM selects route + writes the 1-sentence alert; otherwise local evaluator does.
6) UI renders: alert, chosen route steps, hazard list.

### The “Hackathon Edge” (wow factor, easy)
**“Explain my route” toggle**: show a short explanation string (LLM or local) for why the route is safest. It feels like real reasoning, but it’s just structured output.

### Step-by-Step Execution Plan (next 4 hours)
- 0:00–0:30: Run backend locally, verify `/healthz` + `/api` response.
- 0:30–1:00: Polish UI layout + error handling.
- 1:00–1:30: Add demo-friendly defaults + “prefer transit” toggle.
- 1:30–2:00: Add Vertex config via `.env` + quick sanity check.
- 2:00–2:30: Add a 60-second pitch script + “judge path” demo inputs.
- 2:30–3:00: Add one more hazard type + more realistic alert templates.
- 3:00–3:30: Record a short screen capture backup demo.
- 3:30–4:00: Buffer + final run-through.
