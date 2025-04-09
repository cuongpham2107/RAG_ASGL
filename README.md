## 1. Tạo và sử dụng môi trường ảo (venv)
### Bước 1: Tạo môi trường ảo
Chạy lệnh sau trong Terminal hoặc Command Prompt:

```cmd
python -m venv env
```

- env là tên thư mục chứa môi trường ảo. Bạn có thể thay đổi tên theo ý thích.
Nếu đang dùng Python 3, có thể cần dùng python3 thay vì python.

### Bước 2: Kích hoạt môi trường ảo
- Windows:

```cmd 
env\Scripts\activate
```
macOS/Linux:
```cmd 
source env/bin/activate
```

Khi kích hoạt thành công, tên môi trường (vd: (env)) sẽ xuất hiện ở đầu dòng lệnh.
### Bước 3: Cài đặt thư viện trong môi trường ảo
Dùng pip để cài đặt thư viện:

Ví dụ:
```cmd 
pip install requests
```
## 2. Tạo file requirements.txt
### Bước 1: Lưu danh sách các thư viện đã cài đặt
Chạy lệnh sau trong môi trường ảo:
```cmd 
pip freeze > requirements.txt
```
File requirements.txt sẽ chứa danh sách các thư viện và phiên bản tương ứng.

### Bước 2: Cài đặt thư viện từ file requirements.txt
Nếu bạn muốn cài đặt lại thư viện trên một máy khác (hoặc môi trường ảo khác), dùng lệnh:
```cmd
pip install -r requirements.txt
```

## 3. Tắt môi trường ảo
Khi hoàn tất công việc, bạn có thể tắt môi trường ảo bằng lệnh:
```cmd
deactivate
```


## 4. Run project
```cmd
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## *. Cấu hình LLM với server mạnh:
```py 
self.llm = OllamaLLM(
    model="llama3.1:32b",
    temperature=0.7,  # Giữ mức trung bình để không quá sáng tạo
    mirostat=2,  # Giữ Mirostat 2.0 để kiểm soát coherence/diversity
    mirostat_eta=0.1,  # Tốc độ học của Mirostat
    mirostat_tau=5.0,  # Cân bằng coherence và diversity
    num_ctx=8192,  # Tăng context lên 8192 để tận dụng RAM lớn
    num_predict=1024,  # Tăng số token dự đoán lên 1024 do có nhiều RAM hơn
    repeat_last_n=256,  # Kiểm tra lặp lại với phạm vi lớn hơn
    repeat_penalty=1.05,  # Giảm nhẹ hình phạt lặp lại để tránh mất mát thông tin
    top_k=100,  # Tăng độ đa dạng của mẫu hơn nữa
    top_p=0.9,  # Tăng nhẹ nucleus sampling để có phản hồi phong phú hơn
    num_thread=16,  # Tận dụng nhiều CPU hơn (vì Silver 4114 có 20 core / 40 thread)
    stop=["<|im_end|>", "<|endoftext|>"],  # Giữ nguyên stop tokens
)
```

