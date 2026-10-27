"""Hybrid retrieval over the org's embedded knowledge.

Dense score  — cosine between the query embedding and chunk embeddings.
Keyword score— IDF-weighted term overlap between the query and chunk text.

Fusion is a weighted blend (dense 0.6 / keyword 0.4), computed deterministically.
k is clamped to the configured 5–8 band. Everything filters on ``org_id``
first: another organisation's facts are unreachable by construction.

Postgres note: with BRANDPROOF_DATABASE_URL on pgvector the dense step runs
as ``ORDER BY embedding <=> $q`` server-side via the same interface; the
SQLite demo path does the math in-process because the corpus is small and
the determinism of in-process math is easier to demonstrate.
"""

import math
import re
from collections import Counter
from dataclasses import dataclass

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import KnowledgeChunk
from app.services.embeddings.providers import get_provider
from app.settings import get_settings


@dataclass(frozen=True)
class RetrievedPassage:
    """One retrieval hit, traceable to its chunk and source."""

    chunk_id: str
    source_type: str
    source_id: str
    ordinal: int
    text: str
    dense_score: float
    keyword_score: float
    combined_score: float


_TOKEN = re.compile(r"[a-z0-9][a-z0-9'’\-]*", re.IGNORECASE)
_STOPWORDS = {
    "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with",
    "is", "are", "it", "that", "this", "as", "at", "by", "be", "not", "no",
}


def _tokens(text: str) -> list[str]:
    return [t.lower() for t in _TOKEN.findall(text) if t.lower() not in _STOPWORDS]


class HybridRetriever:
    """Org-scoped hybrid search. Stateless apart from a per-model chunk cache."""

    def __init__(self) -> None:
        self._cache_org: str | None = None
        self._cache_model: str | None = None
        self._chunks: list[KnowledgeChunk] = []

    async def _load(self, session: AsyncSession, org_id: str) -> list[KnowledgeChunk]:
        provider = get_provider()
        if (
            self._cache_org == org_id
            and self._cache_model == provider.model_id
            and self._chunks
        ):
            return self._chunks
        rows = (await session.execute(
            select(KnowledgeChunk).where(KnowledgeChunk.org_id == org_id)
        )).scalars().all()
        # Only chunks embedded with the active provider participate; mixed
        # model corpora must never be compared cross-model.
        self._chunks = [c for c in rows if c.embedding_model == provider.model_id]
        self._cache_org = org_id
        self._cache_model = provider.model_id
        return self._chunks

    async def retrieve(
        self,
        session: AsyncSession,
        org_id: str,
        query: str,
        *,
        source_types: tuple[str, ...] = ("fact", "guideline", "term"),
        k: int | None = None,
    ) -> list[RetrievedPassage]:
        settings = get_settings()
        top_k = k if k is not None else settings.retrieval_k
        top_k = max(settings.retrieval_k_min, min(settings.retrieval_k_max, top_k))

        chunks = await self._load(session, org_id)
        if not chunks:
            return []

        provider = get_provider()
        query_vec = provider.embed_one(query)
        query_tokens = _tokens(query)

        # On Postgres the dense step runs server-side against the mirror
        # `embedding_vec` column (see migrations/migrations_pgvector.sql);
        # the SQLite demo path computes cosine in-process, which keeps the
        # determinism of the demo auditable line by line.
        dense_by_id = await _pg_dense_scores(session, org_id, provider.model_id, query_vec)

        # IDF over the current org corpus (deterministic given the corpus).
        doc_freq: Counter[str] = Counter()
        for chunk in chunks:
            doc_freq.update(set(_tokens(chunk.text)))
        n_docs = len(chunks)
        if source_types != ("fact", "guideline", "term"):
            corpus_for_idf = [c for c in chunks if c.source_type in source_types]
            doc_freq = Counter()
            for chunk in corpus_for_idf:
                doc_freq.update(set(_tokens(chunk.text)))
            n_docs = max(len(corpus_for_idf), 1)

        hits: list[RetrievedPassage] = []
        for chunk in chunks:
            if chunk.source_type not in source_types:
                continue
            if chunk.id in dense_by_id:
                dense = dense_by_id[chunk.id]
            else:
                dense = _cosine(query_vec, chunk.embedding)

            chunk_tokens = _tokens(chunk.text)
            if not chunk_tokens:
                keyword = 0.0
            else:
                score = 0.0
                for token in query_tokens:
                    tf = chunk_tokens.count(token)
                    if tf:
                        idf = math.log(1 + n_docs / (1 + doc_freq.get(token, 0)))
                        score += tf * idf
                keyword = score / (1 + score)  # squash to (0,1)

            combined = 0.6 * dense + 0.4 * keyword
            hits.append(RetrievedPassage(
                chunk_id=chunk.id,
                source_type=chunk.source_type,
                source_id=chunk.source_id,
                ordinal=chunk.ordinal,
                text=chunk.text,
                dense_score=round(dense, 4),
                keyword_score=round(keyword, 4),
                combined_score=round(combined, 4),
            ))

        hits.sort(key=lambda hit: hit.combined_score, reverse=True)
        return hits[:top_k]


def _cosine(a: list[float], b: list[float]) -> float:
    if len(a) != len(b) or not a:
        return 0.0
    numer = sum(x * y for x, y in zip(a, b, strict=True))
    den_a = math.sqrt(sum(x * x for x in a))
    den_b = math.sqrt(sum(y * y for y in b))
    if not den_a or not den_b:
        return 0.0
    return numer / (den_a * den_b)


async def _pg_dense_scores(
    session: AsyncSession,
    org_id: str,
    model_id: str,
    query_vec: list[float],
) -> dict[str, float]:
    """Server-side cosine via pgvector's <=> operator (Postgres only).

    ``<=>`` is cosine *distance*: similarity = 1 - distance. Chunks whose
    mirror column hasn't been populated fall back to the in-process path at
    the call site, so a half-migrated corpus still retrieves correctly.
    """
    if session.bind is None or session.bind.dialect.name != "postgresql":
        return {}
    literal = "[" + ",".join(f"{x:.9g}" for x in query_vec) + "]"
    stmt = await session.execute(
        text(
            "SELECT id, 1 - (embedding_vec <=> CAST(:qv AS vector)) AS dense "
            "FROM knowledge_chunks "
            "WHERE org_id = :org AND embedding_model = :model "
            "AND embedding_vec IS NOT NULL"
        ),
        {"qv": literal, "org": org_id, "model": model_id},
    )
    return {row.id: float(row.dense) for row in stmt}


# Shared singleton: the demo corpus fits comfortably in one process cache.
_retriever: HybridRetriever | None = None


def get_retriever() -> HybridRetriever:
    global _retriever
    if _retriever is None:
        _retriever = HybridRetriever()
    return _retriever


def invalidate_cache() -> None:
    """Drop the chunk cache after re-indexing."""
    global _retriever
    _retriever = None
