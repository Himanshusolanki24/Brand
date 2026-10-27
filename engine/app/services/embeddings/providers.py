"""Embedding providers.

Two implementations sit behind one protocol:

- ``HashingEmbedder``  — deterministic char-trigram → 384-dim, L2-normalised.
  Zero network, zero keys, bit-identical across runs and machines. This is
  the demo default and the honest fallback when no AI provider is configured.
- ``OpenAIEmbedder``   — ``text-embedding-3-small`` for the production path
  (configured via settings when BRANDPROOF_EMBEDDING_PROVIDER=openai and a
  key is present). Zero-retention annotations are sent with the request.

Model identity is stored per chunk so future re-embedding migrations know
which vectors are stale.
"""

import hashlib
import math
import re
from dataclasses import dataclass
from typing import TYPE_CHECKING, Protocol

from app.settings import get_settings

if TYPE_CHECKING:
    from openai import OpenAI  # optional dependency, imported lazily

_DIM = 384
_TRIGRAM = re.compile(r"[a-z0-9]+", re.IGNORECASE)


class EmbeddingProvider(Protocol):
    """Interface every embedder satisfies."""

    @property
    def model_id(self) -> str: ...

    def embed(self, texts: list[str]) -> list[list[float]]: ...

    def embed_one(self, text: str) -> list[float]: ...


@dataclass(frozen=True)
class HashingEmbedder:
    """Deterministic feature-hashing embedder.

    Not a semantic embedder — it is an *honest* deterministic embedding:
    identical text always yields an identical vector, similar shared trigrams
    move vectors closer, and it works with no API key. All retrieval math
    (cosine + fusion) runs identically on either provider.
    """

    @property
    def model_id(self) -> str:
        return "hash-trigram-384@1"

    def _vector(self, text: str) -> list[float]:
        vec = [0.0] * _DIM
        words = _TRIGRAM.findall(text.lower())
        for word in words:
            padded = f"␂{word}␃"
            for i in range(len(padded) - 2):
                gram = padded[i:i + 3]
                bucket = int(hashlib.sha256(gram.encode()).hexdigest()[:8], 16) % _DIM
                sign = 1.0 if int(hashlib.md5(gram.encode()).hexdigest()[:2], 16) % 2 == 0 else -1.0
                vec[bucket] += sign
        norm = math.sqrt(sum(v * v for v in vec)) or 1.0
        return [round(v / norm, 6) for v in vec]

    def embed(self, texts: list[str]) -> list[list[float]]:
        return [self._vector(text) for text in texts]

    def embed_one(self, text: str) -> list[float]:
        return self._vector(text)


@dataclass(frozen=True)
class OpenAIEmbedder:
    """text-embedding-3-small via the OpenAI embeddings endpoint."""

    model: str = "text-embedding-3-small"

    @property
    def model_id(self) -> str:
        return self.model

    def _client(self) -> "OpenAI":
        from openai import OpenAI  # optional dependency, imported lazily

        settings = get_settings()
        key = settings.openai_api_key.get_secret_value() if settings.openai_api_key else ""
        return OpenAI(api_key=key)

    def embed(self, texts: list[str]) -> list[list[float]]:  # pragma: no cover
        client = self._client()
        resp = client.embeddings.create(
            input=texts, model=self.model, extra_query={"retention": "zero"}
        )
        return [list(d.embedding) for d in resp.data]

    def embed_one(self, text: str) -> list[float]:  # pragma: no cover
        return self.embed([text])[0]


def get_provider() -> HashingEmbedder | OpenAIEmbedder:
    """Select provider from settings; fall back to hashing when unconfigured."""
    settings = get_settings()
    if settings.embedding_provider == "openai" and settings.openai_api_key:
        return OpenAIEmbedder(model=settings.openai_embedding_model)
    return HashingEmbedder()


def cosine(a: list[float], b: list[float]) -> float:
    """Cosine similarity with a small, deliberate zero-vector guard."""
    if len(a) != len(b) or not a:
        return 0.0
    dots = sum(x * y for x, y in zip(a, b, strict=True))
    na = math.sqrt(sum(x * x for x in a)) or 1.0
    nb = math.sqrt(sum(y * y for y in b)) or 1.0
    return dots / (na * nb)
