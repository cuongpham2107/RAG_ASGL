"""
Module quản lý vector store cho hệ thống RAG.
"""

import os
from datetime import datetime
from typing import Dict, List, Optional, Any

from langchain_chroma import Chroma

class VectorStoreManager:
    """
    Quản lý vector store cho hệ thống RAG.
    Xử lý tải, cập nhật, và truy vấn vector store.
    """
    
    def __init__(self, embeddings, vector_store_dir: str):
        """
        Khởi tạo VectorStoreManager.
        
        Args:
            embeddings: Embedding model được sử dụng
            vector_store_dir: Đường dẫn thư mục lưu vector store
        """
        self.embeddings = embeddings
        self.vector_store_dir = vector_store_dir
        self.vector_store = None
        self._load_vector_store()
    
    def _load_vector_store(self):
        """Tải vector store nếu có sẵn."""
        try:
            if os.path.exists(self.vector_store_dir) and os.listdir(
                self.vector_store_dir
            ):
                # Check if we have write permissions to the directory
                if not os.access(self.vector_store_dir, os.W_OK):
                    print(f"⚠️ Warning: No write permission to {self.vector_store_dir}")
                    # Try to fix permissions
                    try:
                        os.chmod(self.vector_store_dir, 0o755)
                        print("✅ Fixed directory permissions")
                    except Exception as perm_error:
                        print(f"❌ Could not fix permissions: {perm_error}")
                
                self.vector_store = Chroma(
                    persist_directory=self.vector_store_dir,
                    embedding_function=self.embeddings,
                )
                print("✅ Vector store loaded successfully!")
            else:
                print(
                    "⚠️ No vector store found. Please upload and process documents first."
                )
                # Ensure the directory exists with proper permissions
                os.makedirs(self.vector_store_dir, exist_ok=True)
                os.chmod(self.vector_store_dir, 0o755)
        except Exception as e:
            print(f"❌ Error loading vector store: {e}")
            self.vector_store = None
    
    def add_documents(self, documents: List, batch_size: int = 10):
        """
        Thêm documents vào vector store theo batch.
        
        Args:
            documents: Danh sách documents cần thêm
            batch_size: Kích thước mỗi batch
            
        Returns:
            bool: True nếu thành công, False nếu thất bại
        """
        try:
            if self.vector_store is None:
                try:
                    self.vector_store = Chroma(
                        persist_directory=self.vector_store_dir,
                        embedding_function=self.embeddings,
                    )
                    print("✅ Created new vector store")
                except Exception as vs_error:
                    print(f"Failed to create vector store: {vs_error}")
                    return False
            
            # Kiểm tra và xử lý trường owner trong metadata
            for doc in documents:
                if hasattr(doc, 'metadata') and 'owner' in doc.metadata:
                    current_owner = doc.metadata['owner']
                    owners = []
                    
                    # Chuyển đổi owner thành mảng
                    if isinstance(current_owner, list):
                        owners = [str(o) for o in current_owner]
                    elif isinstance(current_owner, str) and current_owner:
                        # Nếu là chuỗi JSON array
                        if current_owner.startswith('[') and current_owner.endswith(']'):
                            try:
                                import json
                                owners = [str(o) for o in json.loads(current_owner)]
                            except json.JSONDecodeError:
                                owners = [current_owner]
                        # Nếu là chuỗi phân tách bằng dấu phẩy
                        elif ',' in current_owner:
                            owners = [o.strip() for o in current_owner.split(',')]
                        else:
                            owners = [current_owner]
                    
                    # Lưu trở lại thành chuỗi JSON để tương thích với ChromaDB filter
                    import json
                    doc.metadata['owner'] = json.dumps(owners)
                    print(f"📝 Document owner field formatted: {doc.metadata['owner']}")
            
            for i in range(0, len(documents), batch_size):
                batch = documents[i : i + batch_size]
                max_retries = 5
                
                for retry in range(max_retries):
                    try:
                        ids = self.vector_store.add_documents(batch)
                        print(f"✅ Processed batch {i//batch_size + 1}/{(len(documents)-1)//batch_size + 1} - Added {len(ids)} documents")
                        break
                    except Exception as e:
                        error_msg = str(e).lower()
                        if "readonly database" in error_msg:
                            print(f"⚠️ Retry {retry+1}/{max_retries}: Database is readonly, waiting before retry...")
                            import time
                            
                            # Exponential backoff
                            wait_time = 2 * (retry + 1)
                            print(f"⏱️ Waiting {wait_time} seconds before retry...")
                            time.sleep(wait_time)
                            
                            # Reset connection on every other retry
                            if retry % 2 == 1:
                                try:
                                    print("🔄 Attempting to reset vector store connection...")
                                    temp_vs = self.vector_store
                                    self.vector_store = None
                                    time.sleep(1)
                                    self.vector_store = Chroma(
                                        persist_directory=self.vector_store_dir,
                                        embedding_function=self.embeddings,
                                    )
                                    print("✅ Vector store connection reset")
                                except Exception as reset_error:
                                    print(f"⚠️ Failed to reset connection: {reset_error}")
                                    self.vector_store = temp_vs
                            
                            if retry == max_retries - 1:
                                # Try adding documents one by one on last retry
                                try:
                                    print("🔧 Attempting alternative document addition approach...")
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
                                        print("Could not add any documents individually")
                                        return False
                                except Exception as alt_error:
                                    print(f"❌ Alternative approach failed: {alt_error}")
                                    return False
                        else:
                            print(f"❌ Non-readonly error: {error_msg}")
                            return False
            
            self._persist_changes()
            return True
            
        except Exception as e:
            print(f"❌ Error adding documents: {str(e)}")
            return False
    
    def _persist_changes(self):
        """Đảm bảo thay đổi cửa hàng vector vẫn tồn tại trong đĩa"""
        try:
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
        except Exception as e:
            print(f"⚠️ Error persisting vector store: {str(e)}")
    
    def delete_documents(self, slug_file: str) -> int:
        """
        Xóa tài liệu từ vector store dựa trên slug_file.
        
        Args:
            slug_file: Tên file nguồn cần xóa
            
        Returns:
            int: Số lượng documents đã xóa
        """
        if not self.vector_store:
            self._load_vector_store()
            if not self.vector_store:
                raise ValueError("🚨 Vector store is not set. Please process files first.")

        # Validate input
        if not slug_file:
            raise ValueError("🚨 Empty slug_file provided. Cannot proceed with deletion.")

        # Create proper filter with correct syntax
        file_filter = {"source_file": slug_file}
        print(f"🔍 Planning to delete documents with filter: {file_filter}")

        # Check if documents exist before attempting deletion
        try:
            matching_docs = self.vector_store.get(
                where=file_filter,
                include=["metadatas"],
                limit=1
            )
            
            if not matching_docs or len(matching_docs["ids"]) == 0:
                print(f"⚠️ No documents found with source_file: {slug_file}")
                return 0  # Return 0 to indicate no documents were deleted
                
            # Get total count of documents to be deleted
            count = len(self.vector_store.get(where=file_filter, include=[])["ids"])
            print(f"🔍 Found {count} documents to delete")
            
            # Proceed with deletion
            self.vector_store.delete(where=file_filter)
            print(f"✅ Successfully deleted {count} documents!")
            
            # Persist changes
            self._persist_changes()
            return count
        except Exception as e:
            print(f"❌ Error during document deletion: {str(e)}")
            raise ValueError(f"Failed to delete documents: {str(e)}")
    
    def update_document_owner(self, slug_file: str, new_owner: str) -> int:
        """
        Cập nhật trường 'owner' cho các tài liệu dựa trên slug_file.
        Owner được lưu dạng chuỗi trực tiếp cho phù hợp với filter Chroma

        Args:
            slug_file: Tên file nguồn cần tìm để cập nhật
            new_owner: Chủ sở hữu mới cần gán cho tài liệu

        Returns:
            int: Số lượng tài liệu đã được cập nhật
        """
        if not self.vector_store:
            self._load_vector_store()
            if not self.vector_store:
                raise ValueError("🚨 Vector store is not set. Please process files first.")

        # Validate input
        if not slug_file:
            print("⚠️ Empty slug_file provided")
            return 0
        
        # Ensure new_owner is a string
        new_owner_str = str(new_owner)
        print(f"🔑 New owner will be set to: {new_owner_str}")
        
        # Lọc tài liệu có source_file trùng khớp với slug_file
        file_filter = {"source_file": slug_file}
        print(f"🔍 Finding documents with filter: {file_filter}")

        # Get chroma collection for direct access if possible
        chroma_collection = None
        if hasattr(self.vector_store, '_collection'):
            chroma_collection = self.vector_store._collection
        elif hasattr(self.vector_store, 'collection'):
            chroma_collection = self.vector_store.collection

        try:
            # Tìm tất cả các tài liệu cần cập nhật
            matching_docs = self.vector_store.get(
                where=file_filter,
                include=["documents", "metadatas", "embeddings"]
            )
            
            if not matching_docs or len(matching_docs["ids"]) == 0:
                print(f"⚠️ No documents found with source_file: {slug_file}")
                return 0
            
            # Prepare for updating
            doc_count = len(matching_docs["ids"])
            print(f"📄 Found {doc_count} documents to update")
            updated_count = 0
            
            # Process in smaller batches to avoid overwhelming the database
            batch_size = 5
            
            for batch_start in range(0, doc_count, batch_size):
                batch_end = min(batch_start + batch_size, doc_count)
                batch_ids = matching_docs["ids"][batch_start:batch_end]
                batch_docs = []
                
                # Prepare documents for this batch
                for i in range(batch_start, batch_end):
                    doc_id = matching_docs["ids"][i]
                    metadata = dict(matching_docs["metadatas"][i])
                    document = matching_docs["documents"][i] if "documents" in matching_docs else None
                    embedding = matching_docs["embeddings"][i] if "embeddings" in matching_docs else None
                    
                    # Lưu trực tiếp new_owner mới vào metadata
                    # Important: Chroma không hỗ trợ $contains hay các phép filter phức tạp,
                    # nên ta lưu chính xác user_id vào field owner để dùng $eq operator sau này
                    metadata["owner"] = new_owner_str
                    print(f"📝 Set owner field directly: {metadata['owner']}")
                    
                    # Remove any existing owner_X fields that might be present
                    keys_to_remove = [k for k in metadata.keys() if k.startswith("owner_") and k != "owner"]
                    for key in keys_to_remove:
                        metadata.pop(key, None)
                    
                    # Update timestamp
                    metadata["updated_at"] = datetime.now().isoformat()
                    
                    # Store document for batch update
                    batch_docs.append({
                        "id": doc_id,
                        "metadata": metadata,
                        "document": document,
                        "embedding": embedding
                    })
                
                # Try to update the documents
                self._update_document_batch(batch_docs, chroma_collection)
                updated_count += len(batch_docs)
        
        except Exception as e:
            print(f"❌ Error updating documents: {str(e)}")
            return 0
        
        # Persist changes
        self._persist_changes()
        
        print(f"\n✅ Successfully updated owner to '{new_owner_str}' for {updated_count}/{doc_count} documents with source_file: {slug_file}")
        return updated_count
    
    def delete_document_owner(self, slug_file: str, owner_id: str) -> int:
        """
        Xóa owner_id khỏi các tài liệu dựa trên slug_file.
        Trường owner được lưu dưới dạng mảng [1,2,3], hàm sẽ loại bỏ owner_id khỏi mảng.

        Args:
            slug_file (str): Tên file nguồn cần tìm để cập nhật
            owner_id (str): ID chủ sở hữu cần xóa khỏi tài liệu

        Returns:
            int: Số lượng tài liệu đã được cập nhật
        """
        if not self.vector_store:
            self._load_vector_store()
            if not self.vector_store:
                raise ValueError("🚨 Vector store is not set. Please process files first.")

        # Validate input
        if not slug_file or not owner_id:
            print("⚠️ Empty slug_file or owner_id provided")
            return 0
        
        # Ensure owner_id is a string
        owner_id_str = str(owner_id)
        print(f"🔑 Owner ID to be removed: {owner_id_str}")
        
        # Lọc tài liệu có source_file trùng khớp với slug_file
        file_filter = {"source_file": slug_file}
        print(f"🔍 Finding documents with filter: {file_filter}")

        # Get chroma collection for direct access if possible
        chroma_collection = None
        if hasattr(self.vector_store, '_collection'):
            chroma_collection = self.vector_store._collection
        elif hasattr(self.vector_store, 'collection'):
            chroma_collection = self.vector_store.collection

        try:
            # Tìm tất cả các tài liệu cần cập nhật
            matching_docs = self.vector_store.get(
                where=file_filter,
                include=["documents", "metadatas", "embeddings"]
            )
            
            if not matching_docs or len(matching_docs["ids"]) == 0:
                print(f"⚠️ No documents found with source_file: {slug_file}")
                return 0
            
            # Prepare for updating
            doc_count = len(matching_docs["ids"])
            print(f"📄 Found {doc_count} documents to update")
            updated_count = 0
            
            # Process in smaller batches to avoid overwhelming the database
            batch_size = 5
            
            for batch_start in range(0, doc_count, batch_size):
                batch_end = min(batch_start + batch_size, doc_count)
                batch_ids = matching_docs["ids"][batch_start:batch_end]
                batch_docs = []
                
                # Prepare documents for this batch
                for i in range(batch_start, batch_end):
                    doc_id = matching_docs["ids"][i]
                    metadata = dict(matching_docs["metadatas"][i])
                    document = matching_docs["documents"][i] if "documents" in matching_docs else None
                    embedding = matching_docs["embeddings"][i] if "embeddings" in matching_docs else None
                    
                    # Remove owner from metadata
                    if "owner" in metadata:
                        current_owner = metadata["owner"]
                        
                        # Trường hợp 1: owner là mảng JSON dạng chuỗi [1,2,3]
                        if isinstance(current_owner, str) and current_owner.startswith("[") and current_owner.endswith("]"):
                            try:
                                import json
                                # Parse chuỗi JSON thành mảng Python
                                owners_array = json.loads(current_owner)
                                # Loại bỏ owner_id khỏi mảng (đảm bảo các giá trị là chuỗi để so sánh)
                                if isinstance(owners_array, list):
                                    owners_array = [str(owner) for owner in owners_array if str(owner) != owner_id_str]
                                    metadata["owner"] = json.dumps(owners_array)
                                    print(f"Updated owner array: {metadata['owner']}")
                            except json.JSONDecodeError:
                                # Nếu không phải JSON hợp lệ, thử xử lý như chuỗi thông thường
                                owner_str = current_owner.strip('[]').replace("'", "").replace('"', "")
                                owners = [o.strip() for o in owner_str.split(",") if o.strip()]
                                if owner_id_str in owners:
                                    owners.remove(owner_id_str)
                                metadata["owner"] = str(owners)
                                print(f"Updated owner string representation: {metadata['owner']}")
                        
                        # Trường hợp 2: owner là chuỗi đơn giản như "1,2,3"
                        elif isinstance(current_owner, str) and "," in current_owner:
                            owners = [o.strip() for o in current_owner.split(",") if o.strip()]
                            if owner_id_str in owners:
                                owners.remove(owner_id_str)
                            metadata["owner"] = ",".join(owners)
                            print(f"Updated comma-separated owner: {metadata['owner']}")
                        
                        # Trường hợp 3: owner là giá trị đơn
                        elif str(current_owner) == owner_id_str:
                            metadata["owner"] = ""
                            print("Removed single owner value")
                    
                    # Update timestamp
                    metadata["updated_at"] = datetime.now().isoformat()
                    
                    # Store document for batch update
                    batch_docs.append({
                        "id": doc_id,
                        "metadata": metadata,
                        "document": document,
                        "embedding": embedding
                    })
                
                # Try to update the documents
                self._update_document_batch(batch_docs, chroma_collection)
                updated_count += len(batch_docs)
        
        except Exception as e:
            print(f"❌ Error updating documents: {str(e)}")
            return 0
        
        # Persist changes
        self._persist_changes()
        
        print(f"\n✅ Successfully removed owner '{owner_id_str}' from {updated_count}/{doc_count} documents with source_file: {slug_file}")
        return updated_count
    
    def _update_document_batch(self, batch_docs, chroma_collection=None):
        """Helper method to update a batch of documents in the vector store"""
        try:
            # Use direct collection access if available
            if chroma_collection:
                for doc in batch_docs:
                    try:
                        # Delete and re-add is more reliable than update for ChromaDB
                        chroma_collection.delete(ids=[doc["id"]])
                        
                        # Add back with updated metadata
                        chroma_collection.add(
                            ids=[doc["id"]],
                            documents=[doc["document"]] if doc["document"] is not None else None,
                            embeddings=[doc["embedding"]] if doc["embedding"] is not None else None,
                            metadatas=[doc["metadata"]]
                        )
                        print(".", end="", flush=True)
                    except Exception as e:
                        print(f"\n⚠️ Error updating document {doc['id']}: {str(e)}")
            
            # Fallback to vector store methods
            else:
                for doc in batch_docs:
                    try:
                        # Delete existing document
                        self.vector_store.delete(ids=[doc["id"]])
                        
                        # Re-add with updated metadata
                        if hasattr(self.vector_store, "add"):
                            self.vector_store.add(
                                ids=[doc["id"]],
                                documents=[doc["document"]] if doc["document"] is not None else None,
                                embeddings=[doc["embedding"]] if doc["embedding"] is not None else None,
                                metadatas=[doc["metadata"]]
                            )
                        elif hasattr(self.vector_store, "add_documents"):
                            from langchain_core.documents import Document
                            self.vector_store.add_documents(
                                [Document(page_content=doc["document"], metadata=doc["metadata"])],
                                ids=[doc["id"]]
                            )
                        print(".", end="", flush=True)
                    except Exception as e:
                        print(f"\n⚠️ Error updating document {doc['id']}: {str(e)}")
        
        except Exception as batch_error:
            print(f"\n❌ Error updating batch: {str(batch_error)}")
    
    def get_retriever(self, filter_dict=None, k=50):
        """
        Lấy retriever từ vector store với các tùy chọn tìm kiếm.
        
        Args:
            filter_dict: Dictionary để lọc kết quả tìm kiếm
            k: Số lượng kết quả trả về
            
        Returns:
            Retriever đã cấu hình
        """
        if not self.vector_store:
            self._load_vector_store()
            
        search_kwargs = {
            "k": k,
            "fetch_k": 20,   # xét 20 tài liệu trước khi chọn
            "lambda_mult": 0.5  # cân bằng 50% liên quan, 50% đa dạng
        }
         
        
        if filter_dict:
            print(f"🔍 Original filter: {filter_dict}")
            search_kwargs={
                "dfilter": filter_dict,
                "k": k,
                "fetch_k": 20,   # xét 20 tài liệu trước khi chọn
                "lambda_mult": 0.5  # cân bằng 50% liên quan, 50% đa dạng
            }
        
        return self.vector_store.as_retriever(
            search_type="mmr",
            search_kwargs=search_kwargs
        )