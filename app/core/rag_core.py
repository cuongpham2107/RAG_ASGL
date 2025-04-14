"""
Module chính cho hệ thống RAG.
Kết hợp các module khác nhau để tạo một hệ thống RAG hoàn chỉnh.
"""

import os
from datetime import datetime
from typing import Dict, List, Optional, Any, Union

from fastapi import UploadFile
from langchain.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings

from app.core.vector_store import VectorStoreManager
from app.core.document_processor import DocumentProcessor
from app.core.chat_manager import ChatManager
from app.core.config import rag_configs


class RagCore:
    """
    Lớp chính quản lý hệ thống RAG.
    Kết hợp các thành phần khác nhau để tạo một hệ thống RAG hoàn chỉnh.
    """
    
    def __init__(self, api_key: Optional[str] = None, vector_store_dir: Optional[str] = None):
        """
        Khởi tạo hệ thống RAG.
        
        Args:
            api_key: Google API key, sẽ dùng từ config nếu không được cung cấp
            vector_store_dir: Thư mục lưu vector store, sẽ dùng từ config nếu không được cung cấp
        """
        # Khởi tạo các thành phần LLM và embedding
        self.api_key = api_key or rag_configs.GOOGLE_API_KEY
        self.vector_store_dir = vector_store_dir or rag_configs.VECTOR_STORE_DIR
        
        # Khởi tạo LLM - Fixed safety_settings format
        self.llm = ChatGoogleGenerativeAI(
            model=rag_configs.LLM_MODEL,  # Use model from config
            google_api_key=self.api_key,
        )
        
        # Khởi tạo embeddings - Sử dụng GoogleGenerativeAIEmbeddings thay vì VertexAIEmbeddings
        self.embeddings = GoogleGenerativeAIEmbeddings(
            model=rag_configs.EMBEDDING_MODEL,  # Use model from config
            google_api_key=self.api_key
        )
        
        # Khởi tạo các manager
        self.vector_store_manager = VectorStoreManager(self.embeddings, self.vector_store_dir)
        self.document_processor = DocumentProcessor()
        self.chat_manager = ChatManager(self.llm, self.embeddings)
    
    async def process_files(self, file: UploadFile, filepath: str, slug_file: str, user_id: Optional[int] = None):
        """
        Xử lý file và lưu vào vector store.
        
        Args:
            file: File tải lên
            filepath: Đường dẫn đến file đã lưu
            slug_file: Tên file đã được chuẩn hóa
            user_id: ID người dùng (tùy chọn)
            
        Returns:
            bool: True nếu xử lý thành công, False nếu có lỗi
        """
        try:
            # Xử lý tài liệu
            documents = await self.document_processor.process_file(file, filepath, slug_file, user_id)
            
            # Lưu vào vector store
            success = self.vector_store_manager.add_documents(documents)
            
            if not success:
                raise Exception("Không thể thêm tài liệu vào vector store")
                
            return True
        except Exception as e:
            print(f"❌ Error processing files: {str(e)}")
            raise Exception(f"Error processing files: {str(e)}")
    
    def delete_docs(self, slug_file: str) -> int:
        """
        Xóa tài liệu từ vector store dựa trên slug file.
        
        Args:
            slug_file: Tên file chuẩn hóa cần xóa
            
        Returns:
            int: Số lượng tài liệu đã xóa
        """
        return self.vector_store_manager.delete_documents(slug_file)
    
    def update_document_owner(self, slug_file: str, new_owner: str) -> int:
        """
        Cập nhật thông tin chủ sở hữu cho tài liệu.
        
        Args:
            slug_file: Tên file chuẩn hóa cần cập nhật
            new_owner: ID chủ sở hữu mới
            
        Returns:
            int: Số lượng tài liệu đã cập nhật
        """
        return self.vector_store_manager.update_document_owner(slug_file, new_owner)
    
    def delete_document_owner(self, slug_file: str, owner_id: str) -> int:
        """
        Xóa chủ sở hữu khỏi tài liệu.
        
        Args:
            slug_file: Tên file chuẩn hóa cần cập nhật
            owner_id: ID chủ sở hữu cần xóa
            
        Returns:
            int: Số lượng tài liệu đã cập nhật
        """
        return self.vector_store_manager.delete_document_owner(slug_file, owner_id)
    
    async def generate_chat_history_name(self, question: str) -> str:
        """
        Tạo tên cho lịch sử trò chuyện dựa trên câu hỏi.
        
        Args:
            question: Câu hỏi của người dùng
            
        Returns:
            str: Tên được tạo cho lịch sử trò chuyện
        """
        try:
            # Tạo prompt để tạo tên lịch sử trò chuyện
            prompt = ChatPromptTemplate.from_template(rag_configs.CHAT_HISTORY_NAME_PROMPT)
            
            # Định dạng prompt với câu hỏi
            formatted_prompt = prompt.format(
                question=question,
                history=""  # Lịch sử trống cho tin nhắn đầu tiên
            )
            
            # Tạo phản hồi
            response = await self.llm.ainvoke(formatted_prompt)
            
            # Trích xuất tên - xử lý các định dạng trả về khác nhau
            if hasattr(response, 'content'):
                name = response.content.strip()
            else:
                # Nếu phản hồi là chuỗi hoặc định dạng khác
                name = str(response).strip()
            
            # Dự phòng nếu phản hồi trống
            if not name:
                name = f"Chat {datetime.now().strftime('%Y-%m-%d %H:%M')}"
                
            return name
            
        except Exception as e:
            # Cung cấp tên mặc định trong trường hợp lỗi
            print(f"Error generating chat history name: {e}")
            return f"Chat {datetime.now().strftime('%Y-%m-%d %H:%M')}"
    
    async def stream_chat(self, question: str, user_id: Optional[int] = None, histories: List[Dict] = None):
        """
        Xử lý câu hỏi và trả lời dưới dạng stream.
        
        Args:
            question: Câu hỏi của người dùng
            user_id: ID người dùng (tùy chọn)
            histories: Lịch sử trò chuyện trước đó (tùy chọn)
            
        Yields:
            Text chunks hoặc dictionary kết quả cuối cùng
        """
        async for response in self.chat_manager.stream_chat(
            question, self.vector_store_manager, user_id, histories
        ):
            yield response