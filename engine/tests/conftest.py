"""Shared test fixtures — a fresh, seeded engine per test session."""

import os
import pathlib
import uuid

import pytest
import pytest_asyncio

APP_DIR = pathlib.Path(__file__).resolve().parent.parent

# Isolated DB per pytest process, BEFORE the app module is imported.
_TEST_DB = pathlib.Path(f"/tmp/bp-test-{uuid.uuid4().hex[:8]}.db")
os.environ["BRANDPROOF_DATABASE_URL"] = f"sqlite+aiosqlite:///{_TEST_DB}"
os.environ["BRANDPROOF_EMBEDDING_PROVIDER"] = "local"
os.environ["BRANDPROOF_JWT_SECRET"] = os.environ.get("BRANDPROOF_JWT_SECRET", "test-secret")

import httpx  # noqa: E402

EMAILS = {
    "creator": "priya@meridiancoffee.com",
    "reviewer": "ravi@meridiancoffee.com",
    "approver": "maya@meridiancoffee.com",
    "admin": "admin@brandproof.app",
}


@pytest_asyncio.fixture(scope="session")
async def client():
    """Seeded app served in-process via ASGI; startup runs once."""
    from app.main import app
    from app.db.database import dispose_engine

    async with app.router.lifespan_context(app):
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transport, base_url="http://test/api"
        ) as http:
            yield http
    await dispose_engine()


@pytest_asyncio.fixture()
async def tokens(client: httpx.AsyncClient) -> dict[str, str]:
    out = {}
    for name, email in EMAILS.items():
        resp = await client.post("/auth/login", json={"email": email})
        assert resp.status_code == 200
        out[name] = resp.json()["token"]
    return out
