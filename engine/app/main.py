"""BrandProof engine — FastAPI application factory.

Run:  uv run uvicorn app.main:app --reload --port 8900
Docs: http://localhost:8900/docs (OpenAPI 3.1 JSON at /openapi.json)
"""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncConnection,
    AsyncSession,
    async_sessionmaker,
)

from app.api.routes import approvals, auth, proposals, reviews, trust, workspace
from app.db.database import dispose_engine, init_db
from app.db.seed import run_seed
from app.security.errors import (
    APIProblemError,
    problem_response,
)
from app.settings import get_settings

_openapi_tags = {
    "name": "health",
    "description": "Liveness + engine facts (what is deterministic, what calls a model).",
}


def engine_health() -> dict[str, object]:
    """Human-auditable engine facts — the 'how it works' contract lives here."""
    settings = get_settings()
    provider = _provider_label()
    llm_active = (
        settings.llm_provider == "openrouter" and settings.openrouter_api_key is not None
    )
    return {
        "status": "ok",
        "app": settings.app_name,
        "database": "postgresql+pgvector" if _is_postgres() else "sqlite (demo)",
        "embedding_provider": provider,
        "llm_provider": "openrouter" if llm_active else "none",
        "llm_model": settings.llm_model if llm_active else "none (deterministic only)",
        "deterministic_checks": 6,
        "risk_routing": "deterministic",
        "ai_provider_required": provider != "local",
        "version": "0.1.0",
    }


def _is_postgres() -> bool:
    return get_settings().database_url.startswith("postgresql")


def _provider_label() -> str:
    from app.services.embeddings.providers import get_provider

    provider = get_provider()
    return "openai:text-embedding-3-small" if provider.model_id.startswith("text-") else "local"


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        description=(
            "BrandProof governance engine. Deterministic checks, "
            "evidence-backed retrieval, RBAC, approval manifests — built for "
            "the Inkloom AI hackathon blueprint."
        ),
        openapi_tags=[_openapi_tags],
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # --- Problem+json error contract -----------------------------------
    @app.exception_handler(APIProblemError)
    async def problem_handler(_: Request, exc: APIProblemError) -> JSONResponse:
        return problem_response(exc)

    @app.exception_handler(RequestValidationError)
    async def validation_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            media_type="application/problem+json",
            content=jsonable_encoder({
                "type": "https://brandproof.app/errors/validation",
                "title": "Validation error",
                "status": 422,
                "detail": "Request payload failed validation.",
                "errors": [
                    {"field": ".".join(str(x) for x in err.get("loc", [])),
                     "message": err.get("msg", "")}
                    for err in exc.errors()
                ],
            }),
        )

    @app.exception_handler(Exception)
    async def fallback_handler(_: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=500,
            media_type="application/problem+json",
            content={
                "type": "https://brandproof.app/errors/internal",
                "title": "Internal error",
                "status": 500,
                "detail": f"{type(exc).__name__}, see server logs.",
            },
        )

    # --- Routers ---------------------------------------------------------
    app.include_router(auth.router, prefix="/api")
    app.include_router(workspace.router, prefix="/api")
    app.include_router(reviews.router, prefix="/api")
    app.include_router(approvals.router, prefix="/api")
    app.include_router(proposals.router, prefix="/api")
    app.include_router(trust.router, prefix="/api")
    app.include_router(trust.admin, prefix="/api")

    @app.get("/api/health", tags=["health"], summary="Engine health + facts")
    async def health() -> dict[str, object]:
        facts = engine_health()
        try:
            async with (await _engine_connect()) as conn:
                await conn.execute(text("SELECT 1"))
            facts["database"] = facts["database"]  # reachable
        except BaseException:  # pragma: no cover — degraded path
            facts["status"] = "degraded"
        return facts

    return app


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncGenerator[None, None]:
    """Startup: create schema, seed demo corpus, refresh embeddings."""
    await init_db()
    async with (await _session_factory())() as session:
        await run_seed(session)
        # Keep the embedding index aligned with the corpus on every boot.
        # Cheap: the default deterministic embedder does no network I/O.
        from app.db.seed import ORG_ID
        from app.services.embeddings import index_org_knowledge

        await index_org_knowledge(session, ORG_ID)
        await session.commit()
    yield
    await dispose_engine()


async def _engine_connect() -> AsyncConnection:
    from app.db.database import get_engine

    return get_engine().connect()


async def _session_factory() -> async_sessionmaker[AsyncSession]:
    from app.db.database import get_session_factory

    return get_session_factory()


app = create_app()
