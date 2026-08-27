"""Consulta leve de disponibilidade de um projeto Supabase."""

import time

import httpx

from app.core.config import get_settings
from app.models.monitor import HealthResponse
from app.services.metrics import record_check


async def check_supabase() -> HealthResponse:
    """Consulta um endpoint público de configuração sem usar service_role key."""
    settings = get_settings()
    if not settings.is_supabase_configured:
        result = HealthResponse(
            status="not_configured",
            database_status="not_configured",
            error="Configure SUPABASE_URL e SUPABASE_ANON_KEY no arquivo .env.",
        )
        record_check(result)
        return result

    started = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=settings.monitor_timeout_seconds) as client:
            response, database_response = await client.get(
                f"{settings.supabase_url}/auth/v1/settings",
                headers={"apikey": settings.supabase_anon_key},
            ), await client.get(
                f"{settings.supabase_url}/rest/v1/",
                headers={"apikey": settings.supabase_anon_key},
            )
        latency_ms = round((time.perf_counter() - started) * 1000, 2)
        database_status = "online" if database_response.is_success else "offline"
        result = HealthResponse(
            status="online" if response.is_success and database_response.is_success else "degraded",
            http_status=response.status_code,
            database_status=database_status,
            latency_ms=latency_ms,
            error=None if response.is_success and database_response.is_success else (response.text if not response.is_success else database_response.text)[:300],
        )
        record_check(result)
        return result
    except httpx.RequestError as exc:
        result = HealthResponse(
            status="offline",
            database_status="offline",
            latency_ms=round((time.perf_counter() - started) * 1000, 2),
            error=str(exc),
        )
        record_check(result)
        return result
