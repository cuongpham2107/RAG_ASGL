"""
Core module for RAG system.
Contains the components for the Retrieval-Augmented Generation system.
"""

# Export các class cũ để tương thích ngược
from app.core.rag import RagSetup

# Export các class mới
from app.core.vector_store import VectorStoreManager
from app.core.document_processor import DocumentProcessor
from app.core.chat_manager import ChatManager
from app.core.rag_core import RagCore