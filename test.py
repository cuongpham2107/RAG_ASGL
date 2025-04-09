# Cài đặt các gói cần thiết:
# pip install -U langchain-community langchain-ollama langchain-chroma

from langchain_chroma import Chroma  # Sử dụng langchain-chroma để tránh deprecated warning
from langchain_ollama import OllamaEmbeddings
from langchain_ollama import OllamaLLM
from langchain_community.document_loaders import TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.prompts import PromptTemplate
from langchain.chains import RetrievalQA

# 1. Khởi tạo embedding và model
def initialize_components():
    embeddings = OllamaEmbeddings(model="nomic-embed-text:latest")
    llm = OllamaLLM(model="llama3.1:8b")
    return embeddings, llm

# 2. Tải và xử lý dữ liệu (chỉ dùng khi cần thêm tài liệu mới)
def process_documents(file_path):
    loader = TextLoader(file_path)
    documents = loader.load()
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )
    texts = text_splitter.split_documents(documents)
    return texts

# 3. Tạo hoặc tải vector store từ ChromaDB có sẵn
def load_or_create_vector_store(embeddings, file_path=None):
    persist_directory = "data/chroma"
    
    try:
        vector_store = Chroma(
            embedding_function=embeddings,
            persist_directory=persist_directory
        )
        doc_count = vector_store._collection.count()
        if doc_count == 0 and file_path:
            print("ChromaDB trống, đang tạo mới từ tài liệu...")
            texts = process_documents(file_path)
            vector_store = Chroma.from_documents(
                documents=texts,
                embedding=embeddings,
                persist_directory=persist_directory
            )
        else:
            print("Đã tải vector store từ ChromaDB có sẵn.")
    except Exception as e:
        if file_path:
            print(f"Không tìm thấy ChromaDB có sẵn, đang tạo mới... (Lỗi: {e})")
            texts = process_documents(file_path)
            vector_store = Chroma.from_documents(
                documents=texts,
                embedding=embeddings,
                persist_directory=persist_directory
            )
        else:
            raise Exception("Không có ChromaDB có sẵn và không có file_path để tạo mới.")
    
    return vector_store

# 4. Tạo hệ thống RAG
def create_rag_chain(llm, vector_store):
    prompt = PromptTemplate(
        template="""Bạn là một trợ lý thông minh. Dựa trên tài liệu được cung cấp dưới đây, hãy trả lời câu hỏi một cách chính xác và ngắn gọn. Nếu không có tài liệu hoặc không đủ thông tin, hãy nói rõ ràng.

        Tài liệu: {context}

        Câu hỏi: {query}

        Trả lời: """,
        input_variables=["context", "query"]
    )
    
    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=vector_store.as_retriever(search_kwargs={"k": 5}),
        return_source_documents=True,
        chain_type_kwargs={"prompt": prompt}
    )
    return qa_chain

# 5. Kiểm tra số lượng tài liệu trong vector store
def get_document_count(vector_store):
    collection = vector_store._collection
    count = collection.count()
    return count

# 6. Hàm chính để chạy hệ thống
def main():
    embeddings, llm = initialize_components()
    
    # Đặt file_path đến tài liệu của bạn nếu cần tạo mới
    file_path = "your_document.txt"  # Thay bằng đường dẫn thực tế hoặc để trống nếu dùng ChromaDB có sẵn
    
    print("Đang xử lý vector store...")
    vector_store = load_or_create_vector_store(embeddings, file_path)
    
    print("Đang khởi tạo hệ thống RAG...")
    qa_chain = create_rag_chain(llm, vector_store)
    
    doc_count = get_document_count(vector_store)
    print(f"Số lượng tài liệu trong hệ thống: {doc_count}")
    
    if doc_count == 0:
        print("Cảnh báo: Không có tài liệu nào trong hệ thống để trả lời câu hỏi.")
    
    while True:
        query = input("Nhập câu hỏi (hoặc 'quit' để thoát): ")
        if query.lower() == 'quit':
            break
        elif "bao nhiêu tài liệu" in query.lower():
            doc_count = get_document_count(vector_store)
            print(f"Hiện tại có {doc_count} tài liệu trong hệ thống.")
        else:
            try:
                result = qa_chain.invoke({"query": query})
                print("\nTrả lời:", result["result"])
                print("\nNguồn tài liệu tham khảo:")
                for doc in result["source_documents"]:
                    print(f"- {doc.page_content[:100]}...")
            except Exception as e:
                print(f"Lỗi khi xử lý câu hỏi: {e}")
                print("Có thể hệ thống không có đủ dữ liệu để trả lời.")

if __name__ == "__main__":
    main()