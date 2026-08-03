from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    MAIL_SERVER: str
    MAIL_PORT: int
    ALGORITHM: str
    TOKEN_EXPIRE_HOURS: int
    
    class Config:
        env_file = ".env"

settings = Settings()