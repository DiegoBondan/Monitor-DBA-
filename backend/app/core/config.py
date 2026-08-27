"""Leitura das configurações do ambiente."""

import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    """Configurações necessárias para consultar um projeto Supabase."""

    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    monitor_timeout_seconds: float
    monitor_interval_seconds: float
    max_connections: int

    @property
    def is_supabase_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_anon_key)


def get_settings() -> Settings:
    """Monta as configurações sem expor segredos no código-fonte."""
    return Settings(
        supabase_url=os.getenv("SUPABASE_URL", "").rstrip("/"),
        supabase_anon_key=os.getenv("SUPABASE_ANON_KEY", ""),
        supabase_service_role_key=os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
        monitor_timeout_seconds=float(os.getenv("MONITOR_TIMEOUT_SECONDS", "5")),
        monitor_interval_seconds=float(os.getenv("MONITOR_INTERVAL_SECONDS", "30")),
        max_connections=int(os.getenv("SUPABASE_MAX_CONNECTIONS", "100")),
    )
