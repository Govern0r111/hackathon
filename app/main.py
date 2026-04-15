from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse

from app.api.routes import router as api_router


WEB_DIR = Path(__file__).resolve().parent.parent / "web"


def create_app() -> FastAPI:
    app = FastAPI(title="SafePath AI", version="0.1.0")

    app.include_router(api_router)

    @app.get("/healthz")
    def healthz() -> dict:
        return {"status": "ok"}

    @app.get("/", include_in_schema=False, response_model=None)
    def index():
        index_file = WEB_DIR / "index.html"
        if not index_file.exists():
            raise HTTPException(status_code=500, detail="Missing web/index.html")
        return FileResponse(index_file)

    return app


app = create_app()
