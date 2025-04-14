"""
Module xử lý tài liệu cho hệ thống RAG.
"""

import os
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple

import fitz  # PyMuPDF
from fastapi import UploadFile
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import (
    PyPDFLoader, 
    UnstructuredExcelLoader, 
    CSVLoader, 
    Docx2txtLoader,
    TextLoader
)

from app.core.utils import ocr_pdf_processing


class DocumentProcessor:
    """
    Xử lý các tệp tài liệu cho hệ thống RAG.
    Bao gồm tải, phân tách, và chuẩn bị tài liệu cho việc nhúng và lưu trữ.
    """
    
    def __init__(self):
        """Khởi tạo DocumentProcessor."""
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1800,
            chunk_overlap=300,
            length_function=lambda text: len(text) // 4,
            add_start_index=True,   
            separators=["\n\n", "\n", ".", "!", "?", " "],
        )
    
    async def process_file(self, file: UploadFile, filepath: str, slug_file: str, owner_id: Optional[int] = None) -> List:
        """
        Xử lý file, phân tách nội dung và chuẩn bị cho lưu trữ vector.
        
        Args:
            file: UploadFile từ FastAPI
            filepath: Đường dẫn đến file đã lưu
            slug_file: Tên file đã được chuẩn hóa
            owner_id: ID người sở hữu file (tùy chọn)
            
        Returns:
            List: Danh sách các documents đã được phân tách và gắn metadata
        """
        try:
            print(f"🔍 Xử lý file: {file.filename} cho user_id: {owner_id}")
            if owner_id is None:
                print("⚠️ Warning: user_id is None. Documents will not be associated with a user.")
            
            # Convert user_id to string if present (for Chroma compatibility)
            owner_str = str(owner_id) if owner_id is not None else None
            
            # Load file with appropriate loader
            loader = await self._get_loader(filepath, file.filename)
            loaded_docs = loader.load()

            if not loaded_docs:
                raise Exception(f"🚨 No content extracted from {file.filename}")
            
            # Set metadata for all documents
            metadata = {
                "source_file": slug_file,
                "owner": owner_str,
                "updated_at": datetime.now().isoformat(),
            }
            print(f"📄 Setting metadata: {metadata}")
            
            # Add metadata to each document
            for doc in loaded_docs:
                doc.metadata.update(dict(metadata))
            
            print(f"📂 Loaded {len(loaded_docs)} documents from {file.filename}")

            # Split documents into smaller chunks for better retrieval
            splits = self.text_splitter.split_documents(loaded_docs)
            print(f"🔹 Split into {len(splits)} chunks")
            
            # Verify splits have correct metadata
            if splits:
                first_chunk_metadata = splits[0].metadata
                print(f"🔍 First chunk metadata: {first_chunk_metadata}")
                print(f"🔑 First chunk owner: {first_chunk_metadata.get('owner')}")

            if not splits:
                raise Exception("🚨 No text chunks generated!")
                
            return splits
            
        except Exception as e:
            print(f"❌ Error processing file: {str(e)}")
            raise Exception(f"Error processing file: {str(e)}")
    
    async def _get_loader(self, filepath: str, filename: str):
        """
        Tạo loader phù hợp với định dạng file.
        
        Args:
            filepath: Đường dẫn đến file
            filename: Tên file
            
        Returns:
            Document loader phù hợp với loại file
        """
        print(f"📂 Loading file: {filename}")

        if filename.endswith(".pdf"):
            doc = fitz.open(filepath)
            has_text = any(page.get_text("text") for page in doc)

            if has_text:
                print("📄 Using PyPDFLoader")
                return PyPDFLoader(filepath)
            else:
                print("📄 Using OCR processing for PDF without text")

                # Await the OCR processing, overwriting the original file
                await ocr_pdf_processing(filepath)

                # Use the same filepath since we're overwriting the original
                print("📄 Using PyPDFLoader with OCR-processed PDF")
                return PyPDFLoader(filepath)
                
        elif filename.endswith(".xlsx") or filename.endswith(".xls"):
            print("📄 Using UnstructuredExcelLoader")
            return UnstructuredExcelLoader(filepath)

        elif filename.endswith(".csv"):
            print("📄 Using CSVLoader")
            return CSVLoader(filepath)

        elif filename.endswith(".docx") or filename.endswith(".doc"):
            print("📄 Using Docx2txtLoader")
            return Docx2txtLoader(filepath)

        print("📄 Using TextLoader")
        return TextLoader(filepath)