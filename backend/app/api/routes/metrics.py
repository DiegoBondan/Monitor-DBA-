from fastapi import APIRouter, Depends

from app.core.security import require_api_key
from app.models.monitor import DashboardMetricsResponse
from app.services.metrics import dashboard_metrics

router = APIRouter(tags=["Monitoramento"], dependencies=[Depends(require_api_key)])


@router.get("/metrics", response_model=DashboardMetricsResponse)
async def metrics() -> DashboardMetricsResponse:
    return await dashboard_metrics()
