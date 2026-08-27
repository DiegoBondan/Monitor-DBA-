"""Leitura de atividade dos usuários registrada nas tabelas do monitor."""

from datetime import datetime, timedelta, timezone

import httpx

from app.core.config import get_settings
from app.models.monitor import UserActivity, UserActivityResponse

ACTIVE_WINDOW = timedelta(minutes=5)


async def get_user_activity() -> UserActivityResponse:
    """Lista perfis e indica quem teve atividade nos últimos cinco minutos."""
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return UserActivityResponse(
            active_count=0,
            inactive_count=0,
            users=[],
            max_connections=settings.max_connections,
            error="Configure SUPABASE_SERVICE_ROLE_KEY no backend para acompanhar usuários.",
        )

    headers = {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
    }
    try:
        async with httpx.AsyncClient(timeout=settings.monitor_timeout_seconds) as client:
            profiles_response, sessions_response = await client.get(
                f"{settings.supabase_url}/rest/v1/perfis",
                params={"select": "id,nome,role,ativo", "order": "criado_em.desc"},
                headers=headers,
            ), await client.get(
                f"{settings.supabase_url}/rest/v1/sessoes",
                params={"select": "usuario_id,ultimo_acesso,logout_em", "order": "ultimo_acesso.desc"},
                headers=headers,
            )
        profiles_response.raise_for_status()
        sessions_response.raise_for_status()
    except httpx.HTTPError as exc:
        return UserActivityResponse(active_count=0, inactive_count=0, users=[], max_connections=settings.max_connections, error=str(exc))

    latest_sessions: dict[str, dict] = {}
    for session in sessions_response.json():
        user_id = session.get("usuario_id")
        if user_id and user_id not in latest_sessions:
            latest_sessions[user_id] = session

    now = datetime.now(timezone.utc)
    users: list[UserActivity] = []
    for profile in profiles_response.json():
        session = latest_sessions.get(profile["id"])
        last_seen = _parse_datetime(session.get("ultimo_acesso")) if session else None
        is_active = bool(
            profile.get("ativo")
            and session
            and not session.get("logout_em")
            and last_seen
            and now - last_seen <= ACTIVE_WINDOW
        )
        users.append(
            UserActivity(
                id=profile["id"],
                name=profile.get("nome"),
                role=profile.get("role", "visualizador"),
                active=is_active,
                last_seen=last_seen,
            )
        )

    return UserActivityResponse(
        active_count=sum(user.active for user in users),
        inactive_count=sum(not user.active for user in users),
        max_connections=settings.max_connections,
        users=users,
    )


def _parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))
