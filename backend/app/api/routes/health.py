from fastapi import APIRouter

from app.models.monitor import HealthResponse
from app.services.supabase_monitor import check_supabase

router = APIRouter(tags=["Monitoramento"])


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return await check_supabase()
