"""
Module quản lý trò chuyện cho hệ thống RAG.
"""

import json
import re
from typing import Dict, List, Optional, Any, Union, Generator
import numpy as np

from langchain_core.prompts import ChatPromptTemplate
from app.core.config import rag_configs
from app.models.file import FileModel
from app.models.folder import FolderModel


class ChatManager:
    """
    Quản lý trò chuyện và xử lý câu hỏi cho hệ thống RAG.
    """

    def __init__(self, llm, embeddings):
        """
        Khởi tạo ChatManager.

        Args:
            llm: Language model được sử dụng để trả lời
            embeddings: Embedding model được sử dụng để so sánh ngữ nghĩa
        """
        self.llm = llm
        self.embeddings = embeddings
        self._cached_system_data = None

    async def generate_chat_history_name(self, question: str) -> str:
        """
        Tạo tên chat history từ câu hỏi.

        Args:
            question: Câu hỏi của người dùng

        Returns:
            str: Tên phù hợp cho lịch sử chat
        """
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
        response = await chain.ainvoke({"question": question})
        return response.content if hasattr(response, "content") else str(response)

    async def classify_query_using_llm(self, question: str) -> dict:
        """
        Phân loại câu hỏi thành các loại khác nhau sử dụng LLM.

        Args:
            question: Câu hỏi của người dùng

        Returns:
            dict: Dictionary với các giá trị boolean cho từng loại query
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
            
            Trả về kết quả dưới dạng JSON với cú pháp chính xác. Ví dụ:
            {{
                "structure_query": true,
                "recent_file_query": false,
                "general_query": false,
                "document_specific": false
            }}
            
            CHỈ TRẢ VỀ JSON, KHÔNG CÓ GIẢI THÍCH HAY VĂN BẢN KHÁC.
            """.format(
                question
            )

            messages = [
                (
                    "system",
                    "Bạn là một trợ lý AI chuyên phân tích và phân loại câu hỏi. Luôn trả về JSON chính xác và không kèm theo văn bản khác.",
                ),
                ("human", classification_prompt),
            ]

            # Get response from LLM
            response = await self.llm.ainvoke(messages)
            content = (
                response.content if hasattr(response, "content") else str(response)
            )

            # Extract JSON from the response
            import json
            import re

            # Look for JSON pattern in the response
            json_match = re.search(r"\{.*\}", content, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                # Parse JSON
                try:
                    classification = json.loads(json_str)
                    # Ensure all expected keys are present
                    expected_keys = [
                        "structure_query",
                        "recent_file_query",
                        "general_query",
                        "document_specific",
                    ]
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

            # Fallback to default classification
            return {
                "structure_query": False,
                "recent_file_query": False,
                "general_query": True,  # Default to general query
                "document_specific": False,
            }

        except Exception as e:
            print(f"❌ Error in LLM classification: {e}")
            # Return default classification on error
            return {
                "structure_query": False,
                "recent_file_query": False,
                "general_query": True,  # Default to general query
                "document_specific": False,
            }

    def _is_semantically_relevant(self, question: str, documents: List) -> bool:
        """
        Kiểm tra xem tài liệu có liên quan ngữ nghĩa với câu hỏi không.

        Args:
            question: Câu hỏi của người dùng
            documents: Danh sách các tài liệu để kiểm tra

        Returns:
            bool: True nếu tài liệu có liên quan, False nếu không
        """
        if not documents:
            return False

        try:
            # Tính toán vector embedding cho câu hỏi
            question_embedding = self.embeddings.embed_query(question)

            # Tính toán vector embedding cho mỗi tài liệu
            doc_embeddings = [
                self.embeddings.embed_query(doc.page_content) for doc in documents
            ]

            # Tính toán độ tương đồng cosine giữa câu hỏi và mỗi tài liệu
            similarities = [
                self._cosine_similarity(question_embedding, doc_emb)
                for doc_emb in doc_embeddings
            ]

            # Lấy độ tương đồng cao nhất
            max_similarity = max(similarities) if similarities else 0
            print(f"🔍 Max semantic similarity: {max_similarity:.4f}")

            # Nếu độ tương đồng cao hơn ngưỡng, tài liệu được coi là liên quan
            # Ngưỡng 0.75 có thể điều chỉnh dựa trên yêu cầu cụ thể
            return max_similarity > 0.75

        except Exception as e:
            print(f"❌ Error calculating semantic relevance: {e}")
            return False

    def _cosine_similarity(self, vec1, vec2):
        """Tính toán độ tương đồng cosine giữa hai vector"""
        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)

        if norm1 == 0 or norm2 == 0:
            return 0

        return dot_product / (norm1 * norm2)

    def _evaluate_semantic_relevance(self, question: str, documents: List) -> Dict:
        """
        Đánh giá và phân loại độ liên quan ngữ nghĩa giữa câu hỏi và tài liệu theo thang điểm.

        Args:
            question: Câu hỏi của người dùng
            documents: Danh sách các tài liệu để đánh giá

        Returns:
            Dict: {
                "high_relevance": [tài liệu có độ liên quan cao (>0.8)],
                "medium_relevance": [tài liệu có độ liên quan trung bình (0.65-0.8)],
                "low_relevance": [tài liệu có liên quan thấp (0.5-0.65)],
                "max_score": số điểm cao nhất,
                "avg_score": điểm trung bình
            }
        """
        if not documents:
            return {
                "high_relevance": [],
                "medium_relevance": [],
                "low_relevance": [],
                "max_score": 0,
                "avg_score": 0,
            }

        try:
            # Tính toán vector embedding cho câu hỏi
            question_embedding = self.embeddings.embed_query(question)

            # Tính toán vector embedding cho mỗi tài liệu và điểm tương đồng
            documents_with_scores = []
            for doc in documents:
                doc_embedding = self.embeddings.embed_query(doc.page_content)
                similarity_score = self._cosine_similarity(
                    question_embedding, doc_embedding
                )
                documents_with_scores.append((doc, similarity_score))

            # Phân loại tài liệu theo độ liên quan
            high_relevance_docs = []
            medium_relevance_docs = []
            low_relevance_docs = []

            for doc, score in documents_with_scores:
                if score > 0.8:
                    high_relevance_docs.append((doc, score))
                elif score > 0.65:
                    medium_relevance_docs.append((doc, score))
                elif score > 0.5:
                    low_relevance_docs.append((doc, score))

            # Sắp xếp các danh sách theo độ liên quan giảm dần
            high_relevance_docs.sort(key=lambda x: x[1], reverse=True)
            medium_relevance_docs.sort(key=lambda x: x[1], reverse=True)
            low_relevance_docs.sort(key=lambda x: x[1], reverse=True)

            # Tính điểm tối đa và trung bình
            max_score = (
                max([score for _, score in documents_with_scores])
                if documents_with_scores
                else 0
            )
            avg_score = (
                sum([score for _, score in documents_with_scores])
                / len(documents_with_scores)
                if documents_with_scores
                else 0
            )

            print(
                f"📊 Đánh giá tài liệu: {len(high_relevance_docs)} cao, {len(medium_relevance_docs)} trung bình, {len(low_relevance_docs)} thấp"
            )
            print(f"📈 Điểm cao nhất: {max_score:.4f}, Trung bình: {avg_score:.4f}")

            return {
                "high_relevance": [doc for doc, _ in high_relevance_docs],
                "medium_relevance": [doc for doc, _ in medium_relevance_docs],
                "low_relevance": [doc for doc, _ in low_relevance_docs],
                "max_score": max_score,
                "avg_score": avg_score,
            }

        except Exception as e:
            print(f"❌ Lỗi khi đánh giá độ liên quan: {e}")
            return {
                "high_relevance": [],
                "medium_relevance": [],
                "low_relevance": [],
                "max_score": 0,
                "avg_score": 0,
            }

    async def _generate_query_suggestions(
        self, question: str, relevance_result: Dict, chat_history_text: str = ""
    ) -> Dict:
        """
        Tạo gợi ý để người dùng cải thiện câu hỏi khi kết quả tìm kiếm chưa đủ liên quan.

        Args:
            question: Câu hỏi của người dùng
            relevance_result: Kết quả đánh giá độ liên quan từ _evaluate_semantic_relevance
            chat_history_text: Lịch sử trò chuyện để cung cấp ngữ cảnh

        Returns:
            Dict: {
                "improved_questions": [list các câu hỏi cải thiện],
                "keywords": [list từ khóa gợi ý],
                "explanation": chuỗi giải thích tại sao cần cải thiện câu hỏi
            }
        """
        if not relevance_result or relevance_result["max_score"] > 0.8:
            # Không cần gợi ý nếu đã có kết quả liên quan cao
            return {"improved_questions": [], "keywords": [], "explanation": ""}

        # Xác định mức độ cần gợi ý dựa trên điểm cao nhất
        max_score = relevance_result["max_score"]

        # Tổng hợp thông tin từ các tài liệu có liên quan thấp và trung bình để làm context
        related_docs = (
            relevance_result["medium_relevance"] + relevance_result["low_relevance"]
        )
        context_text = ""

        if related_docs:
            # Lấy các đoạn văn bản ngắn từ tài liệu liên quan nhất
            context_snippets = [doc.page_content[:300] for doc in related_docs[:3]]
            context_text = "\n\n".join(context_snippets)

        # Chuẩn bị prompt để tạo gợi ý
        suggestion_prompt = f"""
Bạn là trợ lý thông minh chuyên phân tích và cải thiện câu hỏi tìm kiếm.

Câu hỏi hiện tại: "{question}"

Lịch sử trò chuyện:
{chat_history_text}

{"Một số thông tin liên quan từ tài liệu (có thể không hoàn toàn phù hợp):" if context_text else ""}
{context_text}

Nhiệm vụ của bạn là:
1. Phân tích tại sao câu hỏi hiện tại chưa đủ rõ hoặc cụ thể.
2. Đề xuất 2-3 phiên bản cải thiện của câu hỏi giúp tìm kiếm hiệu quả hơn.
3. Trích xuất 3-5 từ khóa chính mà người dùng có thể sử dụng để tìm kiếm thay thế.
4. Đưa ra một giải thích ngắn gọn, thân thiện về lý do gợi ý.

Trả về dữ liệu JSON với cấu trúc:
{{
  "improved_questions": ["cải thiện 1", "cải thiện 2", ...],
  "keywords": ["từ khóa 1", "từ khóa 2", ...],
  "explanation": "lời giải thích ngắn gọn"
}}
"""

        try:
            # Gọi LLM để tạo gợi ý
            messages = [
                (
                    "system",
                    "Bạn là trợ lý AI thông minh chuyên về phân tích và cải thiện câu hỏi. Luôn trả về đúng định dạng JSON được yêu cầu.",
                ),
                ("human", suggestion_prompt),
            ]

            response = await self.llm.ainvoke(messages)
            content = (
                response.content if hasattr(response, "content") else str(response)
            )

            # Parse kết quả JSON
            import json
            import re

            json_match = re.search(r"\{.*\}", content, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                suggestions = json.loads(json_str)

                # Đảm bảo có các key mặc định
                if "improved_questions" not in suggestions:
                    suggestions["improved_questions"] = []
                if "keywords" not in suggestions:
                    suggestions["keywords"] = []
                if "explanation" not in suggestions:
                    suggestions["explanation"] = ""

                return suggestions

            # Fallback nếu không parse được JSON
            return {
                "improved_questions": [],
                "keywords": [],
                "explanation": "Không thể tạo gợi ý dựa trên câu hỏi hiện tại.",
            }

        except Exception as e:
            print(f"❌ Lỗi khi tạo gợi ý: {e}")
            return {
                "improved_questions": [],
                "keywords": [],
                "explanation": "Đã xảy ra lỗi khi tạo gợi ý.",
            }

    def _build_system_context(self) -> tuple:
        """
        Xây dựng ngữ cảnh hệ thống cho việc trò chuyện, trả về cây thư mục dạng phân cấp.

        Returns:
            tuple: (system_context, all_folders, all_files)
                - system_context: Chuỗi mô tả cấu trúc hệ thống
                - all_folders: Danh sách các thư mục
                - all_files: Danh sách các tệp tin
        """
        try:
            file_model = FileModel()
            folder_model = FolderModel()

            # Lấy tất cả thư mục và tệp tin từ database
            all_folders = folder_model.get_all_folders()
            all_files = file_model.get_all_files()

            # Tạo từ điển của các thư mục để tìm kiếm nhanh theo ID
            folder_dict = {folder["id"]: folder for folder in all_folders}

            # Tạo cấu trúc thư mục phân cấp
            folder_tree = {}

            # Nhóm các thư mục con theo thư mục cha
            for folder in all_folders:
                folder_id = folder["id"]
                parent_id = folder.get("parent_id")

                # Nếu thư mục gốc hoặc không có thông tin về parent_id
                if parent_id is None or parent_id == 0:
                    if folder_id not in folder_tree:
                        folder_tree[folder_id] = {
                            "info": folder,
                            "folders": [],
                            "files": [],
                        }
                else:
                    # Đảm bảo thư mục cha đã tồn tại trong cây
                    if parent_id not in folder_tree:
                        # Nếu thư mục cha chưa được thêm vào cây, tạo trước
                        parent_folder = folder_dict.get(
                            parent_id, {"id": parent_id, "name": f"Folder {parent_id}"}
                        )
                        folder_tree[parent_id] = {
                            "info": parent_folder,
                            "folders": [],
                            "files": [],
                        }

                    # Thêm thư mục con vào thư mục cha
                    folder_tree[parent_id]["folders"].append(
                        {"info": folder, "folders": [], "files": []}
                    )

                    # Cập nhật dictionary thư mục
                    folder_tree[folder_id] = {
                        "info": folder,
                        "folders": [],
                        "files": [],
                    }

            # Phân bổ các file vào thư mục tương ứng
            for file in all_files:
                folder_id = file.get("folder_id")

                # Nếu file không thuộc thư mục nào, coi như thuộc thư mục gốc
                if folder_id is None or folder_id == 0 or folder_id not in folder_tree:
                    # Thêm vào danh sách file root
                    continue

                # Thêm file vào thư mục tương ứng
                folder_tree[folder_id]["files"].append(file)

            # Xây dựng chuỗi mô tả hệ thống
            system_context = "Cấu trúc hệ thống:\n"

            # Hàm đệ quy để xây dựng cây thư mục
            def build_tree_string(folder_id, prefix=""):
                if folder_id not in folder_tree:
                    return ""

                folder_info = folder_tree[folder_id]
                result = ""

                # Thêm thông tin thư mục hiện tại
                if prefix:  # Không phải thư mục gốc
                    result += f"{prefix}📁 {folder_info['info']['name']}\n"

                # Thêm các tệp tin trong thư mục hiện tại
                new_prefix = prefix + "│   " if prefix else "│   "
                for file in folder_info["files"]:
                    result += f"{new_prefix}📄 {file['name']}\n"

                # Đệ quy với các thư mục con
                for subfolder in folder_info["folders"]:
                    subfolder_id = subfolder["info"]["id"]
                    result += build_tree_string(subfolder_id, new_prefix)

                return result

            # Tìm các thư mục gốc (parent_id = None hoặc 0)
            root_folders = [
                f
                for f in all_folders
                if f.get("parent_id") is None or f.get("parent_id") == 0
            ]

            # Xây dựng chuỗi cây thư mục từ các thư mục gốc
            for root_folder in root_folders:
                system_context += f"📁 {root_folder['name']}\n"
                system_context += build_tree_string(root_folder["id"])

            # Thêm các tệp tin không thuộc thư mục nào
            root_files = [
                f
                for f in all_files
                if f.get("folder_id") is None or f.get("folder_id") == 0
            ]
            if root_files:
                system_context += "\nTệp tin gốc:\n"
                for file in root_files:
                    system_context += f"📄 {file['name']}\n"

            # Thêm thống kê tổng quát
            system_context += f"\nTổng số thư mục: {len(all_folders)}\n"
            system_context += f"Tổng số tệp tin: {len(all_files)}\n"

            return system_context, all_folders, all_files

        except Exception as e:
            print(f"❌ Error building system context: {e}")
            return "Không thể truy xuất cấu trúc hệ thống.", [], []

    async def stream_chat(
        self,
        question: str,
        vector_store_manager,
        user_id: Optional[int] = None,
        histories: List[dict] = None,
    ):
        """
        Xử lý câu hỏi và trả lời dưới dạng stream.

        Args:
            question: Câu hỏi của người dùng
            vector_store_manager: Manager để truy vấn vector store
            user_id: ID của người dùng (tùy chọn)
            histories: Lịch sử trò chuyện trước đó (tùy chọn)

        Yields:
            Text chunks hoặc dictionary kết quả cuối cùng
        """
        try:
            # Lịch sử trò chuyện định dạng cho bối cảnh
            chat_history_text = ""
            if histories and len(histories) > 0:
                chat_history_text = "\nLịch sử trò chuyện:\n"
                for i, msg in enumerate(histories[-5:]):  # Limit to last 5 messages
                    role = "Người dùng" if msg.get("role") == "user" else "Trợ lý"
                    content = (
                        msg.get("content", "")[:500] + "..."
                        if len(msg.get("content", "")) > 500
                        else msg.get("content", "")
                    )
                    chat_history_text += f"{role}: {content}\n"
                chat_history_text += "\n"

            # Bối cảnh hệ thống bộ đệm (Cấu trúc thư mục/tệp)
            if not self._cached_system_data:
                system_context, all_folders, all_files = self._build_system_context()
                self._cached_system_data = {
                    "context": system_context,
                    "folders": all_folders,
                    "files": all_files,
                }
            else:
                system_context = self._cached_system_data["context"]
                all_folders = self._cached_system_data["folders"]
                all_files = self._cached_system_data["files"]

            formatting_instructions = rag_configs.FORMATTING_INSTRUCTIONS

            # Step 1: Phân loại truy vấn
            llm_classification = await self.classify_query_using_llm(question)
            print(f"📊 Query classification: {llm_classification}")

            # Step 2: Handle file/folder structure queries
            if llm_classification.get("structure_query"):
                print("📂 Processing file/folder structure query")
                file_structure_prompt = rag_configs.FILE_STRUCTURE_PROMPT.format(
                    folder_count=len(all_folders),
                    file_count=len(all_files),
                    system_context=system_context,
                    chat_history_text=chat_history_text,
                    formatting_instructions=formatting_instructions,
                )
                messages = [("system", file_structure_prompt), ("human", question)]

                full_response = ""
                async for chunk in self.llm.astream(messages):
                    content = chunk.content if hasattr(chunk, "content") else str(chunk)
                    full_response += content
                    yield content

                yield {"answer": full_response, "sources": []}
                return

            # Step 3: Xử lý câu hỏi liên quan đến tài liệu và tệp gần đây
            retriever = None
            if (
                vector_store_manager
                and vector_store_manager.vector_store
                and (
                    llm_classification.get("document_specific")
                    or llm_classification.get("recent_file_query")
                )
            ):
                print("🔍 Processing document-specific query")
                user_id_str = str(user_id) if user_id is not None else None
                filter_dict = {}

                if user_id_str:
                    filter_dict = {"owner": {"$in": [user_id_str]}}
                # Lấy retriever và truy vấn tài liệu
                retriever = vector_store_manager.get_retriever(
                    filter_dict=filter_dict, k=2
                )
                docs = await retriever.ainvoke(question)
                if docs:
                    # Sử dụng phương thức đánh giá độ liên quan mới
                    relevance_result = self._evaluate_semantic_relevance(question, docs)

                    # Xử lý các tài liệu có độ liên quan cao
                    if relevance_result["high_relevance"]:
                        relevant_docs = relevance_result["high_relevance"]
                        print(
                            f"📄 Found {len(relevant_docs)} highly relevant documents"
                        )

                        # Sắp xếp theo thời gian nếu là recent_file_query
                        if llm_classification.get("recent_file_query"):
                            relevant_docs.sort(
                                key=lambda x: x.metadata.get("updated_at", ""),
                                reverse=True,
                            )

                        # Tạo context từ tài liệu liên quan cao
                        context = "\n".join(
                            [doc.page_content for doc in relevant_docs[:3]]
                        )
                        message_template = rag_configs.DOCUMENT_SPECIFIC_PROMPT.format(
                            formatting_instructions=formatting_instructions,
                            chat_history_text=chat_history_text,
                            system_context=system_context,
                            context=context,
                        )

                        messages = [("system", message_template), ("human", question)]

                        # Thêm thông tin tệp gần đây nếu cần
                        if llm_classification.get("recent_file_query"):
                            recent_files_info = "\n".join(
                                f"{i+1}. Tệp tin: {doc.metadata.get('source_file', 'Unknown')}, Ngày: {doc.metadata.get('updated_at', 'Unknown')}"
                                for i, doc in enumerate(relevant_docs[:3])
                            )
                            messages[0] = (
                                "system",
                                message_template
                                + rag_configs.RECENT_FILE_INFO.format(
                                    recent_files=recent_files_info
                                ),
                            )

                        # Stream response
                        full_response = ""
                        async for chunk in self.llm.astream(messages):
                            content = (
                                chunk.content
                                if hasattr(chunk, "content")
                                else str(chunk)
                            )
                            full_response += content
                            yield content

                        yield {
                            "answer": full_response,
                            "sources": [
                                doc.metadata.get("source_file")
                                for doc in relevant_docs[:1]
                            ],
                        }
                        return

                    # Xử lý trường hợp có tài liệu liên quan mức trung bình
                    elif (
                        relevance_result["medium_relevance"]
                        or relevance_result["low_relevance"]
                    ):
                        # Tổng hợp các tài liệu có liên quan (ưu tiên trung bình trước, sau đó đến thấp)
                        combined_docs = (
                            relevance_result["medium_relevance"]
                            + relevance_result["low_relevance"]
                        )

                        if combined_docs:
                            print(
                                f"⚠️ Only found {len(relevance_result['medium_relevance'])} medium and {len(relevance_result['low_relevance'])} low relevance documents"
                            )

                            # 1. Tạo gợi ý cải thiện câu hỏi
                            suggestions = await self._generate_query_suggestions(
                                question, relevance_result, chat_history_text
                            )

                            # 2. Tạo context từ các tài liệu có liên quan vừa phải
                            context = "\n".join(
                                [doc.page_content for doc in combined_docs[:3]]
                            )

                            # 3. Xây dựng prompt với cảnh báo về độ liên quan thấp và gợi ý cải thiện
                            improved_context_template = f"""
Bạn là trợ lý AI thông minh, trả lời câu hỏi dựa trên tài liệu hoặc kiến thức chung.

QUAN TRỌNG - HƯỚNG DẪN ĐẶC BIỆT:
Tài liệu được tìm thấy CHỈ CÓ LIÊN QUAN THẤP đến câu hỏi người dùng (điểm tương đồng: {relevance_result['max_score']:.2f}/1.0).
1. Hãy trả lời câu hỏi dựa trên thông tin có sẵn NHƯNG phải luôn thừa nhận khi thông tin không đủ.
2. Nếu không đủ thông tin, hãy đề xuất các cách để người dùng có thể cải thiện câu hỏi.

Gợi ý để cải thiện câu hỏi:
- Câu hỏi cải thiện: {', '.join(suggestions['improved_questions'][:2]) if suggestions['improved_questions'] else 'Không có gợi ý'}
- Từ khóa tìm kiếm: {', '.join(suggestions['keywords']) if suggestions['keywords'] else 'Không có gợi ý'}
- Lý do: {suggestions['explanation'] if suggestions['explanation'] else 'Câu hỏi hiện tại có thể quá chung hoặc không khớp với dữ liệu có sẵn.'}

Lịch sử trò chuyện:
{chat_history_text}

Nội dung tài liệu (có thể không hoàn toàn liên quan):
{context}

{formatting_instructions}
"""

                            messages = [
                                ("system", improved_context_template),
                                ("human", question),
                            ]

                            # Stream response
                            full_response = ""
                            async for chunk in self.llm.astream(messages):
                                content = (
                                    chunk.content
                                    if hasattr(chunk, "content")
                                    else str(chunk)
                                )
                                full_response += content
                                yield content

                            yield {
                                "answer": full_response,
                                "sources": [
                                    doc.metadata.get("source_file")
                                    for doc in combined_docs[:1]
                                ],
                            }
                            return

                    # Không có tài liệu nào thực sự liên quan
                    print("⚠️ No relevant documents found at all")

                    # Tạo gợi ý để cải thiện câu hỏi
                    suggestions = await self._generate_query_suggestions(
                        question, relevance_result, chat_history_text
                    )

                    no_docs_template = f"""
Bạn là trợ lý AI thông minh, giúp đỡ người dùng với câu hỏi của họ.

QUAN TRỌNG:
Tôi không tìm thấy tài liệu nào liên quan đủ để trả lời câu hỏi này.
Hãy trả lời câu hỏi dựa trên kiến thức chung của bạn nếu có thể.
Đồng thời, gợi ý cho người dùng cách họ có thể cải thiện câu hỏi để tìm kiếm hiệu quả hơn.

Gợi ý để cải thiện tìm kiếm:
- Câu hỏi cải thiện: {', '.join(suggestions['improved_questions'][:2]) if suggestions['improved_questions'] else 'Không có gợi ý'}  
- Từ khóa tìm kiếm: {', '.join(suggestions['keywords']) if suggestions['keywords'] else 'Không có gợi ý'}
- Lý do: {suggestions['explanation'] if suggestions['explanation'] else 'Không tìm thấy tài liệu liên quan. Hãy thử từ khóa khác hoặc tải lên tài liệu liên quan nếu có.'}

Lịch sử trò chuyện:
{chat_history_text}

{formatting_instructions}
"""

                    messages = [("system", no_docs_template), ("human", question)]

                    # Stream response
                    full_response = ""
                    async for chunk in self.llm.astream(messages):
                        content = (
                            chunk.content if hasattr(chunk, "content") else str(chunk)
                        )
                        full_response += content
                        yield content

                    yield {"answer": full_response, "sources": []}
                    return

                # Không có tài liệu được tìm thấy (vector store trống)
                print("⚠️ No documents found in vector store")

            # Step 4: Fallback cho câu hỏi chung
            print("🧠 Fallback to general query handling")

            # Kiểm tra xem có tài liệu nào có thể liên quan không
            has_potential_docs = False
            if retriever:
                # Thử tìm tài liệu một lần nữa nếu chưa thực hiện ở trên
                if not "docs" in locals():
                    docs = await retriever.ainvoke(question)

                # Kiểm tra xem có tài liệu liên quan không
                if docs:
                    relevance_result = self._evaluate_semantic_relevance(question, docs)
                    any_relevant_docs = (
                        len(relevance_result["high_relevance"]) > 0
                        or len(relevance_result["medium_relevance"]) > 0
                    )

                    if any_relevant_docs:
                        has_potential_docs = True
                        context = "\n".join(
                            doc.page_content
                            for doc in (
                                relevance_result["high_relevance"]
                                + relevance_result["medium_relevance"]
                            )[:3]
                        )

                        message_template = rag_configs.RELEVANCE_CHECK_PROMPT.format(
                            formatting_instructions=formatting_instructions,
                            chat_history_text=chat_history_text,
                            system_context=system_context,
                            context=context,
                        )
                        messages = [("system", message_template), ("human", question)]
                    else:
                        # Không có tài liệu liên quan, sử dụng prompt kiến thức chung
                        messages = [
                            (
                                "system",
                                rag_configs.GENERAL_KNOWLEDGE_PROMPT.format(
                                    chat_history_text=chat_history_text,
                                    formatting_instructions=formatting_instructions,
                                ),
                            ),
                            ("human", question),
                        ]

            # Nếu không có tài liệu tiềm năng hoặc không có vector store
            if not has_potential_docs:
                messages = [
                    (
                        "system",
                        rag_configs.GENERAL_KNOWLEDGE_PROMPT.format(
                            chat_history_text=chat_history_text,
                            formatting_instructions=formatting_instructions,
                        ),
                    ),
                    ("human", question),
                ]

            # Stream câu trả lời
            full_response = ""
            async for chunk in self.llm.astream(messages):
                content = chunk.content if hasattr(chunk, "content") else str(chunk)
                full_response += content
                yield content

            # Chuẩn bị thông tin nguồn nếu có
            sources = []
            if has_potential_docs and docs:
                sources = [doc.metadata.get("source_file") for doc in docs[:1]]

            yield {"answer": full_response, "sources": sources}

        except Exception as e:
            error_message = f"Xin lỗi, đã xảy ra lỗi: {str(e)}. Vui lòng thử lại."
            yield error_message
            yield {"answer": error_message, "sources": []}
