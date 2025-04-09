from datetime import datetime, timedelta
from typing import Optional
import jwt
from jwt.exceptions import InvalidTokenError
import bcrypt
from fastapi import HTTPException, status
from app.config import configs
from app.db.models import TokenData

def password_hash(password: str) -> str:
    try:
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode(), salt).decode()
    except Exception as e:
        print(f"Error hashing password: {str(e)}")
        raise ValueError("Error creating password hash")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())
    except Exception as e:
        print(f"Error verifying password: {str(e)}")
        return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, configs.secret_key, algorithm=configs.algorithm)
    if isinstance(encoded_jwt, bytes):
        return encoded_jwt.decode()
    return encoded_jwt

def verify_token(token: str) -> TokenData:
    try:
        payload = jwt.decode(token, configs.secret_key, algorithms=[configs.algorithm])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Không thể xác nhận thông tin đăng nhập",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return TokenData(username=username)
    except InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Không thể xác nhận thông tin đăng nhập",
            headers={"WWW-Authenticate": "Bearer"},
        )