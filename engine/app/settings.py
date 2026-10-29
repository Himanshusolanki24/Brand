"""Engine configuration.

Environment-first settings with safe local defaults. PostgreSQL + pgvector is
the production path (``BRANDPROOF_DATABASE_URL`` pointing at a Postgres 16
instance); the demo default is a zero-service SQLite file so the engine runs
anywhere with no external dependencies and no AI provider keys.
"""

import os
from functools import lru_cache
from pathlib import Path
from typing import Any

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ENGINE_ROOT = Path(__file__).resolve().parent.parent
# Platforms with read-only app directories (e.g. Vercel serverless) point this
# at a writable location — /tmp/storage — via BRANDPROOF_STORAGE_DIR.
STORAGE_DIR = Path(os.environ.get("BRANDPROOF_STORAGE_DIR") or (ENGINE_ROOT / "storage"))
MANIFEST_DIR = STORAGE_DIR / "manifests"


class Settings(BaseSettings):
    """All runtime knobs, overridable via environment or `.env`."""

    model_config = SettingsConfigDict(
        env_prefix="BRANDPROOF_",
        env_file=".env",
        extra="ignore",
    )

    app_name: str = "BrandProof Engine"
    # SQLite demo default; swap for postgresql+asyncpg://… to engage pgvector.
    database_url: str = f"sqlite+aiosqlite:///{STORAGE_DIR / 'engine.db'}"
    # "local" = deterministic hashing embedder (no keys, no network).
    # "openai" = text-embedding-3-small (used when the key is present).
    embedding_provider: str = "local"
    openai_api_key: SecretStr | None = None
    openai_embedding_model: str = "text-embedding-3-small"
    # Semantic review (Layer 2). "none" = deterministic-only — the default, no
    # keys, no network. "openrouter" enables the grounded model pass; the
    # engine degrades gracefully to Layer 1 if the call fails or times out.
    llm_provider: str = "none"  # none | openrouter (OpenAI-compatible)
    openrouter_api_key: SecretStr | None = None
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    llm_model: str = "google/gemma-4-31b-it:free"
    llm_temperature: float = 0.2
    llm_timeout_seconds: float = 30.0
    llm_max_issues: int = 6
    # JWT — HS256 demo token; production Supabase OTP adapter swaps in here.
    jwt_secret: SecretStr = SecretStr("brandproof-dev-secret-do-not-use-in-prod")
    jwt_algorithm: str = "HS256"
    jwt_ttl_minutes: int = 720
    retrieval_k: int = 6
    retrieval_k_min: int = 5
    retrieval_k_max: int = 8
    chunk_target_tokens: int = 320
    chunk_overlap_tokens: int = 48
    cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:3000", "http://127.0.0.1:3000"],
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _normalize_cors_origins(cls, value: Any) -> Any:
        """Accept a JSON array, a bare origin, or a comma-separated list.

        Env lists are JSON by pydantic convention, but a deployment dashboard
        can deliver the value with the brackets stripped or typographic
        quotes — a crash at boot is the wrong response to a string. Any
        string form is normalized here; a real list passes through.
        """
        if not isinstance(value, str):
            return value
        raw = value.strip()
        if raw.startswith("[") and raw.endswith("]"):
            raw = raw[1:-1]
        origins = [
            item.strip().strip("\"'“”‘’").strip()
            for item in raw.split(",")
        ]
        return [item for item in origins if item]
    deterministic_factory_seed: int = 42


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Process-wide settings singleton."""
    return Settings()


def ensure_storage_dirs() -> None:
    """Create on-disk storage locations on boot."""
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    MANIFEST_DIR.mkdir(parents=True, exist_ok=True)
