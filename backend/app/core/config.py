from pydantic_settings import BaseSettings
from pydantic import SecretStr

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: SecretStr
    BACKEND_CORS_ORIGINS: list[str] 
    MAIL_SERVER: str
    MAIL_PORT: int
    ALGORITHM: str
    TOKEN_EXPIRE_HOURS: int
    VERIFICATION_TOKEN_EXPIRE_HOURS: int
    
    class Config:
        env_file = ".env"

settings = Settings()