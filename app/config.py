from pydantic_settings import BaseSettings
from dotenv import load_dotenv
import os
load_dotenv()

class Configs(BaseSettings):
    app_name: str = os.getenv("APP_NAME")
    hostname:str = os.getenv("HOSTNAME")
    port: int = os.getenv("PORT")
    secret_key: str = os.getenv("SECRET_KEY")
    algorithm: str = os.getenv("ALGORITHM")
    access_token_expire_minutes: int = os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES")
    sql_database_url: str = os.getenv("SQL_DATABASE_URL")
    storage_dir: str = os.getenv("STORAGE_DIR")
    vector_store_dir: str = os.getenv("VECTOR_STORE_DIR")
    

configs = Configs()
