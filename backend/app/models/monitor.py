"""Modelos de resposta da API de monitoramento."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class HealthResponse(BaseModel):
    service: str = "supabase"
    status: Literal["online", "offline", "degraded", "not_configured"]
    http_status: int | None = None
    latency_ms: float | None = None
    error: str | None = None


class UserActivity(BaseModel):
    id: str
    name: str | None = None
    role: str
    active: bool
    last_seen: datetime | None = None


class UserActivityResponse(BaseModel):
    active_count: int
    inactive_count: int
    users: list[UserActivity]
    error: str | None = None
