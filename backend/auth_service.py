"""UNA 公网账号、访问令牌与刷新会话服务。"""

from __future__ import annotations

import datetime as dt
import hashlib
import re
import secrets
import threading
import time
import uuid

import jwt
from pwdlib import PasswordHash

import database
from settings import settings


USERNAME_PATTERN = re.compile(r"^[a-z0-9_]{3,32}$")
JWT_ISSUER = "una"
WS_TICKET_SECONDS = 60


class AuthService:
    def __init__(self):
        if settings.environment == "production" and settings.jwt_secret.startswith("una-local-"):
            raise RuntimeError("生产环境必须设置 UNA_JWT_SECRET")
        self.password_hash = PasswordHash.recommended()
        self._ws_tickets = {}
        self._ws_tickets_lock = threading.Lock()

    @staticmethod
    def _normalize_username(username: str) -> str:
        return username.strip().lower()

    @staticmethod
    def _public_account(account: dict) -> dict:
        return {"id": account["id"], "username": account["username"]}

    def register(self, username: str, password: str) -> dict:
        normalized_username = self._normalize_username(username)
        if not USERNAME_PATTERN.fullmatch(normalized_username):
            raise ValueError("用户名必须为 3 至 32 位小写字母、数字或下划线")
        if len(password) < 8:
            raise ValueError("密码至少需要 8 位")

        account = database.create_app_user(
            str(uuid.uuid4()),
            normalized_username,
            self.password_hash.hash(password),
        )
        if not account:
            raise ValueError("用户名已被使用")
        return self._public_account(account)

    def migrate_legacy_account(self, username: str, password: str) -> dict:
        """将旧 users 表账号迁移为同 ID 的新版认证账号。"""
        normalized_username = self._normalize_username(username)
        if not USERNAME_PATTERN.fullmatch(normalized_username):
            raise ValueError("用户名必须为 3 至 32 位小写字母、数字或下划线")
        if len(password) < 8:
            raise ValueError("密码至少需要 8 位")

        legacy_account = database.get_legacy_user_by_username(normalized_username)
        if not legacy_account:
            raise ValueError("旧版账号不存在")

        existing_account = database.get_app_user_by_username(normalized_username)
        if existing_account:
            if existing_account["id"] != normalized_username:
                raise ValueError("同名新版账号已存在，不能安全迁移旧数据")
            return self._public_account(existing_account)

        account = database.create_app_user(
            normalized_username,
            normalized_username,
            self.password_hash.hash(password),
        )
        if not account:
            raise ValueError("旧版账号迁移失败")
        return self._public_account(account)

    def authenticate(self, username: str, password: str) -> dict | None:
        account = database.get_app_user_by_username(self._normalize_username(username))
        if not account or not account["is_active"]:
            return None
        try:
            if not self.password_hash.verify(password, account["password_hash"]):
                return None
        except ValueError:
            return None
        return self._public_account(account)

    def issue_session(self, user_id: str) -> dict:
        account = database.get_app_user_by_id(user_id)
        if not account or not account["is_active"]:
            raise ValueError("账号不存在或已停用")

        refresh_token = secrets.token_urlsafe(48)
        expires_at = dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=settings.refresh_token_days)
        database.create_refresh_session(
            str(uuid.uuid4()),
            user_id,
            self._hash_refresh_token(refresh_token),
            expires_at.isoformat(),
        )
        return {
            "access_token": self._encode_access(user_id),
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": settings.access_token_seconds,
            "user": self._public_account(account),
        }

    def rotate_refresh(self, refresh_token: str) -> dict | None:
        if not refresh_token:
            return None
        now = dt.datetime.now(dt.timezone.utc).isoformat()
        user_id = database.consume_refresh_session(
            self._hash_refresh_token(refresh_token),
            now,
        )
        if not user_id:
            return None
        try:
            return self.issue_session(user_id)
        except ValueError:
            return None

    def verify_access(self, token: str) -> dict | None:
        if not token:
            return None
        try:
            payload = jwt.decode(
                token,
                settings.jwt_secret,
                algorithms=["HS256"],
                issuer=JWT_ISSUER,
            )
        except jwt.PyJWTError:
            return None
        if payload.get("type") != "access" or not payload.get("sub"):
            return None
        account = database.get_app_user_by_id(payload["sub"])
        if not account or not account["is_active"]:
            return None
        return self._public_account(account)

    def create_ws_ticket(self, user_id: str) -> str:
        account = database.get_app_user_by_id(user_id)
        if not account or not account["is_active"]:
            raise ValueError("账号不存在或已停用")
        ticket = secrets.token_urlsafe(32)
        expires_at = time.time() + WS_TICKET_SECONDS
        with self._ws_tickets_lock:
            now = time.time()
            self._ws_tickets = {
                value: record
                for value, record in self._ws_tickets.items()
                if record[1] > now
            }
            self._ws_tickets[ticket] = (user_id, expires_at)
        return ticket

    def consume_ws_ticket(self, ticket: str) -> str | None:
        if not ticket:
            return None
        with self._ws_tickets_lock:
            record = self._ws_tickets.pop(ticket, None)
        if not record or record[1] <= time.time():
            return None
        return record[0]

    @staticmethod
    def _hash_refresh_token(refresh_token: str) -> str:
        return hashlib.sha256(refresh_token.encode("utf-8")).hexdigest()

    @staticmethod
    def _now_timestamp() -> int:
        return int(dt.datetime.now(dt.timezone.utc).timestamp())

    def _encode_access(self, user_id: str) -> str:
        now = self._now_timestamp()
        return jwt.encode(
            {
                "sub": user_id,
                "type": "access",
                "iss": JWT_ISSUER,
                "iat": now,
                "exp": now + settings.access_token_seconds,
            },
            settings.jwt_secret,
            algorithm="HS256",
        )
