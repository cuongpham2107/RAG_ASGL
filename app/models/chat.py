from typing import List, Dict
from datetime import datetime
from app.models.base import BaseModel

class ChatHistoryModel(BaseModel):
    COLUMNS = ['id', 'name', 'slug', 'user_id', 'timestamp']

    def get_user_history(self, user_id: int) -> List[Dict]:
        """Get chat history for user"""
        rows = self.execute_query(
            "SELECT * FROM chat_histories WHERE user_id = ?",
            (user_id,)
        )
        return [self.row_to_dict(row, self.COLUMNS) for row in rows]

    def create(self, name: str, slug: str, user_id: int) -> int:
        """Create new chat history"""
        return self.execute_insert(
            "INSERT INTO chat_histories (name, slug, user_id) VALUES (?, ?, ?)",
            (name, slug, user_id)
        )
    
    def update(self, chat_history_id: int, name: str) -> bool:
        """Update chat history"""
        # First check if record exists
        exists = len(self.execute_query(
            "SELECT id FROM chat_histories WHERE id = ?",
            (chat_history_id,)
        )) > 0
        
        if not exists:
            return False
            
        self.execute_query(
            "UPDATE chat_histories SET name = ? WHERE id = ?",
            (name, chat_history_id)
        )
        return True
    
    def delete(self, chat_history_id: int) -> bool:
        """Delete chat history"""
        # First check if record exists
        exists = len(self.execute_query(
            "SELECT id FROM chat_histories WHERE id = ?",
            (chat_history_id,)
        )) > 0
        
        if not exists:
            return False
            
        self.execute_query(
            "DELETE FROM chat_histories WHERE id = ?",
            (chat_history_id,)
        )
        return True

class ChatMessageModel(BaseModel):
    COLUMNS = ['id', 'chat_history_id', 'question', 'answer', 'sources', 'timestamp']

    def get_by_history(self, chat_history_id: int) -> List[Dict]:
        """Get messages for a chat history"""
        rows = self.execute_query(
            "SELECT * FROM chat_messages WHERE chat_history_id = ?",
            (chat_history_id,)
        )
        return [self.row_to_dict(row, self.COLUMNS) for row in rows]

    def create(self, chat_history_id: int, question: str, 
               answer: str, sources: str) -> int:
        """Create new chat message"""
        return self.execute_insert(
            """INSERT INTO chat_messages 
            (chat_history_id, question, answer, sources) 
            VALUES (?, ?, ?, ?)""",
            (chat_history_id, question, answer, sources)
        )
