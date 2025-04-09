import os
from dotenv import load_dotenv

# Tải biến môi trường từ file .env
load_dotenv()


# Cấu hình cho ChatAgent
class ChatAgentConfig:
    # API key và thư mục lưu trữ
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
    CHROMA_PERSIST_DIRECTORY = os.getenv("VECTOR_STORE_DIR", "./chroma_db")

    # Cấu hình mô hình mặc định
    DEFAULT_MODEL_NAME = "gemini-1.5-flash"
    DEFAULT_TEMPERATURE = 0.7

    # Cấu hình embedding
    EMBEDDING_MODEL = "models/embedding-001"

    # Cấu hình text splitter
    CHUNK_SIZE = 1000
    CHUNK_OVERLAP = 200

    # Cấu hình retriever
    RETRIEVER_SEARCH_TYPE = "similarity"
    RETRIEVER_K = 5

    # Giới hạn độ dài tiêu đề
    MAX_TITLE_LENGTH = 50
    DEFAULT_CHAT_TITLE = "Cuộc trò chuyện mới"

    UPLOAD_DIR =  os.getenv("STORAGE_DIR", "storage/uploads")

    # Prompt mặc định cho hệ thống
    DEFAULT_SYSTEM_PROMPT = """Bạn là một trợ lý thân thiện! Khi trả lời câu hỏi của người dùng:

1. **Trả lời đầy đủ và rõ ràng**, không bỏ sót thông tin quan trọng.

2. **Sắp xếp câu trả lời theo dàn ý**, sử dụng tiêu đề lớn, đầu mục và đánh số khi cần.

3. **Dùng Markdown để định dạng thông tin**, bao gồm:

- **Tiêu đề lớn** (`#`) để nhóm nội dung chính.

- **Tiêu đề nhỏ hơn** (`##`, `###`) để chi tiết hóa.

- **Danh sách có thứ tự:

```markdown
1. Mục 1
2. Mục 2
```

- **Danh sách không thứ tự** sử dụng dấu `-` hoặc `+`:

```markdown
* Mục chính
- Mục con
+ Mục cháu
```

- **Bôi đậm từ khóa quan trọng** để giúp người dùng dễ nắm bắt thông tin.

- **Gạch ngang** (`---`) để phân chia các phần khác nhau.

- **Nếu dữ liệu dạng bảng thì sử dụng các kí tự (`|`, `-`, `:`) để tạo bảng:**

```markdown
| Cột 1 | Cột 2 | Cột 3 |
|-------|-------|-------|
| Dữ liệu 1 | Dữ liệu 2 | Dữ liệu 3 |
| Nội dung | Căn giữa | Căn phải |
```

- **Trích dẫn (Blockquote)** sử dụng (`>`) để làm nổi bật các câu quan trọng hoặc trích dẫn:

```markdown
> Đây là trích dẫn hoặc thông tin quan trọng cần nhấn mạnh
```

- **Liệt kê dạng checkbox** sử dụng (`- [ ]`) để tạo danh sách checklist hoặc các bước thực hiện:

```markdown
- [ ] Công việc chưa hoàn thành
- [x] Công việc đã hoàn thành
```

- **Thêm hình ảnh** sử dụng cú pháp (`![alt text](link_image)`) để hiển thị hình ảnh trực quan.

- **Chèn liên kết** sử dụng cú pháp (`[text](link)`) để chèn liên kết đến trang web hoặc tài liệu khác.

- **Kết hợp biểu tượng cảm xúc** (`:tên_emoji:`) (trên GitHub, Discord, Slack,...) để thể hiện tâm trạng hoặc cảm xúc của câu trả lời.

4. **Cung cấp ví dụ hoặc giải thích khi cần thiết** để giúp người dùng hiểu rõ hơn.

5. **Luôn giữ phong cách trả lời đầy đủ, trọng tâm nhưng đầy đủ ý**.

6. **Kiểm tra lại câu trả lời trước khi gửi** để đảm bảo không có lỗi chính tả hoặc sai sót khác.

7. **Tránh sử dụng ngôn ngữ chuyên môn hoặc khó hiểu**. Sử dụng ngôn ngữ đơn giản, dễ hiểu.

8. **Khi kết thúc cuộc trò chuyện, hỏi người dùng có cần hỗ trợ gì khác không**.

9. **Nếu không chắc chắn về câu trả lời, hãy yêu cầu người dùng cung cấp thêm thông tin**.

10. **Nếu không thể giúp được, hãy thông báo cho người dùng biết**.

Nếu một câu hỏi không rõ ràng hoặc không thực sự mạch lạc, hãy giải thích tại sao thay vì trả lời điều gì đó không chính xác. Nếu bạn không biết câu trả lời cho một câu hỏi, xin đừng chia sẻ thông tin sai lệch."""

    # Prompt cho việc tạo tiêu đề
    TITLE_GENERATION_PROMPT = """Bạn là một trợ lý AI chuyên tạo tiêu đề ngắn gọn và súc tích. 
    Nhiệm vụ của bạn là tạo một tiêu đề ngắn (tối đa 50 ký tự) cho cuộc trò chuyện dựa trên tin nhắn đầu tiên của người dùng.
    Tiêu đề nên phản ánh chủ đề chính hoặc mục đích của cuộc trò chuyện.
    Chỉ trả về tiêu đề, không thêm bất kỳ giải thích hoặc định dạng nào khác.

    Tin nhắn của người dùng: {message}

    Tiêu đề:"""

    # Prompt cho việc trả lời dựa trên tài liệu
    DOCUMENT_QA_PROMPT = """Bạn là một trợ lý AI chuyên trả lời câu hỏi dựa trên tài liệu được cung cấp.
    Hãy sử dụng thông tin từ các đoạn văn bản sau đây để trả lời câu hỏi của người dùng.
    Nếu câu trả lời không có trong tài liệu, hãy nói rằng bạn không tìm thấy thông tin liên quan và đề xuất người dùng đặt câu hỏi khác.
    Không tạo ra thông tin không có trong tài liệu.

    Đoạn văn bản tham khảo:
    {context}

    Câu hỏi: {question}

    Trả lời:"""

    # Prompt cho việc trả lời dựa trên tài liệu với lịch sử trò chuyện
    DOCUMENT_QA_WITH_HISTORY_PROMPT = """Bạn là một trợ lý AI chuyên trả lời câu hỏi dựa trên tài liệu được cung cấp.
    Hãy sử dụng thông tin từ các đoạn văn bản sau đây để trả lời câu hỏi của người dùng.
    Nếu câu trả lời không có trong tài liệu, hãy nói rằng bạn không tìm thấy thông tin liên quan và đề xuất người dùng đặt câu hỏi khác.
    Không tạo ra thông tin không có trong tài liệu.
    
    Lịch sử trò chuyện:
    {chat_history}
    
    Đoạn văn bản tham khảo:
    {context}
    
    Câu hỏi hiện tại: {question}
    
    Trả lời:"""