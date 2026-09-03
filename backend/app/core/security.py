"""Proteção simples por chave de API para os endpoints que expõem dados de usuários."""

from fastapi import Header, HTTPException, status

from app.core.config import get_settings


def require_api_key(x_api_key: str | None = Header(default=None)) -> None:
    settings = get_settings()
    if not settings.dashboard_api_key or x_api_key != settings.dashboard_api_key:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Chave de API ausente ou inválida.")
