from app.db.database import Database
from app.config import configs
from app.core.security import verify_token
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

db = Database(configs.sql_database_url)

async def authenticate(token: str = Depends(oauth2_scheme)):
    token_data = verify_token(token)
    with db.get_cursor() as cursor:
        cursor.execute('''
        SELECT username FROM users WHERE username = ?
        ''', (token_data.username,))
        username = cursor.fetchone()
        if not username:
            raise HTTPException(status_code=400, detail="User not found")
        return username
