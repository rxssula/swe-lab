import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/db")

    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

    CORS_ORIGINS: list = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
    ]

    # File upload settings
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "uploads")
    MAX_FILE_SIZE: int = int(os.getenv("MAX_FILE_SIZE", str(10 * 1024 * 1024)))  # 10MB default
    MAX_AUDIO_SIZE: int = int(os.getenv("MAX_AUDIO_SIZE", str(5 * 1024 * 1024)))  # 5MB default

    def __init__(self):
        if not self.SECRET_KEY:
            raise ValueError("SECRET_KEY must be set in environment variables")
        
        # Add CORS_ORIGINS from environment to defaults if provided
        cors_origins_env = os.getenv("CORS_ORIGINS")
        if cors_origins_env:
            env_origins = [
                origin.strip()
                for origin in cors_origins_env.split(",")
                if origin.strip()
            ]
            # Combine defaults with env values, avoiding duplicates
            self.CORS_ORIGINS = list(dict.fromkeys(self.CORS_ORIGINS + env_origins))


settings = Settings()
