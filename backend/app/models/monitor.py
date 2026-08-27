"""Modelos de resposta da API de monitoramento."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class HealthResponse(BaseModel):
    service: str = "supabase"
    status: Literal["online", "offline", "degraded", "not_configured"]
    http_status: int | None = None
    database_status: Literal["online", "offline", "not_configured"] = "not_configured"
    latency_ms: float | None = None
    error: str | None = None


class HistoryPoint(BaseModel):
    checked_at: datetime
    status: Literal["online", "offline", "degraded", "not_configured"]
    latency_ms: float | None = None
    http_status: int | None = None


class DashboardMetricsResponse(BaseModel):
    status: Literal["online", "offline", "degraded", "not_configured"]
    latency_ms: float | None = None
    average_latency_ms: float | None = None
    http_status: int | None = None
    total_requests: int
    successful_requests: int
    error_count: int
    availability_percent: float
    last_checked_at: datetime | None = None
    history: list[HistoryPoint]


class UserActivity(BaseModel):
    id: str
    name: str | None = None
    role: str
    active: bool
    last_seen: datetime | None = None


class UserActivityResponse(BaseModel):
    active_count: int
    inactive_count: int
    max_connections: int = 100
    users: list[UserActivity]
    error: str | None = None
