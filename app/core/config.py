from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict


# Ensure environment variables from `.env` are available to libraries that read
# directly from the process environment (e.g., Google auth).
_PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(dotenv_path=_PROJECT_ROOT / ".env", override=False)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_env: str = "dev"

    vertex_project: str | None = None
    vertex_location: str | None = None
    vertex_model: str | None = None

    google_application_credentials: str | None = None

    hazards_count: int = 8


settings = Settings()
