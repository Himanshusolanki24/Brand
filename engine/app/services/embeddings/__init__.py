"""Org knowledge indexer — sources → chunks → embeddings → storage.

Re-running is idempotent per source: chunks are replaced wholesale for the
org (facts/rules/terms are curated sets, never appended blindly). The model
id is recorded on every chunk so a provider switch surfaces as a re-index,
never as silently incompatible vectors.
"""

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import GuidelineSection, KnowledgeChunk, ProofFact, ProofTerm
from app.services.embeddings.chunker import ChunkInput, chunk_text
from app.services.embeddings.providers import get_provider


def _chunk_id(org_id: str, chunk: ChunkInput) -> str:
    return f"kc-{org_id[:3]}-{chunk.source_type[:3]}-{chunk.source_id[:10]}-{chunk.ordinal}"


async def index_org_knowledge(session: AsyncSession, org_id: str) -> int:
    """(Re)index guidelines, facts, and terms for an org; returns chunk count.

    With the deterministic embedder the output is identical on every run; the
    OpenAI provider costs tokens, so indexing runs on seed/reindex/ingest
    calls only, never per request.
    """
    provider = get_provider()
    inputs: list[ChunkInput] = []

    rules = (await session.execute(
        select(GuidelineSection).where(GuidelineSection.org_id == org_id)
    )).scalars().all()
    facts = (await session.execute(
        select(ProofFact).where(ProofFact.org_id == org_id)
    )).scalars().all()
    terms = (await session.execute(
        select(ProofTerm).where(ProofTerm.org_id == org_id)
    )).scalars().all()

    for rule in rules:
        composed = f"{rule.number} {rule.label}: {rule.text}"
        inputs.extend(chunk_text(composed, "guideline", rule.id))
    for fact in facts:
        composed = f"{fact.claim} (verified {fact.verified}, source: {fact.source})"
        inputs.extend(chunk_text(composed, "fact", fact.id))
    for term in terms:
        composed = f"{term.term}: {term.definition}"
        inputs.extend(chunk_text(composed, "term", term.id))

    await session.execute(delete(KnowledgeChunk).where(KnowledgeChunk.org_id == org_id))

    vectors = provider.embed([chunk.text for chunk in inputs]) if inputs else []
    for chunk_input, vector in zip(inputs, vectors, strict=True):
        session.add(
            KnowledgeChunk(
                id=_chunk_id(org_id, chunk_input),
                org_id=org_id,
                source_type=chunk_input.source_type,
                source_id=chunk_input.source_id,
                ordinal=chunk_input.ordinal,
                text=chunk_input.text,
                token_count=chunk_input.token_count,
                embedding=vector,
                embedding_model=provider.model_id,
            )
        )
    return len(inputs)


async def org_chunk_count(session: AsyncSession, org_id: str) -> int:
    stmt = select(KnowledgeChunk.id).where(KnowledgeChunk.org_id == org_id)
    rows = (await session.execute(stmt)).scalars().all()
    return len(rows)
