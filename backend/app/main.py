import asyncio
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes.health import router as health_router
from app.api.routes.metrics import router as metrics_router
from app.api.routes.users import router as users_router
from app.core.config import get_settings
from app.services.monitoring_store import save_monitoring_result
from app.services.supabase_monitor import check_supabase


async def automatic_checks() -> None:
    while True:
        result = await check_supabase()
        await save_monitoring_result(result)
        await asyncio.sleep(max(get_settings().monitor_interval_seconds, 5))


@asynccontextmanager
async def lifespan(_: FastAPI):
    task = asyncio.create_task(automatic_checks())
    yield
    task.cancel()
    with suppress(asyncio.CancelledError):
        await task

app = FastAPI(
    title="Supabase Monitor",
    version="0.1.0",
    description="API inicial para monitoramento do Supabase.",
    lifespan=lifespan,
)

# Permite que o dashboard local consulte a API durante o desenvolvimento.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
    ],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api")
app.include_router(metrics_router, prefix="/api")
app.include_router(users_router, prefix="/api")


@app.get("/")
def root():
    return {
        "project": "Supabase Monitor",
        "status": "online",
        "docs": "/docs",
    }
