from fastapi import APIRouter, Depends

from app.core.security import require_api_key
from app.models.monitor import UserActivityResponse
from app.services.user_activity import get_user_activity

router = APIRouter(tags=["Usuários"], dependencies=[Depends(require_api_key)])


@router.get("/users/activity", response_model=UserActivityResponse)
async def user_activity() -> UserActivityResponse:
    return await get_user_activity()
