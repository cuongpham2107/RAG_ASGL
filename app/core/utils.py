import os
import ocrmypdf

async def ocr_pdf_processing(input_path: str, output_path: str = None):
    """
    Hàm xử lý OCR PDF
    
    Args:
        input_path (str): Đường dẫn tới file PDF đầu vào
        output_path (str, optional): Đường dẫn tới file PDF đầu ra sau khi OCR. 
                                    Nếu không cung cấp, sẽ ghi đè lên file đầu vào.
    """
    try:
        # Nếu output_path không được cung cấp, sử dụng input_path để ghi đè
        if output_path is None:
            output_path = input_path
            
        # Tạo file tạm thời để lưu kết quả OCR
        temp_output = input_path + ".temp.pdf"
        
        # Run OCR with fixed parameter order and types
        result = ocrmypdf.ocr(
            input_file=input_path,
            output_file=temp_output,
            language="eng",
            deskew=True,
            force_ocr=True,
            optimize=1,  # Use an integer value (1-3) for optimization level
            output_type="pdf"
        )
        
        # Nếu OCR thành công, di chuyển file tạm thời thành file đầu ra
        if result == 0 and os.path.exists(temp_output):
            # Nếu input_path và output_path giống nhau (ghi đè), xóa input_path trước
            if input_path == output_path and os.path.exists(input_path):
                os.remove(input_path)
                
            # Di chuyển file tạm thành file đầu ra
            os.rename(temp_output, output_path)
            return True, "OCR thành công", result
        else:
            # Xóa file tạm nếu vẫn tồn tại
            if os.path.exists(temp_output):
                os.remove(temp_output)
            return False, f"OCR không hoàn toàn thành công. Mã trạng thái: {result}", result
    
    except Exception as e:
        error_msg = f"Lỗi trong quá trình OCR: {e}"
        # Xóa file tạm nếu tồn tại
        if 'temp_output' in locals() and os.path.exists(temp_output):
            os.remove(temp_output)
        return False, error_msg, -1