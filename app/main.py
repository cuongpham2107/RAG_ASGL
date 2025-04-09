import asyncio
import json
from fastapi import FastAPI, APIRouter, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from app.api.auth import router_auth
from app.api.folder import router_folder
from app.api.file import router_file
from app.api.chat import router_chat
from app.api.user import router_user
from app.api.chat_history import router_chat_history
from app.api.role import router_role
from app.db.database import Database
from app.config import configs
import os
import uvicorn
from pathlib import Path


# Use absolute path for database
db_url = os.getenv("SQL_DATABASE_URL")
print("Using database at:", db_url)

try:
    db = Database(db_url)
    if not db.database_exists():
        print("Initializing new database...")
        db.init_database()
    else:
        print("Database already exists")
except Exception as e:
    print(f"Database initialization failed: {e}")
    raise

app = FastAPI()



app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
api_router = APIRouter(prefix="/api")

api_router.include_router(router_auth, prefix="/auth", tags=["auth"])
api_router.include_router(router_folder, prefix="/folders", tags=["folder"])
api_router.include_router(router_file, prefix="/files", tags=["file"])
api_router.include_router(router_chat, prefix="/chat", tags=["chat"])
api_router.include_router(router_chat_history, prefix="/chat-histories", tags=["chat_history"])
api_router.include_router(router_role, prefix="/roles", tags=["role"])
api_router.include_router(router_user, prefix="/users", tags=["chat"])


app.include_router(api_router)

if __name__ == "__main__":
    uvicorn.run(
        app=app, 
        host="localhost", 
        port=3001, 
        reload=True,
        env_file=Path(__file__).parent.parent / ".env"
    )
