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
    UnstructuredPDFLoader,
)
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.config import configs
import fitz
from app.models.file import FileModel
from app.models.folder import FolderModel


class RagSetup:
    def __init__(self):
        self.embeddings = GoogleGenerativeAIEmbeddings(
            model="models/text-embedding-004",
            google_api_key="AIzaSyBdIeLFzA8pQnk_jcDg0yf_17FIsceTTbk",
        )
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            google_api_key="AIzaSyBdIeLFzA8pQnk_jcDg0yf_17FIsceTTbk",
        )
        self.vector_store = None
        self._load_vector_store()

    def _load_vector_store(self):
        """Tải vector store nếu có sẵn."""
        try:
            if os.path.exists(configs.vector_store_dir) and os.listdir(
                configs.vector_store_dir
            ):
                # Check if we have write permissions to the directory
                if not os.access(configs.vector_store_dir, os.W_OK):
                    print(f"⚠️ Warning: No write permission to {configs.vector_store_dir}")
                    # Try to fix permissions
                    try:
                        os.chmod(configs.vector_store_dir, 0o755)
                        print("✅ Fixed directory permissions")
                    except Exception as perm_error:
                        print(f"❌ Could not fix permissions: {perm_error}")
                
                self.vector_store = Chroma(
                    persist_directory=configs.vector_store_dir,
                    embedding_function=self.embeddings,
                )
                print("✅ Vector store loaded successfully!")
            else:
                print(
                    "⚠️ No vector store found. Please upload and process documents first."
                )
                # Ensure the directory exists with proper permissions
                os.makedirs(configs.vector_store_dir, exist_ok=True)
                os.chmod(configs.vector_store_dir, 0o755)
        except Exception as e:
            print(f"❌ Error loading vector store: {e}")
            self.vector_store = None

    async def process_files(self, file: UploadFile, filepath: str, slug_file: str, user_id: Optional[int] = None):
        """Xử lý file, phân tách nội dung và lưu vào vector store."""
        try:
            print("user_id", user_id)
            if user_id is None:
                print("⚠️ Warning: user_id is None. Documents will not be associated with a user.")
            
            # Convert user_id to integer if it's a string or leave as None if None
            owner_id = int(user_id) if user_id is not None else None
            print(f"🔑 Processing with owner_id: {owner_id} (type: {type(owner_id).__name__})")
            
            docs = []
            loader = await self._get_loader(filepath, file.filename)
            loaded_docs = loader.load()

            if not loaded_docs:
                raise Exception(f"🚨 No content extracted from {file.filename}")
            
            # Ensure metadata is a fresh dict to avoid reference issues
            metadata = {
                "source_file": slug_file,
                # Store owner ID as string to ensure compatibility with Chroma
                "owner": str(owner_id) if owner_id is not None else None,
                "updated_at": datetime.now().isoformat(),
            }
            print(f"📄 Setting metadata: {metadata}")
            
            for doc in loaded_docs:
                # Create a new copy of metadata for each document to ensure no reference issues
                doc.metadata.update(dict(metadata))
                # Verify metadata was correctly updated
                print(f"📑 Document metadata owner: {doc.metadata.get('owner')} (type: {type(doc.metadata.get('owner')).__name__})")

            docs.extend(loaded_docs)
            print(f"📂 Loaded {len(docs)} documents from {file.filename}")

            # Chia nhỏ nội dung để tối ưu truy vấn
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=500,
                chunk_overlap=50,
                length_function=len,
                add_start_index=True,
                separators=["\n\n", "\n", " ", ""],
            )
            splits = text_splitter.split_documents(docs)
            print(f"🔹 Split into {len(splits)} chunks")
            
            # Verify metadata in the first chunk to ensure it's correct
            if splits:
                first_chunk_metadata = splits[0].metadata
                print(f"🔍 First chunk metadata: {first_chunk_metadata}")
                print(f"🔑 First chunk owner: {first_chunk_metadata.get('owner')} (type: {type(first_chunk_metadata.get('owner')).__name__})")

            if not splits:
                raise Exception("🚨 No text chunks generated!")

            # Check if vector store directory exists and is writable
            if not os.path.exists(configs.vector_store_dir):
                os.makedirs(configs.vector_store_dir, exist_ok=True)
                print(f"📁 Created vector store directory: {configs.vector_store_dir}")
            
            if not os.access(configs.vector_store_dir, os.W_OK):
                print(f"⚠️ No write permission to {configs.vector_store_dir}, attempting to fix...")
                try:
                    os.chmod(configs.vector_store_dir, 0o755)
                    print("✅ Fixed directory permissions")
                except Exception as perm_error:
                    raise Exception(f"Cannot write to vector store directory: {perm_error}")

            if self.vector_store is None:
                try:
                    self.vector_store = Chroma(
                        persist_directory=configs.vector_store_dir,
                        embedding_function=self.embeddings,
                    )
                    print("✅ Created new vector store")
                except Exception as vs_error:
                    raise Exception(f"Failed to create vector store: {vs_error}")

            # Thêm dữ liệu vào vector store theo batch
            batch_size = 10
            for i in range(0, len(splits), batch_size):
                batch = splits[i : i + batch_size]
                # Double check metadata before adding to vector store
                for idx, doc in enumerate(batch):
                    # Always ensure owner is a string for Chroma compatibility
                    if 'owner' not in doc.metadata or doc.metadata['owner'] is None and owner_id is not None:
                        print(f"⚠️ Fixing missing owner in chunk {i+idx}")
                        doc.metadata['owner'] = str(owner_id)
                    elif doc.metadata.get('owner') is not None and not isinstance(doc.metadata['owner'], str):
                        # Convert owner to string if it's not already
                        doc.metadata['owner'] = str(doc.metadata['owner'])
                        print(f"🔄 Converting owner to string in chunk {i+idx}: {doc.metadata['owner']}")
                
                # Add documents to vector store with retry mechanism
                max_retries = 5  # Increased from 3 to 5
                for retry in range(max_retries):
                    try:
                        ids = self.vector_store.add_documents(batch)
                        print(f"✅ Processed batch {i//batch_size + 1}/{(len(splits)-1)//batch_size + 1} - Added {len(ids)} documents")
                        break
                    except Exception as e:
                        error_msg = str(e).lower()
                        if "readonly database" in error_msg:
                            print(f"⚠️ Retry {retry+1}/{max_retries}: Database is readonly, waiting before retry...")
                            import time
                            
                            # Exponential backoff - wait longer with each retry
                            wait_time = 2 * (retry + 1)
                            print(f"⏱️ Waiting {wait_time} seconds before retry...")
                            time.sleep(wait_time)
                            
                            # Try to close and recreate vector store connection on every other retry
                            if retry % 2 == 1:
                                try:
                                    print("🔄 Attempting to reset vector store connection...")
                                    # Save current vector store reference
                                    temp_vs = self.vector_store
                                    # Set to None to force garbage collection
                                    self.vector_store = None
                                    time.sleep(1)  # Give time for connection to close
                                    # Create new connection
                                    self.vector_store = Chroma(
                                        persist_directory=configs.vector_store_dir,
                                        embedding_function=self.embeddings,
                                    )
                                    print("✅ Vector store connection reset")
                                except Exception as reset_error:
                                    print(f"⚠️ Failed to reset connection: {reset_error}")
                                    # Restore previous connection if reset failed
                                    self.vector_store = temp_vs
                            
                            if retry == max_retries - 1:
                                # On last retry, try alternative approach
                                try:
                                    print("🔧 Attempting alternative document addition approach...")
                                    # Try adding documents one by one instead of batch
                                    successful_ids = []
                                    for single_doc in batch:
                                        try:
                                            doc_id = self.vector_store.add_documents([single_doc])
                                            successful_ids.extend(doc_id)
                                            print(".", end="", flush=True)
                                        except Exception as single_doc_error:
                                            print(f"⚠️ Skip document due to: {single_doc_error}")
                                    
                                    if successful_ids:
                                        print(f"\n✅ Added {len(successful_ids)} documents individually")
                                        break
                                    else:
                                        raise Exception("Could not add any documents individually")
                                except Exception as alt_error:
                                    print(f"❌ Alternative approach failed: {alt_error}")
                                    raise Exception(f"Database remains readonly after {max_retries} retries with multiple approaches")
                        else:
                            print(f"❌ Non-readonly error: {error_msg}")
                            raise
            
            # Ensure vector store is persisted with proper error handling
            # Try different persistence methods with retries
            persist_max_retries = 3
            for persist_retry in range(persist_max_retries):
                try:
                    if hasattr(self.vector_store, 'persist'):
                        self.vector_store.persist()
                        print("💾 Vector store persisted to disk using persist() method")
                        break
                    elif hasattr(self.vector_store, '_collection') and hasattr(self.vector_store._collection, 'persist'):
                        self.vector_store._collection.persist()
                        print("💾 Vector store persisted to disk using _collection.persist()")
                        break
                    else:
                        print("⚠️ No explicit persist method found, vector store might be using auto-persistence")
                        break
                except Exception as retry_persist_error:
                    print(f"⚠️ Persist retry {persist_retry+1}/{persist_max_retries}: {retry_persist_error}")
                    import time
                    time.sleep(2)
                    
                    if persist_retry == persist_max_retries - 1:
                        print("⚠️ Could not persist after multiple attempts, continuing anyway")

            # Verify documents were stored with correct metadata
            if self.vector_store is not None:
                try:
                    # Query a small sample to verify owner is set correctly
                    results = self.vector_store.get(
                        where={"source_file": slug_file},
                        include=["metadatas"],
                        limit=1
                    )
                    if results and results['metadatas']:
                        sample_metadata = results['metadatas'][0]
                        print(f"✅ Verification - Document stored with metadata: {sample_metadata}")
                        if 'owner' in sample_metadata:
                            print(f"✅ Owner field verified: {sample_metadata['owner']} (type: {type(sample_metadata['owner']).__name__})")
                        else:
                            print("❌ Owner field not found in stored document!")
                except Exception as verify_error:
                    print(f"⚠️ Could not verify metadata storage: {verify_error}")

        except Exception as e:
            print(f"❌ Error processing files: {str(e)}")
            raise Exception(f"Error processing files: {str(e)}")

    def delete_docs(self, slug_file: str):
        """Xóa tài liệu từ vector store."""
        if not self.vector_store:
            raise ValueError("🚨 Vector store is not set. Please process files first.")

        file_filter = {"source_file": {"$in": slug_file}}
        print(f"🔍 Deleting documents: {file_filter}")
        self.vector_store.delete_documents(filter=file_filter)
        print("✅ Documents deleted successfully!")
    def update_document_owner(self, slug_file: str, new_owner: str):
        """
        Cập nhật trường 'owner' cho các tài liệu dựa trên slug_file.
        Nếu đã tồn tại owner, thì thêm new_owner vào dạng "id1,id2,id3,..."

        Args:
            slug_file (str): Tên file nguồn cần tìm để cập nhật
            new_owner (str): Chủ sở hữu mới cần gán cho tài liệu

        Returns:
            int: Số lượng tài liệu đã được cập nhật
        """
        if not self.vector_store:
            self._load_vector_store()
            if not self.vector_store:
                raise ValueError("🚨 Vector store is not set. Please process files first.")

        # Lọc tài liệu có source_file trùng khớp với slug_file
        file_filter = {"source_file": slug_file}
        print(f"🔍 Finding documents with filter: {file_filter}")

        # Tìm tất cả các tài liệu cần cập nhật
        try:
            matching_docs = self.vector_store.get(
                where=file_filter,
                include=["documents", "metadatas", "embeddings"]
            )
        except Exception as e:
            print(f"❌ Error retrieving documents: {str(e)}")
            # Try alternative approach if the first one fails
            try:
                print("🔄 Trying alternative retrieval method...")
                matching_docs = self.vector_store.get(
                    filter=file_filter,
                    include=["documents", "metadatas", "embeddings"]
                )
            except Exception as alt_e:
                print(f"❌ Alternative retrieval also failed: {str(alt_e)}")
                raise ValueError(f"Could not retrieve documents: {str(e)}")

        if not matching_docs or len(matching_docs["ids"]) == 0:
            print(f"⚠️ No documents found with source_file: {slug_file}")
            return 0

        # Số lượng tài liệu tìm thấy
        doc_count = len(matching_docs["ids"])
        print(f"📄 Found {doc_count} documents to update")

        # Ensure new_owner is a string (Chroma requires string for metadata values)
        new_owner_str = str(new_owner)
        print(f"🔑 New owner will be set to: {new_owner_str} (type: {type(new_owner_str).__name__})")

        # Cập nhật metadata cho từng tài liệu
        updated_count = 0
        batch_size = 10  # Process in batches to avoid overwhelming the database

        # Try different ways to access the collection directly
        chroma_collection = None
        if hasattr(self.vector_store, '_collection'):
            chroma_collection = self.vector_store._collection
            print("📋 Found vector store collection via _collection attribute")
        elif hasattr(self.vector_store, 'collection'):
            chroma_collection = self.vector_store.collection
            print("📋 Found vector store collection via collection attribute")
        else:
            print("⚠️ Could not find direct collection access. Attempting delete and add approach.")
        
        # If we have direct collection access, try to use it
        if chroma_collection:
            for batch_start in range(0, doc_count, batch_size):
                batch_end = min(batch_start + batch_size, doc_count)
                batch_ids = matching_docs["ids"][batch_start:batch_end]
                batch_metadatas = []
                batch_documents = matching_docs["documents"][batch_start:batch_end] if "documents" in matching_docs else None
                batch_embeddings = matching_docs["embeddings"][batch_start:batch_end] if "embeddings" in matching_docs else None
                
                # Prepare updated metadata for each document in the batch
                for i in range(batch_start, batch_end):
                    # Get current metadata and create a new copy to avoid reference issues
                    current_metadata = dict(matching_docs["metadatas"][i])
                    
                    # Update the owner field - handle comma-separated list
                    current_owner = current_metadata.get("owner", "")
                    
                    if not current_owner:
                        # If owner is None or empty, just set to new owner
                        current_metadata["owner"] = new_owner_str
                        print(f"🆕 Setting owner to: {new_owner_str}")
                    else:
                        # Check if new_owner is already in the list
                        current_owners = str(current_owner).split(",")
                        if new_owner_str not in current_owners:
                            # Add the new owner to the comma-separated list
                            current_owners.append(new_owner_str)
                            current_metadata["owner"] = ",".join(current_owners)
                            print(f"➕ Adding owner to list: {current_metadata['owner']}")
                        else:
                            print(f"✓ Owner {new_owner_str} already in list: {current_owner}")
                    
                    # Update the timestamp to reflect the change
                    current_metadata["updated_at"] = datetime.now().isoformat()
                    
                    batch_metadatas.append(current_metadata)
                
                # Log the first metadata in the batch for verification
                if batch_metadatas:
                    print(f"📝 Sample updated metadata: {batch_metadatas[0]}")
                
                try:
                    # Try to use the collection's direct methods
                    try:
                        # First try using delete and add approach with the collection
                        print(f"🔄 Attempting delete and add with collection for batch {batch_start//batch_size + 1}")
                        chroma_collection.delete(ids=batch_ids)
                        chroma_collection.add(
                            ids=batch_ids,
                            embeddings=batch_embeddings,
                            documents=batch_documents,
                            metadatas=batch_metadatas
                        )
                        updated_count += len(batch_ids)
                        print(f"✅ Updated batch {batch_start//batch_size + 1}/{(doc_count-1)//batch_size + 1} ({len(batch_ids)} documents)")
                    except Exception as collection_error:
                        print(f"❌ Error using collection methods: {str(collection_error)}")
                        raise collection_error
                    
                except Exception as batch_error:
                    print(f"❌ Error updating batch {batch_start//batch_size + 1}: {str(batch_error)}")
                    
                    # Try updating documents one by one if batch update fails
                    print("🔄 Attempting individual updates for this batch...")
                    for j, doc_id in enumerate(batch_ids):
                        try:
                            # Delete and add approach for individual documents
                            chroma_collection.delete(ids=[doc_id])
                            chroma_collection.add(
                                ids=[doc_id],
                                embeddings=[batch_embeddings[j]] if batch_embeddings else None,
                                documents=[batch_documents[j]] if batch_documents else None,
                                metadatas=[batch_metadatas[j]]
                            )
                            updated_count += 1
                            print(".", end="", flush=True)
                        except Exception as e:
                            print(f"\n❌ Error updating document {doc_id}: {str(e)}")
                    print("")  # New line after progress dots
        else:
            # Fallback approach: delete and re-add documents using the vector store directly
            for batch_start in range(0, doc_count, batch_size):
                batch_end = min(batch_start + batch_size, doc_count)
                batch_ids = matching_docs["ids"][batch_start:batch_end]
                batch_metadatas = []
                batch_documents = matching_docs["documents"][batch_start:batch_end] if "documents" in matching_docs else None
                batch_embeddings = matching_docs["embeddings"][batch_start:batch_end] if "embeddings" in matching_docs else None
                
                # Prepare updated metadata for each document in the batch
                for i in range(batch_start, batch_end):
                    current_metadata = dict(matching_docs["metadatas"][i])
                    current_owner = current_metadata.get("owner", "")
                    
                    if not current_owner:
                        current_metadata["owner"] = new_owner_str
                        print(f"🆕 Setting owner to: {new_owner_str}")
                    else:
                        current_owners = str(current_owner).split(",")
                        if new_owner_str not in current_owners:
                            current_owners.append(new_owner_str)
                            current_metadata["owner"] = ",".join(current_owners)
                            print(f"➕ Adding owner to list: {current_metadata['owner']}")
                        else:
                            print(f"✓ Owner {new_owner_str} already in list: {current_owner}")
                    
                    current_metadata["updated_at"] = datetime.now().isoformat()
                    batch_metadatas.append(current_metadata)
                
                if batch_metadatas:
                    print(f"📝 Sample updated metadata: {batch_metadatas[0]}")
                
                try:
                    # Try delete and add with the main vector store
                    print(f"🔄 Attempting delete and add with vector store for batch {batch_start//batch_size + 1}")
                    
                    # Check if vector_store has delete method
                    if hasattr(self.vector_store, 'delete'):
                        self.vector_store.delete(ids=batch_ids)
                        
                        # Check what add method is available
                        if hasattr(self.vector_store, 'add'):
                            self.vector_store.add(
                                ids=batch_ids,
                                embeddings=batch_embeddings,
                                documents=batch_documents,
                                metadatas=batch_metadatas
                            )
                        elif hasattr(self.vector_store, 'add_documents'):
                            # This approach is for LangChain's ChromaVectorStore
                            from langchain_core.documents import Document
                            documents = []
                            for j, doc_id in enumerate(batch_ids):
                                documents.append(
                                    Document(
                                        page_content=batch_documents[j] if batch_documents else "",
                                        metadata=batch_metadatas[j]
                                    )
                                )
                            self.vector_store.add_documents(documents, ids=batch_ids)
                        
                        updated_count += len(batch_ids)
                        print(f"✅ Updated batch {batch_start//batch_size + 1}/{(doc_count-1)//batch_size + 1} ({len(batch_ids)} documents)")
                    else:
                        print("⚠️ Vector store does not have delete method. Cannot update documents.")
                        break
                
                except Exception as batch_error:
                    print(f"❌ Error updating batch {batch_start//batch_size + 1}: {str(batch_error)}")
                    # Individual updates not attempted in this fallback approach as they likely won't work either

        # Ensure changes are persisted
        try:
            if hasattr(self.vector_store, 'persist'):
                self.vector_store.persist()
                print("💾 Changes persisted to disk via vector store")
            elif chroma_collection and hasattr(chroma_collection, 'persist'):
                chroma_collection.persist()
                print("💾 Changes persisted to disk via collection")
        except Exception as persist_error:
            print(f"⚠️ Warning: Could not explicitly persist changes: {str(persist_error)}")
            print("Changes may still be saved depending on the vector store implementation")

        # Verify updates
        if updated_count > 0:
            try:
                # Check a sample document to verify the update
                sample = self.vector_store.get(
                    where=file_filter,
                    include=["metadatas"],
                    limit=1
                )
                if sample and sample["metadatas"] and len(sample["metadatas"]) > 0:
                    sample_metadata = sample["metadatas"][0]
                    if sample_metadata.get("owner") and new_owner_str in str(sample_metadata.get("owner")).split(","):
                        print(f"✅ Verification successful - Owner updated to include: {new_owner_str}")
                        print(f"🔍 Full owner field now: {sample_metadata.get('owner')}")
                    else:
                        print(f"⚠️ Verification warning - Owner field is: {sample_metadata.get('owner')}, should include: {new_owner_str}")
            except Exception as verify_error:
                print(f"⚠️ Could not verify updates: {str(verify_error)}")

        print(f"✅ Successfully updated owner to include '{new_owner_str}' for {updated_count}/{doc_count} documents with source_file: {slug_file}")
        return updated_count
    
    async def _get_loader(self, filepath: str, filename: str):
        """Tạo loader phù hợp với định dạng file."""
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

        elif filename.endswith(".docx"):
            print("📄 Using Docx2txtLoader")
            return Docx2txtLoader(filepath)

        print("📄 Using TextLoader")
        return TextLoader(filepath)

    async def generate_chat_history_name(self, question: str):
        """Tạo tên chat history từ câu hỏi."""
        if self.vector_store:
            self.vector_store = None

        template = """
System: Bạn là một AI viết tiêu đề của một Câu hỏi.
        Hãy sử dụng ngôn từ chính xác và hấp dẫn.
        Đảm bảo rằng tiêu đề phản ánh nội dung của câu hỏi.
        Sử dụng ngôn từ phù hợp với ngữ cảnh của câu hỏi.
        Tiêu đề của bạn nên là một câu hoặc một cụm từ ngắn gọn.
        Bạn chỉ cần viết tiêu đề, không cần trả lời câu hỏi, không cần trích dẫn nguồn, không cần giải thích.
Question: {question}
Title:
"""
        prompt = ChatPromptTemplate.from_template(template)
        chain = prompt | self.llm
        return chain.invoke(question)

    async def classify_query_using_llm(self, question: str) -> dict:
        """
        Uses the LLM to classify a query into different types.
        
        Args:
            question: The user's question
            
        Returns:
            A dictionary with boolean values for each query type
        """
        try:
            classification_prompt = """
            Phân loại câu hỏi sau đây thành một hoặc nhiều loại. Chỉ trả về JSON với các trường sau, đặt là true hoặc false:
            
            Câu hỏi: "{0}"
            
            Phân loại theo các loại sau:
            1. structure_query: Liên quan đến cấu trúc thư mục, danh sách tệp tin, số lượng thư mục/tệp tin
            2. recent_file_query: Hỏi về tệp tin gần đây hoặc mới nhất
            3. general_query: Chào hỏi, giới thiệu, câu hỏi chung về trợ lý
            4. document_specific: Liên quan đến nội dung cụ thể trong tài liệu
            5. general_knowledge: Kiến thức chung không liên quan đến tài liệu (lịch sử, địa lý, khoa học...)
            
            Trả về kết quả dưới dạng JSON với cú pháp chính xác. Ví dụ:
            {{
                "structure_query": true,
                "recent_file_query": false,
                "general_query": false,
                "document_specific": false,
                "general_knowledge": false
            }}
            
            CHỈ TRẢ VỀ JSON, KHÔNG CÓ GIẢI THÍCH HAY VĂN BẢN KHÁC.
            """.format(question)
            
            messages = [
                ("system", "Bạn là một trợ lý AI chuyên phân tích và phân loại câu hỏi. Luôn trả về JSON chính xác và không kèm theo văn bản khác."),
                ("human", classification_prompt),
            ]
            
            # Get response from LLM
            response = await self.llm.ainvoke(messages)
            content = response.content if hasattr(response, "content") else str(response)
            
            # Extract JSON from the response
            import json
            import re
            
            # Look for JSON pattern in the response
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                # Parse JSON
                try:
                    classification = json.loads(json_str)
                    # Ensure all expected keys are present
                    expected_keys = ["structure_query", "recent_file_query", "general_query", 
                                    "document_specific", "general_knowledge"]
                    for key in expected_keys:
                        if key not in classification:
                            classification[key] = False
                    
                    print(f"🤖 LLM classification: {classification}")
                    return classification
                except json.JSONDecodeError as e:
                    print(f"❌ Error parsing JSON from LLM response: {e}")
                    print(f"🔍 Raw JSON string: {json_str}")
            else:
                print(f"❌ No JSON found in LLM response")
                print(f"🔍 Raw response: {content}")
            
            # Fallback to default classification if LLM classification fails
            return {
                "structure_query": False,
                "recent_file_query": False,
                "general_query": True,  # Default to general query
                "document_specific": False,
                "general_knowledge": False
            }
            
        except Exception as e:
            print(f"❌ Error in LLM classification: {e}")
            # Return default classification on error
            return {
                "structure_query": False,
                "recent_file_query": False,
                "general_query": True,  # Default to general query
                "document_specific": False,
                "general_knowledge": False
            }

    async def stream_chat(self, question: str, user_id: Optional[int] = None, histories: List[dict] = None):
        """
        Unified streaming chat function that handles three types of queries:
        1. Document-based queries: Uses vector data to find and answer questions about documents
        2. File/folder structure queries: Uses file and folder data to answer questions about system structure
        3. General knowledge queries: Responds as a general AI assistant for other questions
        
        Args:
            question: User's question string
            user_id: Optional user ID for filtering documents
            histories: Optional list of previous chat messages for context

        Yields:
            Text chunks or final response dict with answer and sources
        """
        try:
            # Try to load vector store if it's not already loaded
            if self.vector_store is None:
                self._load_vector_store()

            # Format chat history for prompt context
            chat_history_text = ""
            if histories and len(histories) > 0:
                chat_history_text = "\nLịch sử trò chuyện:\n"
                for i, msg in enumerate(histories):
                    role = "Người dùng" if msg.get("role") == "user" else "Trợ lý"
                    content = msg.get("content", "")
                    # Truncate very long messages to keep context manageable
                    if len(content) > 500:
                        content = content[:500] + "... (đã rút gọn)"
                    chat_history_text += f"{role}: {content}\n"
                chat_history_text += "\n"
                print(f"📜 Added chat history with {len(histories)} messages")

            # Get folder and file structures to provide context
            system_context = ""
            all_files = []
            all_folders = []
            
            try:
                file_model = FileModel()
                folder_model = FolderModel()
                
                print("🔍 Retrieving folders and files for system context...")
                
                all_files = file_model.get_all_files()
                print(f"📁 Retrieved {len(all_files)} files")
                
                all_folders = folder_model.get_all_folders()
                print(f"📁 Retrieved {len(all_folders)} folders")
                
                # Build folder hierarchy for tree display
                def build_folder_tree(folders, parent_id=None):
                    tree = []
                    matching_folders = [f for f in folders if f['parent_id'] == parent_id]
                    print(f"Found {len(matching_folders)} folders with parent_id={parent_id}")
                    
                    for folder in matching_folders:
                        # Create a new folder node
                        folder_node = {
                            'id': folder['id'],
                            'name': folder['name'],
                            'type': 'folder',
                            'children': build_folder_tree(folders, folder['id'])  # Recursively add children
                        }
                        # Add files that belong to this folder
                        folder_files = [f for f in all_files if f.get('folder_id') == folder['id']]
                        print(f"Folder {folder['name']} (ID: {folder['id']}) has {len(folder_files)} files")
                        
                        for file in folder_files:
                            folder_node['children'].append({
                                'id': file['id'],
                                'name': file['name'],
                                'type': 'file'
                            })
                        tree.append(folder_node)
                    return tree
                
                # Format tree as string with proper indentation
                def format_tree(tree, level=0):
                    if not tree:
                        return "  (Thư mục trống)\n"
                        
                    result = ""
                    indent = "  " * level
                    
                    for item in tree:
                        # Add folder with ID and proper indentation
                        if item['type'] == 'folder':
                            result += f"{indent}📁 {item['name']} (ID: {item['id']})\n"
                            # Add children with increased indentation
                            if item['children']:
                                result += format_tree(item['children'], level + 1)
                            else:
                                result += f"{indent}  (Thư mục trống)\n"
                        else:
                            # Add file with ID and proper indentation
                            result += f"{indent}📄 {item['name']} (ID: {item['id']})\n"
                    
                    return result
                
                # Build the folder tree starting with root folders (parent_id is None)
                folder_tree = build_folder_tree(all_folders)
                
                # Direct listing of all folders for fallback
                all_folders_list = "\nDanh sách tất cả thư mục:\n"
                for folder in all_folders:
                    all_folders_list += f"📁 {folder['name']} (ID: {folder['id']}, ParentID: {folder['parent_id']})\n"
                
                # Format system context as tree structure
                system_context = "Cấu trúc hệ thống tệp:\n"
                
                # Add formatted tree
                if folder_tree:
                    system_context += format_tree(folder_tree)
                else:
                    # If tree is empty but we have folders, use a flat list instead
                    if all_folders:
                        system_context += all_folders_list
                    else:
                        system_context += "  (Không có thư mục nào trong hệ thống)\n"
                
                # Add root files (files without a folder)
                root_files = [file for file in all_files if not file.get('folder_id')]
                if root_files:
                    system_context += "\nTệp tin gốc:\n"
                    for file in root_files:
                        system_context += f"📄 {file['name']} (ID: {file['id']})\n"
                
                # Add file count summary
                system_context += f"\nTổng số: {len(all_folders)} thư mục, {len(all_files)} tệp tin\n"
                
            except Exception as folder_error:
                print(f"❌ Error retrieving folder structure: {str(folder_error)}")
                # Create a fallback system context if folder retrieval fails
                system_context = "Không thể truy xuất cấu trúc thư mục. Lỗi: " + str(folder_error) + "\n"
                system_context += "Hãy yêu cầu người dùng kiểm tra lại kết nối cơ sở dữ liệu hoặc liên hệ với quản trị viên hệ thống.\n"

            # Common formatting instructions to be added to all prompts
            formatting_instructions = """
    Khi trả lời câu hỏi của người dùng:

    1. **Trả lời đầy đủ và rõ ràng**, không bỏ sót thông tin quan trọng.

    2. **Sắp xếp câu trả lời theo dàn ý**, sử dụng tiêu đề lớn, đầu mục và đánh số khi cần.

    3. **Dùng Markdown để định dạng thông tin**, bao gồm:
    - **Tiêu đề lớn** (`#`) để nhóm nội dung chính.
    - **Tiêu đề nhỏ hơn** (`##`, `###`) để chi tiết hóa.
    - **Danh sách có thứ tự** cho các bước hoặc quy trình.
    - **Danh sách không thứ tự** sử dụng dấu `-` hoặc `*` cho các điểm liệt kê.
    - **Bôi đậm từ khóa quan trọng** để giúp người dùng dễ nắm bắt thông tin.
    - **Gạch ngang** (`---`) để phân chia các phần khác nhau.
    - **Tạo bảng** khi cần hiển thị dữ liệu có cấu trúc.
    - **Trích dẫn** (`>`) để làm nổi bật các câu quan trọng.
    - **Liệt kê dạng checkbox** (`- [ ]`) cho danh sách công việc hoặc bước thực hiện.

    4. **Cung cấp ví dụ hoặc giải thích khi cần thiết** để giúp người dùng hiểu rõ hơn.

    5. **Luôn giữ phong cách trả lời đầy đủ, trọng tâm nhưng đầy đủ ý**.

    6. **Sử dụng ngôn ngữ đơn giản, dễ hiểu**, tránh thuật ngữ chuyên môn khi không cần thiết.

    7. **Khi kết thúc, hỏi người dùng có cần hỗ trợ gì khác không**.

    8. **Nếu không chắc chắn về câu trả lời, hãy yêu cầu người dùng cung cấp thêm thông tin**.

    9. **Nếu không thể giúp được, hãy thông báo cho người dùng biết**.

    10. **Kiểm tra lại câu trả lời trước khi gửi** để đảm bảo không có lỗi chính tả hoặc sai sót khác.
    """
            
            # Try LLM-based classification first
            llm_classification = await self.classify_query_using_llm(question)
            is_file_structure_query = llm_classification.get("structure_query", False)
            is_recent_file_query = llm_classification.get("recent_file_query", False)
            is_general_query = llm_classification.get("general_query", False)
            is_document_specific = llm_classification.get("document_specific", False)
            is_general_knowledge = llm_classification.get("general_knowledge", False)
            
            print(f"📊 Query classification (LLM): Structure={is_file_structure_query}, Recent={is_recent_file_query}, General={is_general_query}, DocSpecific={is_document_specific}, Knowledge={is_general_knowledge}")
            
            
            # 2. HANDLE GENERAL KNOWLEDGE FIRST
            # If it's clearly a general knowledge question and not about documents/files, handle directly
            if is_general_knowledge and not (is_file_structure_query or is_recent_file_query or is_document_specific):
                print("🧠 Processing as general knowledge query")
                
                # General knowledge system prompt
                system_prompt = f"""Bạn là một trợ lý AI thông minh, hỗ trợ người dùng một cách hiệu quả.
                
                Đây là câu hỏi về kiến thức chung không liên quan đến tài liệu hoặc cấu trúc hệ thống.
                Hãy cung cấp câu trả lời dựa trên kiến thức chung của bạn.
                
                {chat_history_text}
                
                {formatting_instructions}
                """
                
                messages = [
                    ("system", system_prompt),
                    ("human", question),
                ]
                
                # Stream general response
                full_response = ""
                async for chunk in self.llm.astream(messages):
                    content = chunk.content if hasattr(chunk, "content") else str(chunk)
                    full_response += content
                    yield content
                
                # Return response without sources for general knowledge
                yield {"answer": full_response, "sources": []}
                return
            
            # 3. HANDLE FILE/FOLDER STRUCTURE QUERIES
            elif is_file_structure_query:
                print("📂 Processing file/folder structure query")
                
                # Create a comprehensive response about file/folder structure
                file_structure_prompt = f"""Bạn là một trợ lý quản lý tài liệu thông minh. Người dùng đang hỏi về cấu trúc hệ thống tệp, số lượng hoặc danh sách tệp tin/thư mục.

                Hãy trả lời dựa trên dữ liệu sau:
                - Tổng số thư mục: {len(all_folders)}
                - Tổng số tệp tin: {len(all_files)}
                
                Bạn có thông tin đầy đủ về cấu trúc hệ thống như sau:
                {system_context}
                
                {chat_history_text}
                
                Câu hỏi: {question}
                
                {formatting_instructions}
                
                Lưu ý đặc biệt cho câu hỏi về cấu trúc tệp:
                - Nếu câu hỏi yêu cầu danh sách các thư mục/tệp tin, hãy liệt kê chúng theo định dạng Markdown.
                - Nếu câu hỏi liên quan đến số lượng, hãy cung cấp con số chính xác.
                - Nếu câu hỏi về cấu trúc, hãy giải thích cấu trúc phân cấp.
                - KHÔNG hiển thị ID của tệp tin hoặc thư mục trong câu trả lời.
                - Sử dụng emoji 📁 cho thư mục và 📄 cho tệp tin để làm cho câu trả lời dễ đọc hơn.
                """
                
                messages = [
                    ("system", file_structure_prompt),
                    ("human", question),
                ]
                
                # Stream file structure response
                full_response = ""
                async for chunk in self.llm.astream(messages):
                    content = chunk.content if hasattr(chunk, "content") else str(chunk)
                    full_response += content
                    yield content
                    
                # Return response without sources for file structure queries
                yield {"answer": full_response, "sources": []}
                return
                
            # 4. HANDLE DOCUMENT-BASED QUERIES
            elif self.vector_store is not None and (is_document_specific or is_recent_file_query):
                print("���� Processing document-specific query")
                
                # Convert user_id to string for compatibility with Chroma
                user_id_str = str(user_id) if user_id is not None else None
                
                # Updated filter to handle comma-separated owner lists
                filter_dict = {}
                
                if user_id_str is not None:
                    # Handle the case where owner might be a comma-separated list
                    filter_dict = {
                        "$or": [
                            # Direct match (owner is exactly user_id)
                            {"owner": user_id_str},
                            {"owner": int(user_id) if user_id is not None else None},
                            # Pattern match (owner contains user_id in comma-separated list)
                            # These operators work with Chroma's filtering system
                            {"owner": {"$contains": f",{user_id_str},"}},
                            {"owner": {"$contains": f"{user_id_str},"}},
                            {"owner": {"$contains": f",{user_id_str}"}},
                            # Shared with field
                            {"shared_with": user_id_str}
                        ],  
                    }
                
                print(f"🔍 Searching with filter: {filter_dict}")
                
                # Set retriever without file filtering to search across all documents
                retriever = self.vector_store.as_retriever(
                    search_kwargs={"filter": filter_dict}
                )
                
                # Handle recent file queries specifically
                if is_recent_file_query:
                    print("🔄 Processing query about recent files")
                    try:
                        # Get all documents for this user with metadata
                        results = self.vector_store.get(
                            where=filter_dict,
                            include=["documents", "metadatas"],
                            limit=100  # Limit to reasonable number
                        )
                        
                        if results and results['metadatas']:
                            print(f"📊 Found {len(results['metadatas'])} documents to sort")
                            
                            # Create Document objects with metadata
                            from langchain_core.documents import Document
                            all_docs = []
                            
                            for i, (text, metadata) in enumerate(zip(results['documents'], results['metadatas'])):
                                # Extract the updated_at timestamp
                                timestamp = metadata.get('updated_at')
                                if timestamp:
                                    doc = Document(page_content=text, metadata=metadata)
                                    all_docs.append(doc)
                            
                            # Sort documents by timestamp (most recent first)
                            if all_docs:
                                all_docs.sort(key=lambda x: x.metadata.get('updated_at', ''), reverse=True)
                                print(f"🕒 Sorted {len(all_docs)} documents by timestamp")
                                
                                # Take the most recent documents
                                docs = all_docs[:5]  # Limit to top 5 most recent
                                
                                # Debug the metadata of the most recent document
                                if docs:
                                    print(f"🔍 Most recent document metadata: {docs[0].metadata}")
                            else:
                                print("⚠️ No documents with timestamp found")
                                docs = []
                        else:
                            print("⚠️ No documents found for the user")
                            docs = []
                            
                    except Exception as sort_error:
                        print(f"❌ Error sorting by recency: {sort_error}")
                        # Fall back to regular retrieval
                        docs = await retriever.ainvoke(question)
                else:
                    # Regular semantic search for other queries
                    docs = await retriever.ainvoke(question)
                
                # If we found relevant documents, use them to answer
                if docs:
                    print(f"📄 Found {len(docs)} relevant documents")
                    # Debug first document's metadata
                    if docs and len(docs) > 0:
                        print(f"🔍 First result metadata: {docs[0].metadata}")
                    
                    # Prepare document context
                    context = "\n".join([doc.page_content for doc in docs])
                    
                    # Document-based query using messages format for Google Gemini
                    message_template = f"""Bạn là một trợ lý hữu ích và hiểu biết. 
                    
                    {formatting_instructions}
                    
                    Câu trả lời của bạn nên:
                    - Dựa trên thông tin trong các tài liệu được cung cấp
                    - Luôn trích dẫn tài liệu nguồn nhưng KHÔNG bao gồm ID của tệp tin
                    - Chính xác và đầy đủ trong tài liệu tham khảo của bạn
                    - Nếu thông tin trong tài liệu không đủ để trả lời đầy đủ, hãy nêu rõ điều đó
                    - Sử dụng Markdown để định dạng văn bản
                    - Không hiển thị ID của tệp tin hoặc thông tin kỹ thuật
                    - Khi kết thúc, hỏi người dùng có cần thêm thông tin không
                    
                    LƯU Ý ĐẶC BIỆT: 
                    - Không bao giờ bao gồm ID của tệp trong phản hồi của bạn
                    - Nếu tài liệu không chứa thông tin về chủ đề của câu hỏi, hãy nói rõ rằng: "Tài liệu được cung cấp không chứa thông tin về [chủ đề]"
                    
                    {chat_history_text}
                    
                    Thông tin về hệ thống:
                    {system_context}
                    
                    Context: {context}"""
                    
                    messages = [
                        ("system", message_template),
                        ("human", question),
                    ]
                    
                    # For recent file queries, provide explicit information
                    if is_recent_file_query and docs:
                        # Prepare recency information
                        recent_files_info = "\n\nThông tin về tệp tin gần đây:\n"
                        for i, doc in enumerate(docs[:5]):  # Limit to top 5
                            file_name = doc.metadata.get('source_file', 'Unknown')
                            date = doc.metadata.get('updated_at', 'Unknown date')
                            # Remove file ID from the listing
                            recent_files_info += f"{i+1}. Tệp tin: {file_name}, Ngày: {date}\n"
                        
                        # Add this information to the system message
                        messages[0] = (
                            "system", 
                            messages[0][1] + recent_files_info + "\n\nĐây là câu hỏi về tệp tin gần đây. Hãy đề cập đến tệp mới nhất với tên và ngày cập nhật, KHÔNG hiển thị ID."
                        )
                    
                    # Stream response with document context
                    full_response = ""
                    async for chunk in self.llm.astream(messages):
                        content = chunk.content if hasattr(chunk, "content") else str(chunk)
                        full_response += content
                        yield content
                    
                    # Return response with sources for document queries
                    yield {
                        "answer": full_response,
                        "sources": [doc.metadata.get("source_file") for doc in docs[:1]]
                    }
                    return
                
                # If we don't have relevant documents for a document-specific query, inform user
                if is_document_specific:
                    print("⚠️ No relevant documents found for document-specific query")
                    
                    no_docs_message = f"""Bạn là một trợ lý AI thông minh, hỗ trợ người dùng một cách hiệu quả.
                    
                    {formatting_instructions}
                    
                    LƯU Ý QUAN TRỌNG: Không tìm thấy tài liệu liên quan đến câu hỏi của người dùng.
                    Hãy bắt đầu câu trả lời bằng việc thông báo rằng: "Tôi không tìm thấy thông tin liên quan trong tài liệu của bạn."
                    
                    {chat_history_text}
                    
                    Câu hỏi này dường như liên quan đến tài liệu cụ thể. Hãy giải thích rằng không có tài liệu nào chứa thông tin được yêu cầu, và đề xuất người dùng thử các từ khóa khác hoặc tải lên tài liệu có thông tin liên quan.
                    
                    Thông tin về hệ thống:
                    {system_context}"""
                    
                    messages = [
                        ("system", no_docs_message),
                        ("human", question),
                    ]
                    
                    # Stream response for document-specific query without results
                    full_response = ""
                    async for chunk in self.llm.astream(messages):
                        content = chunk.content if hasattr(chunk, "content") else str(chunk)
                        full_response += content
                        yield content
                    
                    # Return response without sources
                    yield {"answer": full_response, "sources": []}
                    return
            
            # 5. TRY SEMANTIC SEARCH FOR REMAINING QUERIES
            # For queries that haven't been clearly classified, try semantic search first
            if self.vector_store is not None:
                print("🔍 Trying semantic search for unclassified query")
                
                # Convert user_id to string for compatibility with Chroma
                user_id_str = str(user_id) if user_id is not None else None
                
                # Updated filter to handle comma-separated owner lists
                filter_dict = {}
                
                if user_id_str is not None:
                    # Handle the case where owner might be a comma-separated list
                    filter_dict = {
                        "$or": [
                            # Direct match (owner is exactly user_id)
                            {"owner": user_id_str},
                            {"owner": int(user_id) if user_id is not None else None},
                            # Pattern match (owner contains user_id in comma-separated list)
                            # These operators work with Chroma's filtering system
                            {"owner": {"$contains": f",{user_id_str},"}},
                            {"owner": {"$contains": f"{user_id_str},"}},
                            {"owner": {"$contains": f",{user_id_str}"}},
                            # Shared with field
                            {"shared_with": user_id_str}
                        ],  
                    }
                
                # Set retriever
                retriever = self.vector_store.as_retriever(
                    search_kwargs={"filter": filter_dict}
                )
                
                # Try semantic search
                docs = await retriever.ainvoke(question)
                
                # If relevant documents found AND the question might be document-related, use them
                if docs and len(docs) > 0:
                    # Evaluate the semantic similarity - we need to check if these documents are actually relevant
                    # For simplicity, let's assume a threshold of similarity
                    content_sample = docs[0].page_content[:200].lower()  # Sample content
                    question_lower = question.lower()
                    
                    # Basic check for relevance by looking for common words
                    question_words = set(question_lower.split())
                    content_words = set(content_sample.split())
                    common_words = question_words.intersection(content_words)
                    
                    # Filter out common stop words
                    stop_words = {"và", "hoặc", "là", "của", "trong", "có", "được", "những", "các", "với", "cho", "này", "đó", "và", "một", "từ", "về", "tôi", "bạn", "hãy", "xin", "vui", "lòng"}
                    relevant_common_words = common_words - stop_words
                    
                    # If we have enough relevant common words, consider it relevant
                    if len(relevant_common_words) >= 2:
                        print(f"📄 Found {len(docs)} potentially relevant documents with {len(relevant_common_words)} common keywords")
                        
                        # Prepare document context
                        context = "\n".join([doc.page_content for doc in docs])
                        
                        # Document-based query using messages format
                        message_template = f"""Bạn là một trợ lý hữu ích và hiểu biết. 
                        
                        {formatting_instructions}
                        
                        KIỂM TRA TÍNH LIÊN QUAN: 
                        Trước tiên, hãy đánh giá xem tài liệu được cung cấp có liên quan đến câu hỏi không. Nếu tài liệu KHÔNG liên quan đến chủ đề của câu hỏi, hãy trả lời dựa trên kiến thức chung của bạn mà KHÔNG đề cập đến tài liệu.
                        
                        {chat_history_text}
                        
                        Nếu tài liệu CÓ LIÊN QUAN, câu trả lời của bạn nên:
                        - Dựa trên thông tin trong các tài liệu được cung cấp
                        - Luôn trích dẫn tài liệu nguồn nhưng KHÔNG bao gồm ID của tệp tin
                        - Chính xác và đầy đủ trong tài liệu tham khảo của bạn
                        - Sử dụng Markdown để định dạng văn bản
                        
                        LƯU Ý ĐẶC BIỆT: 
                        - Nếu đây là câu hỏi về kiến thức chung không liên quan đến tài liệu (như về địa điểm, lịch sử, khoa học), hãy trả lời từ kiến thức chung của bạn.
                        - Không bao giờ bao gồm ID của tệp trong phản hồi của bạn
                        
                        Thông tin về hệ thống:
                        {system_context}
                        
                        Context: {context}"""
                        
                        messages = [
                            ("system", message_template),
                            ("human", question),
                        ]
                        
                        # Stream response
                        full_response = ""
                        async for chunk in self.llm.astream(messages):
                            content = chunk.content if hasattr(chunk, "content") else str(chunk)
                            full_response += content
                            yield content
                        
                        # Check if the response suggests it's using document data
                        document_usage_indicators = [
                            "theo tài liệu", "trong tài liệu", "tài liệu đề cập", 
                            "dựa trên tài liệu", "tài liệu cung cấp"
                        ]
                        
                        is_using_document = any(indicator in full_response.lower() for indicator in document_usage_indicators)
                        
                        # Return response with sources only if it actually used the documents
                        if is_using_document:
                            yield {
                                "answer": full_response,
                                "sources": [doc.metadata.get("source_file") for doc in docs[:1]]
                            }
                        else:
                            yield {
                                "answer": full_response,
                                "sources": []
                            }
                        return
            
            # 6. HANDLE AS GENERAL KNOWLEDGE QUERY for everything else
            print("🧠 Processing as general knowledge query (final fallback)")
            
            # General knowledge system prompt
            system_prompt = f"""Bạn là một trợ lý AI thông minh, hỗ trợ người dùng một cách hiệu quả.
            
            {formatting_instructions}
            
            Đây là câu hỏi về kiến thức chung không liên quan đến tài liệu hoặc cấu trúc hệ thống.
            Hãy cung cấp câu trả lời dựa trên kiến thức chung của bạn.
            
            {chat_history_text}
            """
            
            messages = [
                ("system", system_prompt),
                ("human", question),
            ]
            
            # Stream general response
            full_response = ""
            async for chunk in self.llm.astream(messages):
                content = chunk.content if hasattr(chunk, "content") else str(chunk)
                full_response += content
                yield content
            
            # Return response without sources for general knowledge
            yield {"answer": full_response, "sources": []}

        except Exception as e:
            # Handle errors gracefully
            error_message = f"Xin lỗi, đã xảy ra lỗi khi xử lý câu hỏi của bạn: {str(e)}"
            yield error_message
            yield {"answer": error_message, "sources": []}
