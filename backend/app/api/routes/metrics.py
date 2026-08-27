from fastapi import APIRouter

from app.models.monitor import DashboardMetricsResponse
from app.services.metrics import dashboard_metrics

router = APIRouter(tags=["Monitoramento"])


@router.get("/metrics", response_model=DashboardMetricsResponse)
async def metrics() -> DashboardMetricsResponse:
    return await dashboard_metrics()
