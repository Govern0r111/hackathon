from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_env: str = "dev"

    vertex_project: str | None = None
    vertex_location: str | None = None
    vertex_model: str | None = None

    hazards_count: int = 8


settings = Settings()
