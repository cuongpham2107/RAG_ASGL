from datetime import datetime
import json
import asyncio
from typing import List, Optional
from fastapi import APIRouter, Depends, Form, HTTPException
from fastapi.responses import StreamingResponse

from app.utils.common import sanitize_filename
from app.api.dependencies import authenticate, db
from app.core.rag import RagSetup
from app.models.chat import ChatHistoryModel, ChatMessageModel
from app.models.user import UserModel
from app.models.file import FileModel


router_chat = APIRouter()
rag = RagSetup()
chat_history_model = ChatHistoryModel()
chat_message_model = ChatMessageModel()
user_model = UserModel()
file_model = FileModel()  # Create an instance of FileModel

@router_chat.get("/{chat_history_id}")
async def get_chat_by_history_id(
    chat_history_id: int,
    current_user: str = Depends(authenticate)
):
    messages = chat_message_model.get_by_history(chat_history_id)
    return {
        "message": "Chat messages retrieved successfully",
        "data": messages
    }

@router_chat.post("/")
async def add_new_chat_message(
    question: str = Form(...),
    current_user: str = Depends(authenticate)
):
    try:
         # get user_id
        user = user_model.get_by_username(current_user)
        user_id = user.get('id')

        async def stream_response():
            last_heartbeat = asyncio.get_event_loop().time()
            
            # Get user
            user = user_model.get_by_username(current_user)
            if not user:
                raise HTTPException(status_code=404, detail="User not found")

            # Create chat history - fixed: chat_name is now treated as a string
            chat_name = await rag.generate_chat_history_name(question)
            
            chat_history_id = chat_history_model.create(
                name=chat_name,  # Now using chat_name directly as a string
                slug=sanitize_filename(chat_name),  # Using chat_name as string
                user_id=user['id']
            )

            # For new chat, there's no history yet
            histories = []

            # Stream chat response
            async for chunk in rag.stream_chat(question=question, user_id=user_id, histories=histories):
                # Handle heartbeat
                current_time = asyncio.get_event_loop().time()
                if current_time - last_heartbeat >= 15:
                    yield json.dumps({"type": "heartbeat", "data": "ping"}) + "\n"
                    last_heartbeat = current_time

                if isinstance(chunk, dict):
                    # Get source information
                    file_id = None
                    file_name = ""
                    source_slug = ""
                    
                    if chunk.get('sources') and len(chunk.get('sources', [])) > 0:
                        source_slug = chunk.get('sources', [])[0]
                        file_id = file_model.get_id_by_slug(source_slug)
                        if file_id:
                            # Get file name directly from the slug
                            file_name = file_model.get_name_by_slug(source_slug) or ""
                    
                    # Save final response with enhanced source information
                    source_info = json.dumps({
                        "slug": source_slug,
                        "id": file_id,
                        "name": file_name
                    }) if source_slug else ""
                    
                    chat_message_model.create(
                        chat_history_id=chat_history_id,
                        question=question,
                        answer=chunk['answer'],
                        sources=source_info,
                    )
                    
                    yield json.dumps({
                        "type": "final",
                        "data": {
                            "chat_history_id": chat_history_id,
                            "question": question,
                            "answer": chunk['answer'],
                            "sources": {
                                "slug": source_slug,
                                "id": file_id,
                                "name": file_name
                            },
                            "timestamp": datetime.now().isoformat()
                        }
                    }, ensure_ascii=False) + "\n"
                else:
                    yield json.dumps({"type": "stream", "data": chunk}) + "\n"

        return StreamingResponse(
            stream_response(),
            media_type='text/event-stream'
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    
@router_chat.post("/{chat_history_id}")
async def add_chat_message_by_chat_history_id(
    chat_history_id: int,
    question: str = Form(...),
    current_user: str = Depends(authenticate)
):
    try:
        # get user_id
        user = user_model.get_by_username(current_user)
        user_id = user.get('id')
        # Retrieve chat history for context
        chat_messages = chat_message_model.get_by_history(chat_history_id)
        
        # Format messages for the RAG system
        histories = []
        for msg in chat_messages:
            # Add the question as user message
            histories.append({
                "role": "user",
                "content": msg["question"]
            })
            # Add the answer as assistant message
            histories.append({
                "role": "assistant",
                "content": msg["answer"]
            })
        
        # Create generator to stream response
        async def stream_response():
            # Track last heartbeat time
            last_heartbeat = asyncio.get_event_loop().time()
            
            async for chunk in rag.stream_chat(question=question, user_id=user_id, histories=histories):
                # Kiểm tra và gửi heartbeat nếu cần
                current_time = asyncio.get_event_loop().time()
                if current_time - last_heartbeat >= 15:
                    yield json.dumps({
                        "type": "heartbeat",
                        "data": "ping"
                    }) + "\n"
                    last_heartbeat = current_time

                if isinstance(chunk, dict):
                    # Get source information
                    file_id = None
                    file_name = ""
                    source_slug = ""
                    
                    if chunk.get('sources') and len(chunk.get('sources', [])) > 0:
                        source_slug = chunk.get('sources', [])[0]
                        file_id = file_model.get_id_by_slug(source_slug)
                        if file_id:
                            # Get file name directly from the slug
                            file_name = file_model.get_name_by_slug(source_slug) or ""
                    
                    # Save to database with enhanced source information
                    source_info = json.dumps({
                        "slug": source_slug,
                        "id": file_id,
                        "name": file_name
                    }) if source_slug else ""
                    
                    timestamp = datetime.now()
                    chat_message_model.create(
                        chat_history_id=chat_history_id,
                        question=question,
                        answer=chunk['answer'],
                        sources=source_info,
                    )
                    
                    yield json.dumps({
                        "type": "final",
                        "data": {
                            "chat_history_id": chat_history_id,
                            "question": question,
                            "answer": chunk['answer'],
                            "sources": {
                                "slug": source_slug,
                                "id": file_id,
                                "name": file_name
                            },
                            "timestamp": timestamp.isoformat()
                        }
                    }, ensure_ascii=False) + "\n"
                else:
                    yield json.dumps({
                        "type": "stream",
                        "data": chunk
                    }) + "\n"

        return StreamingResponse(
            stream_response(),
            media_type='text/event-stream'
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

