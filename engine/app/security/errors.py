"""RFC 7807 problem details — one error vocabulary for the whole API."""

from fastapi.responses import JSONResponse


class APIProblemError(Exception):
    """Raise anywhere in app code to produce an application/problem+json.

    ``type`` is a stable documented URI; ``detail`` is written for humans
    reading the desk, not for logs.
    """

    def __init__(
        self,
        status_code: int,
        type_uri: str,
        title: str,
        detail: str,
        extra: dict[str, object] | None = None,
    ) -> None:
        self.status_code = status_code
        self.type_uri = type_uri
        self.title = title
        self.detail = detail
        self.extra = extra or {}
        super().__init__(detail)


def problem_response(exc: APIProblemError) -> JSONResponse:
    body = {
        "type": exc.type_uri,
        "title": exc.title,
        "status": exc.status_code,
        "detail": exc.detail,
        **exc.extra,
    }
    return JSONResponse(
        status_code=exc.status_code,
        media_type="application/problem+json",
        content=body,
    )
