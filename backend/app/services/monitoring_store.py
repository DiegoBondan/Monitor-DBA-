"""Persistência do histórico de monitoramento no Supabase."""

import httpx

from app.core.config import get_settings
from app.models.monitor import HealthResponse, HistoryPoint


def _headers() -> dict[str, str]:
    key = get_settings().supabase_service_role_key
    return {"apikey": key, "Authorization": f"Bearer {key}"}


async def save_monitoring_result(result: HealthResponse) -> None:
    """Salva uma coleta sem deixar falhas de persistência interromperem o monitor."""
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key or result.status == "not_configured":
        return
    payload = {
        "status": result.status,
        "latencia_ms": result.latency_ms,
        "http_status": result.http_status,
        "erro": result.error,
    }
    try:
        async with httpx.AsyncClient(timeout=settings.monitor_timeout_seconds) as client:
            response = await client.post(
                f"{settings.supabase_url}/rest/v1/monitoramento",
                headers={**_headers(), "Prefer": "return=minimal"},
                json=payload,
            )
        response.raise_for_status()
    except httpx.HTTPError:
        return


async def load_monitoring_history(limit: int = 720) -> list[HistoryPoint]:
    """Lê o histórico persistido; retorna vazio quando o Supabase não foi configurado."""
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return []
    try:
        async with httpx.AsyncClient(timeout=settings.monitor_timeout_seconds) as client:
            response = await client.get(
                f"{settings.supabase_url}/rest/v1/monitoramento",
                params={"select": "data_hora,status,latencia_ms,http_status", "order": "data_hora.desc", "limit": str(limit)},
                headers=_headers(),
            )
        response.raise_for_status()
    except httpx.HTTPError:
        return []
    return [
        HistoryPoint(
            checked_at=item["data_hora"],
            status=item["status"],
            latency_ms=item.get("latencia_ms"),
            http_status=item.get("http_status"),
        )
        for item in reversed(response.json())
    ]
