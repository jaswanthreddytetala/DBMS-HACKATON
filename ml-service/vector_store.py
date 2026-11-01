import hashlib
import math
import re
import unicodedata
from collections import Counter
from typing import Any


VECTOR_DIMENSIONS = 384
WORD_PATTERN = re.compile(r"[^\W_]+", re.UNICODE)


def embed_text(text: str) -> list[float]:
    """Create a stable, lightweight hashed text vector for local semantic search."""
    normalized = unicodedata.normalize("NFKC", text).casefold()
    words = WORD_PATTERN.findall(normalized)
    if not words:
        return [0.0] * VECTOR_DIMENSIONS

    terms = words + [f"{left}_{right}" for left, right in zip(words, words[1:])]
    counts = Counter(terms)
    vector = [0.0] * VECTOR_DIMENSIONS

    for term, count in counts.items():
        digest = hashlib.blake2b(term.encode("utf-8"), digest_size=8).digest()
        bucket = int.from_bytes(digest[:4], "big") % VECTOR_DIMENSIONS
        sign = 1.0 if digest[4] & 1 else -1.0
        vector[bucket] += sign * (1.0 + math.log(count))

    magnitude = math.sqrt(sum(value * value for value in vector))
    if magnitude:
        vector = [value / magnitude for value in vector]
    return vector


def cosine_similarity(left: list[float], right: list[float]) -> float:
    if len(left) != len(right):
        raise ValueError("Vectors must have matching dimensions.")
    return sum(a * b for a, b in zip(left, right))


def search_documents(
    documents: list[dict[str, Any]],
    query: str,
    limit: int,
) -> list[dict[str, Any]]:
    query_vector = embed_text(query)
    ranked = []
    for document in documents:
        vector = document.get("embedding")
        if not isinstance(vector, list) or len(vector) != VECTOR_DIMENSIONS:
            continue
        score = cosine_similarity(query_vector, vector)
        if score > 0:
            ranked.append((score, document))

    ranked.sort(key=lambda result: result[0], reverse=True)
    return [
        {
            "id": str(document.get("id", "")),
            "title": document.get("title", ""),
            "content": document.get("content", ""),
            "metadata": document.get("metadata", {}),
            "score": round(score, 6),
        }
        for score, document in ranked[:limit]
    ]
