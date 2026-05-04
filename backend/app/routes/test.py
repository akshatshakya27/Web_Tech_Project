from fastapi import APIRouter, Depends
from app.middleware.dependencies import get_current_user

router = APIRouter(prefix="/api/test", tags=["Test"])

@router.get("/protected")
def protected_route(current_user=Depends(get_current_user)):
    return {
        "message": "Protected route accessed",
        "user": current_user["email"]
    }