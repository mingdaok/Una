"""运行时配置的唯一入口。

部署时通过环境变量覆盖本地默认值；测试可以在导入业务模块前指向临时目录。
"""

from dataclasses import dataclass
import os


@dataclass(frozen=True)
class Settings:
    database_path: str
    chroma_path: str
    jwt_secret: str
    access_token_seconds: int
    refresh_token_days: int
    environment: str


def load_settings() -> Settings:
    return Settings(
        database_path=os.getenv("UNA_DB_PATH", ""),
        chroma_path=os.getenv("UNA_CHROMA_PATH", ""),
        jwt_secret=os.getenv("UNA_JWT_SECRET", "una-local-development-secret-change-before-public-deploy"),
        access_token_seconds=int(os.getenv("UNA_ACCESS_TOKEN_SECONDS", "900")),
        refresh_token_days=int(os.getenv("UNA_REFRESH_TOKEN_DAYS", "30")),
        environment=os.getenv("UNA_ENV", "development").lower(),
    )


settings = load_settings()
