"""Auth endpoints — demo login, session, machine-readable health."""


from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.contracts import APIModel, LoginRequest, Role, User
from app.db.models import User as UserRow
from app.security.deps import CurrentUser, DbSession
from app.security.tokens import create_token

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginResponse(APIModel):
    token: str
    user: User
    must_use_email: str | None = None


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, session: DbSession) -> LoginResponse:
    """Passwordless demo login.

    Seeded identities (mirrored on the desk's sign-in screen):
      priya@meridiancoffee.com  (creator)
      ravi@meridiancoffee.com   (reviewer)
      maya@meridiancoffee.com   (approver)
      admin@brandproof.app      (admin)
    A JWT issues server-side; the role in the token is the row's role, never
    a client claim. Production swaps this for Supabase email-OTP.
    """
    email = request.email.strip().lower()
    row = (await session.execute(
        select(UserRow).where(UserRow.email == email)
    )).scalar_one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error_code": "auth.unknown_email",
                    "message": "No seat with that email. Try one of the demo identities."},
        )
    if request.role is not None and request.role != row.role:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error_code": "auth.role_mismatch",
                "message": f"{email} is the {row.role}, not a {request.role.value}.",
                "actual_role": row.role,
            },
        )

    import time

    token = create_token(row.id, row.org_id, row.email, Role(row.role))
    _ = time
    user = User(
        id=row.id, email=row.email, name=row.name, role=row.role, org_id=row.org_id
    )
    return LoginResponse(token=token, user=user)


@router.get("/me", response_model=User)
async def me(principal: CurrentUser) -> User:
    return User(
        id=principal.user_id, email=principal.email, name=principal.name,
        role=principal.role, org_id=principal.org_id,
    )


@router.get("/health", include_in_schema=False)
async def health_public() -> dict[str, object]:
    from app.main import engine_health
    return engine_health()
