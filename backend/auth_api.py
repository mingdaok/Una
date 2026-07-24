"""公网认证路由及受保护路由的当前用户依赖。"""

from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel

from auth_service import AuthService, WS_TICKET_SECONDS


router = APIRouter(prefix="/api/auth", tags=["认证"])
auth_service = AuthService()


class CredentialsBody(BaseModel):
    username: str
    password: str


class RefreshBody(BaseModel):
    refresh_token: str


def get_current_user(authorization: Optional[str] = Header(default=None)) -> dict:
    scheme, _, token = (authorization or "").partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="缺少有效的访问令牌")
    user = auth_service.verify_access(token)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="访问令牌无效或已过期")
    return user


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(body: CredentialsBody):
    try:
        account = auth_service.register(body.username, body.password)
        return auth_service.issue_session(account["id"])
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error))


@router.post("/login")
def login(body: CredentialsBody):
    account = auth_service.authenticate(body.username, body.password)
    if not account:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户名或密码错误")
    return auth_service.issue_session(account["id"])


@router.post("/refresh")
def refresh(body: RefreshBody):
    session = auth_service.rotate_refresh(body.refresh_token)
    if not session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="刷新令牌无效或已过期")
    return session


@router.get("/me")
def current_profile(current_user: dict = Depends(get_current_user)):
    return current_user


@router.post("/ws-ticket")
def create_ws_ticket(current_user: dict = Depends(get_current_user)):
    return {
        "ticket": auth_service.create_ws_ticket(current_user["id"]),
        "expires_in": WS_TICKET_SECONDS,
    }
