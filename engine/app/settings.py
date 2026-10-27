"""Engine configuration.

Environment-first settings with safe local defaults. PostgreSQL + pgvector is
the production path (``BRANDPROOF_DATABASE_URL`` pointing at a Postgres 16
instance); the demo default is a zero-service SQLite file so the engine runs
anywhere with no external dependencies and no AI provider keys.
"""

from functools import lru_cache
from pathlib import Path

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

ENGINE_ROOT = Path(__file__).resolve().parent.parent
STORAGE_DIR = ENGINE_ROOT / "storage"
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
    deterministic_factory_seed: int = 42


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Process-wide settings singleton."""
    return Settings()


def ensure_storage_dirs() -> None:
    """Create on-disk storage locations on boot."""
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    MANIFEST_DIR.mkdir(parents=True, exist_ok=True)
