from typing import List, Optional
from fastapi import APIRouter, Depends, Form, HTTPException

from app.api.dependencies import authenticate
from app.models.chat import ChatHistoryModel
from app.models.user import UserModel

router_chat_history = APIRouter()
chat_history_model = ChatHistoryModel()
user_model = UserModel()

@router_chat_history.get("/")
async def index(current_user: str = Depends(authenticate)):
    user = user_model.get_by_username(current_user[0])
    print(user['id'])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    histories = chat_history_model.get_user_history(user['id'])
    return {
        "message": "Chat history retrieved successfully",
        "data": histories
    }

@router_chat_history.put("/{chat_history_id}")  # Changed from post to put
async def update(
    chat_history_id: int,
    name: str = Form(...),
    current_user: str = Depends(authenticate)
):
    result = chat_history_model.update(chat_history_id, name)
    if not result:
        raise HTTPException(status_code=404, detail="Chat history not found")
    return {
        "message": "Chat history updated successfully",
        "success": True
    }

@router_chat_history.delete("/{chat_history_id}")
async def delete(
    chat_history_id: int,
    current_user: str = Depends(authenticate)
):
    result = chat_history_model.delete(chat_history_id)
    print(result)
    if not result:
        raise HTTPException(status_code=404, detail="Chat history not found")
    return {
        "message": "Chat history deleted successfully",
        "success": True
    }
