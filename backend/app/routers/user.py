from fastapi import APIRouter, Depends
from app.models.user import User
from app.schemas.user import UserOut, UserListOut
from app.core.security import get_current_user
from app.core.database import get_db

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me", response_model=UserOut)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/", response_model=list[UserListOut])
def list_users(
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    return db.query(User).filter(User.id != current_user.id, User.is_verified == True).all()