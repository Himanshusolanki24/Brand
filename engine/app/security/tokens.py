"""JWT token issuance/verification (HS256 demo tokens)."""

import json
from typing import Any

import jwt

from app.contracts import Role
from app.settings import get_settings


def create_token(user_id: str, org_id: str, email: str, role: Role) -> str:
    settings = get_settings()
    import time

    payload: dict[str, Any] = {
        "sub": user_id,
        "org": org_id,
        "email": email,
        "role": role.value,
        "iat": int(time.time()),
        "exp": int(time.time()) + settings.jwt_ttl_minutes * 60,
    }
    return jwt.encode(
        payload,
        settings.jwt_secret.get_secret_value(),
        algorithm=settings.jwt_algorithm,
    )


class TokenError(Exception):
    """Raised when a token is missing, malformed, expired, or unknown."""


def verify_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    try:
        payload: dict[str, Any] = jwt.decode(
            token,
            settings.jwt_secret.get_secret_value(),
            algorithms=[settings.jwt_algorithm],
        )
    except jwt.ExpiredSignatureError as exc:
        raise TokenError("Token expired") from exc
    except jwt.InvalidTokenError as exc:
        raise TokenError("Invalid token") from exc

    required = ("sub", "org", "email", "role")
    if any(key not in payload for key in required):
        raise TokenError("Token payload incomplete")
    try:
        Role(payload["role"])
    except ValueError as exc:
        raise TokenError(f"Unknown role in token: {payload['role']}") from exc
    return payload


def decode_unverified(token: str) -> dict[str, Any] | None:
    """Best-effort display decode used by diagnostics; never for authz."""
    try:
        return dict(json.loads(json.dumps(jwt.decode(token, options={"verify_signature": False}))))
    except Exception:
        return None
