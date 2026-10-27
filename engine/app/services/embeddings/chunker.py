"""Chunking — guideline/fact/term text → retrieval chunks.

Blueprint: clauses chunked to roughly 200–400 tokens with overlap, split on
sentence boundaries first. Whitespace-word tokens approximate tokens; the
engine's texts are short-form brand language, which makes that a fair proxy
and keeps the whole layer dependency-free.
"""

from dataclasses import dataclass

from app.settings import get_settings


@dataclass(frozen=True)
class ChunkInput:
    source_type: str   # guideline | fact | term | document
    source_id: str
    ordinal: int
    text: str
    token_count: int


def _split_sentences(text: str) -> list[str]:
    import re

    return [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]


def chunk_text(text: str, source_type: str, source_id: str) -> list[ChunkInput]:
    settings = get_settings()
    target = settings.chunk_target_tokens   # ~320 words ≈ 200–400 tok
    overlap = settings.chunk_overlap_tokens

    sentences = _split_sentences(text)
    if not sentences and text.strip():
        sentences = [text.strip()]

    chunks: list[list[str]] = []
    current: list[str] = []
    current_len = 0

    for sentence in sentences:
        words = sentence.split()
        # A sentence longer than the target becomes its own oversized chunk
        # (hard split on words would shred meant-together claims).
        if current_len + len(words) > target and current:
            chunks.append(current)
            # Keep the tail as overlap context for the next chunk.
            tail: list[str] = []
            tail_len = 0
            while current and tail_len < overlap:
                popped = current.pop()
                tail_words = popped.split()
                tail = tail_words + tail
                tail_len += len(tail_words)
            current = tail
            current_len = tail_len
        current.append(sentence)
        current_len += len(words)

    if current:
        chunks.append(current)

    return [
        ChunkInput(
            source_type=source_type,
            source_id=source_id,
            ordinal=ordinal,
            text=" ".join(chunk_words),
            token_count=sum(len(s.split()) for s in chunk_words),
        )
        for ordinal, chunk_words in enumerate(chunks)
    ]
