from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "FastAPI App"
    DATABASE_URL: str = "postgresql://user:password@db:5432/mydatabase"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
