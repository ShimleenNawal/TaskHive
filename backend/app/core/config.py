from pydantic_settings import BaseSettings
from pydantic import SecretStr

class Settings(BaseSettings):
    DATABASE_URL: str
    TEST_DATABASE_URL: str
    SECRET_KEY: SecretStr
    BACKEND_CORS_ORIGINS: list[str]
    FRONTEND_URL: str
    MAIL_SERVER: str
    MAIL_PORT: int
    ALGORITHM: str
    TOKEN_EXPIRE_HOURS: int
    VERIFICATION_TOKEN_EXPIRE_HOURS: int
    LOGIN_LINK_EXPIRE_MINUTES: int 

    class Config:
        env_file = ".env"

settings = Settings()
