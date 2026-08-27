"""Métricas em memória das verificações executadas pelo monitor."""

from collections import deque
from datetime import datetime, timezone

from app.models.monitor import DashboardMetricsResponse, HealthResponse, HistoryPoint
from app.services.monitoring_store import load_monitoring_history

MAX_HISTORY_POINTS = 720
_checks: deque[HistoryPoint] = deque(maxlen=MAX_HISTORY_POINTS)


def record_check(result: HealthResponse) -> None:
    """Registra uma verificação para o histórico da sessão atual da API."""
    _checks.append(
        HistoryPoint(
            checked_at=datetime.now(timezone.utc),
            status=result.status,
            latency_ms=result.latency_ms,
            http_status=result.http_status,
        )
    )


def _dashboard_metrics(checks: list[HistoryPoint]) -> DashboardMetricsResponse:
    """Calcula contadores e disponibilidade a partir das verificações coletadas."""
    valid_checks = [item for item in checks if item.status != "not_configured"]
    successful = [item for item in valid_checks if item.status == "online"]
    failures = [item for item in valid_checks if item.status in {"offline", "degraded"}]
    latency_values = [item.latency_ms for item in successful if item.latency_ms is not None]
    last = checks[-1] if checks else None

    return DashboardMetricsResponse(
        status=last.status if last else "not_configured",
        latency_ms=last.latency_ms if last else None,
        average_latency_ms=round(sum(latency_values) / len(latency_values), 2) if latency_values else None,
        http_status=last.http_status if last else None,
        total_requests=len(valid_checks),
        successful_requests=len(successful),
        error_count=len(failures),
        availability_percent=round((len(successful) / len(valid_checks)) * 100, 2) if valid_checks else 0,
        last_checked_at=last.checked_at if last else None,
        history=checks,
    )


async def dashboard_metrics() -> DashboardMetricsResponse:
    """Prioriza o histórico persistido para manter os dados entre reinícios."""
    persisted_checks = await load_monitoring_history()
    return _dashboard_metrics(persisted_checks or list(_checks))
