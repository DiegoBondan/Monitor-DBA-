"""Consulta leve de disponibilidade de um projeto Supabase."""

import time

import httpx

from app.core.config import get_settings
from app.models.monitor import HealthResponse


async def check_supabase() -> HealthResponse:
    """Consulta um endpoint público de configuração sem usar service_role key."""
    settings = get_settings()
    if not settings.is_supabase_configured:
        return HealthResponse(
            status="not_configured",
            error="Configure SUPABASE_URL e SUPABASE_ANON_KEY no arquivo .env.",
        )

    started = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=settings.monitor_timeout_seconds) as client:
            response = await client.get(
                f"{settings.supabase_url}/auth/v1/settings",
                headers={"apikey": settings.supabase_anon_key},
            )
        latency_ms = round((time.perf_counter() - started) * 1000, 2)
        return HealthResponse(
            status="online" if response.is_success else "degraded",
            http_status=response.status_code,
            latency_ms=latency_ms,
            error=None if response.is_success else response.text[:300],
        )
    except httpx.RequestError as exc:
        return HealthResponse(
            status="offline",
            latency_ms=round((time.perf_counter() - started) * 1000, 2),
            error=str(exc),
        )
