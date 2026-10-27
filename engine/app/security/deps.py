"""FastAPI auth dependencies: resolve principal, enforce RBAC + tenant scope."""

from collections.abc import AsyncGenerator, Callable, Coroutine
from typing import Annotated, Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.contracts import Role
from app.db.database import get_session_factory
from app.db.models import User
from app.security.rbac import Permission, Principal
from app.security.tokens import TokenError, verify_token

_bearer = HTTPBearer(auto_error=False)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Fresh DB session per request — commits on success, rolls back on error."""
    factory = get_session_factory()
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except BaseException:
            await session.rollback()
            raise


async def get_principal(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Principal:
    """Decode the bearer token, re-check the user + role against the DB.

    The token is not trusted for roles beyond lookup convenience: the actual
    role is read from the users table every request, so a demoted user is
    demoted mid-session too.
    """
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error_code": "auth.missing_token", "message": "Sign in first."},
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = verify_token(credentials.credentials)
    except TokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error_code": "auth.invalid_token", "message": str(exc)},
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    result = await session.execute(
        select(User).where(
            User.id == payload["sub"], User.org_id == payload["org"]
        )
    )
    user = result.scalar_one_or_none()
    if user is None or user.email != payload["email"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error_code": "auth.user_unknown",
                    "message": "This session isn't valid anymore."},
        )

    return Principal(
        user_id=user.id,
        org_id=user.org_id,
        email=user.email,
        name=user.name,
        role=Role(user.role),
    )


def require_permission(
    permission: Permission,
) -> Callable[[Principal], Coroutine[Any, Any, Principal]]:
    """Dependency factory: 403 unless the principal holds the permission."""

    async def _dep(principal: Annotated[Principal, Depends(get_principal)]) -> Principal:
        principal.require(permission)
        return principal

    return _dep


CurrentUser = Annotated[Principal, Depends(get_principal)]
DbSession = Annotated[AsyncSession, Depends(get_session)]


def require_role(*roles: Role) -> Callable[[Principal], Coroutine[Any, Any, Principal]]:
    """Simpler role-gate for endpoints expressed in role vocabulary."""

    async def _dep(principal: Annotated[Principal, Depends(get_principal)]) -> Principal:
        if principal.role not in roles:
            allowed = ", ".join(r.value for r in roles)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"error_code": "rbac.role_denied",
                        "message": f"This action needs one of: {allowed}."},
            )
        return principal

    return _dep


__all__ = [
    "CurrentUser",
    "DbSession",
    "Permission",
    "Principal",
    "get_principal",
    "get_session",
    "require_permission",
    "require_role",
]
