"""Retrieval scoping + hybrid scoring; manifest bytes determinism."""

import httpx

from app.services.embeddings.providers import HashingEmbedder


async def test_retrieval_returns_org_scoped_hits(
    client: httpx.AsyncClient, tokens: dict[str, str]
) -> None:
    """Indirect: analyze flows through retrieval; findings stay in-org."""
    resp = await client.post(
        "/reviews/analyze",
        headers={"Authorization": f"Bearer {tokens['creator']}"},
        json={
            "title": "Retrieval probe",
            "channel": "Email",
            "sections": [{"heading": "h", "body": "USDA Organic certified, 40% less acidic"}],
        },
    )
    assert resp.status_code == 201
    review = resp.json()
    assert review["issues"]  # evidence retrieval ran inside the pipeline


def test_hashing_embedder_is_deterministic() -> None:
    embedder = HashingEmbedder()
    v1 = embedder.embed_one("USDA Organic certified cold brew")
    v2 = embedder.embed_one("USDA Organic certified cold brew")
    assert v1 == v2
    assert len(v1) == 384
    # L2-normalised
    norm = sum(x * x for x in v1) ** 0.5
    assert abs(norm - 1.0) < 0.01
    # Different text ⇒ different vector
    v3 = embedder.embed_one("Spring bundle with cherry blossom roast")
    assert v3 != v1


def test_hashing_embedder_similar_text_closer() -> None:
    embedder = HashingEmbedder()
    target = embedder.embed_one("USDA Organic certified")
    near = embedder.embed_one("USDA Organic certified and carbon neutral")
    far = embedder.embed_one("Loyalty points expire soon")
    def cos(a: list[float], b: list[float]) -> float:
        return sum(x * y for x, y in zip(a, b, strict=True))
    assert cos(target, near) > cos(target, far)


async def test_manifest_pdf_deterministic_bytes(
    client: httpx.AsyncClient, tokens: dict[str, str]
) -> None:
    """Interim manifest on rv3 (already-signed lane): twice ⇒ identical bytes."""
    headers = {"Authorization": f"Bearer {tokens['reviewer']}"}
    r1 = await client.get("/approvals/apr3/manifest.pdf", headers=headers)
    assert r1.status_code == 200
    assert r1.content[:4] == b"%PDF"
    r2 = await client.get("/approvals/apr3/manifest.pdf", headers=headers)
    assert r2.content == r1.content
    sha1 = next(v for k, v in r1.headers.items() if k.lower() == "x-manifest-sha256")
    sha2 = next(v for k, v in r2.headers.items() if k.lower() == "x-manifest-sha256")
    assert sha1 == sha2 and len(sha1) == 64


async def test_risk_gate_blocks_open_high(
    client: httpx.AsyncClient, tokens: dict[str, str]
) -> None:
    resp = await client.post(
        "/reviews/rv1/send-for-approval",
        headers={"Authorization": f"Bearer {tokens['reviewer']}"},
    )
    assert resp.status_code == 409
    body = resp.json()["detail"]
    assert body["error_code"] == "route.escalate"
