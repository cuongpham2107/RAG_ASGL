from fastapi import APIRouter, Depends, Form, HTTPException, Query
from typing import List, Optional
from enum import Enum

from app.api.dependencies import authenticate
from app.models.role import RoleModel
from app.models.user import UserModel

router_user = APIRouter()
user_model = UserModel()


@router_user.get("/")
async def get_all_users(
    search: Optional[str] = Query(None, description="Search query"),
    skip: int = Query(default=0, ge=0, description="Number of records to skip"),
    limit: int = Query(default=10, ge=1, le=100, description="Number of records to return"),
    current_user: str = Depends(authenticate)
):
    users = user_model.get_all(skip=skip, limit=limit, search=search)
    return {
        "message": "Users retrieved successfully",
        "data": users
    }

@router_user.post("/")
async def create_user(
    username: str = Form(...),
    password: str = Form(...),
    email: str = Form(None),
    phone: str = Form(None),
    address: str = Form(None),
    full_name: str = Form(None),
    role_id: int = Form(...),
    current_user: str = Depends(authenticate)
):
    try:
        user_id = user_model.create_user(
            username=username,
            password=password,
            role_id=role_id,
            email=email,
            phone=phone,
            address=address,
            full_name=full_name
        )
        return {
            "message": "User registered successfully",
            "user_id": user_id
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router_user.put("/{user_id}")
async def update_user(
    user_id: int,
    email: Optional[str] = Form(default=None),
    phone: Optional[str] = Form(default=None),
    address: Optional[str] = Form(default=None),
    full_name: Optional[str] = Form(default=None),
    password: Optional[str] = Form(default=None),
    role_id: Optional[int] = Form(default=None),
    current_user: str = Depends(authenticate)
):
    result = user_model.update_user(
        user_id=user_id,
        email=email,
        phone=phone,
        address=address,
        full_name=full_name,
        password=password,
        role_id=role_id
    )
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "message": "User updated successfully",
        "success": True
    }


@router_user.delete("/{user_id}")
async def delete_user(
    user_id: int,
    current_user: str = Depends(authenticate)
):
    result = user_model.delete_user(user_id)
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "message": "User deleted successfully",
        "success": True
    }