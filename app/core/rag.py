from datetime import datetime
import os
from typing import List, Optional
from fastapi import UploadFile
from langchain.prompts import ChatPromptTemplate
from langchain_chroma import Chroma
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from app.core.utils import ocr_pdf_processing
from langchain_community.document_loaders import (
    PyPDFLoader,
    TextLoader,
    Docx2txtLoader,
    UnstructuredExcelLoader,
    CSVLoader,
)
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.config import configs
import fitz
from app.models.file import FileModel
from app.models.folder import FolderModel
from app.core.config import rag_configs


class RagSetup:
    def __init__(self):
        """
        Khởi tạo RagSetup sử dụng cấu trúc module mới.
        Lớp này được giữ lại để tương thích ngược với mã hiện tại.
        """
        from app.core.rag_core import RagCore
        from app.core.config import rag_configs
        
        # Khởi tạo RagCore - lớp chính mới
        self._core = RagCore(
            api_key=rag_configs.GOOGLE_API_KEY, 
            vector_store_dir=rag_configs.VECTOR_STORE_DIR
        )
        
        # Tham chiếu trực tiếp để tương thích ngược
        self.llm = self._core.llm
        self.embeddings = self._core.embeddings
        self.vector_store = self._core.vector_store_manager.vector_store
    
    def _load_vector_store(self):
        """Tải vector store nếu có sẵn."""
        if not self.vector_store:
            self._core.vector_store_manager._load_vector_store()
            self.vector_store = self._core.vector_store_manager.vector_store

    async def process_files(self, file, filepath: str, slug_file: str, user_id=None):
        """Xử lý file, phân tách nội dung và lưu vào vector store."""
        await self._core.process_files(file, filepath, slug_file, user_id)
        # Cập nhật tham chiếu vector_store cho tương thích ngược
        self.vector_store = self._core.vector_store_manager.vector_store

    def delete_docs(self, slug_file: str):
        """Xóa tài liệu từ vector store."""
        count = self._core.delete_docs(slug_file)
        # Cập nhật tham chiếu vector_store
        self.vector_store = self._core.vector_store_manager.vector_store
        return count
    
    def update_document_owner(self, slug_file: str, new_owner: str):
        """
        Cập nhật trường 'owner' cho các tài liệu dựa trên slug_file.
        """
        count = self._core.update_document_owner(slug_file, new_owner)
        # Cập nhật tham chiếu vector_store
        self.vector_store = self._core.vector_store_manager.vector_store
        return count

    def delete_document_owner(self, slug_file: str, owner_id: str):
        """
        Xóa owner_id khỏi các tài liệu dựa trên slug_file.
        """
        count = self._core.delete_document_owner(slug_file, owner_id)
        # Cập nhật tham chiếu vector_store
        self.vector_store = self._core.vector_store_manager.vector_store
        return count
    
    async def _get_loader(self, filepath: str, filename: str):
        """Uỷ thác cho DocumentProcessor."""
        return await self._core.document_processor._get_loader(filepath, filename)

    async def generate_chat_history_name(self, question: str):
        """Tạo tên chat history từ câu hỏi."""
        try:
            # Forward the request to the core implementation
            name = await self._core.generate_chat_history_name(question)
            
            # If name is already a string (not an object with .content), return as is
            if isinstance(name, str):
                return name
            
            # If it has a content attribute, return that
            if hasattr(name, 'content'):
                return name.content
            
            # Default fallback if unexpected format
            return str(name)
        except Exception as e:
            # Provide a default name in case of error
            print(f"Error generating chat history name: {e}")
            return f"Chat {datetime.now().strftime('%Y-%m-%d %H:%M')}"
    
    async def classify_query_using_llm(self, question: str) -> dict:
        """Phân loại câu hỏi sử dụng LLM."""
        return await self._core.chat_manager.classify_query_using_llm(question)
    
    async def stream_chat(self, question: str, user_id=None, histories=None):
        """Xử lý chat có tính đến context."""
        async for response in self._core.stream_chat(question, user_id, histories):
            yield response

    def convert_existing_owners_to_array(self):
        """
        Phương thức này sẽ được triển khai sau khi hoàn thiện cấu trúc mới.
        """
        raise NotImplementedError("Method not implemented in the new structure yet")
    
    def _is_semantically_relevant(self, question, docs):
        """Kiểm tra tính liên quan ngữ nghĩa."""
        return self._core.chat_manager._is_semantically_relevant(question, docs)
    
    def _build_system_context(self):
        """Xây dựng ngữ cảnh hệ thống."""
        return self._core.chat_manager._build_system_context()