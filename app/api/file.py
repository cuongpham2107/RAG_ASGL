import os
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Path, Query, UploadFile
from fastapi.responses import FileResponse

from app.api.dependencies import authenticate, db
from app.config import configs
from app.models.role import RoleModel
from app.models.user import UserModel
from app.utils.common import sanitize_filename, find_subdir, get_folder_path
from app.core.rag import RagSetup
from app.models.file import FileModel
from app.models.folder import FolderModel

rag = RagSetup()

router_file = APIRouter()

storage_dir = configs.storage_dir

file_model = FileModel()
folder_model = FolderModel()
role_model = RoleModel()
user_model = UserModel()

@router_file.get("/")
async def index(
    search: Optional[str] = Query(None, description="Search query"),
    skip: int = Query(default=0, ge=0, description="Number of records to skip"),
    limit: int = Query(default=10, ge=1, le=100, description="Number of records to return"),
    current_user: str = Depends(authenticate)
):
    files, total = file_model.get_all(skip=skip, limit=limit, search=search)
    return {
        "message": "Files retrieved successfully",
        "data": files,
        "pagination": {
            "total": total,
            "skip": skip,
            "limit": limit
        }
    }

# Tải và Lưu file vào thư mục
@router_file.post("/store")  # Changed from "/store/" to "/store"
async def store(
    files: List[UploadFile] = File(..., description="Danh sách file tải lên"),
    names: List[str] = Form(...),  # Nhận danh sách tên file từ frontend
    folder_id: Optional[int] = Form(None, description="ID thư mục cha"),  # Changed from ... to None to make it truly optional
    current_user: str = Depends(authenticate)
):
    try:
        user_data = user_model.get_by_username(current_user)

        if not files:
            raise HTTPException(status_code=400, detail="No files uploaded")

        folder = None
        path = storage_dir
        
        if folder_id:
            # Verify folder exists
            folder = folder_model.get_by_id(folder_id)
            
            if not folder:
                raise HTTPException(status_code=404, detail="Folder not found")
            
            # Use consistent folder path handling
            path = get_folder_path(storage_dir, folder)
            
            # Create folder if it doesn't exist
            if not os.path.exists(path):
                os.makedirs(path, exist_ok=True)

        uploaded_count = 0
        for file, name in zip(files, names):
            name_file, ext = os.path.splitext(file.filename)
            filename = sanitize_filename(name_file) + ext
            filepath = os.path.join(path, filename)
            
            # Check unique slug
            if file_model.slug_exists(sanitize_filename(name_file)):
                raise HTTPException(status_code=400, detail=f"File {name_file} đã tồn tại")
            
            # Save file
            with open(filepath, "wb") as f:
                f.write(file.file.read())
            
            file_size = os.path.getsize(filepath)
            
            # Process file with RAG
            await rag.process_files(file, filepath,sanitize_filename(name_file),user_data.get('id'))

            # Create file record
            id_file =  file_model.create(
                name=name,
                slug=sanitize_filename(name_file),
                folder_id=folder_id,
                filepath=filepath,
                file_size=file_size
            )
            
            # Khắc phục: Nhận dữ liệu người dùng và sau đó nhận ID vai trò lưu quyền truy cập cho user
            
            if user_data and 'id' in user_data:
                role_id = user_data.get('role_id')
                
                if role_id:
                    role_model.set_resource_permissions(role_id, "files", id_file, True, True, True)
            
            uploaded_count += 1

        return {"message": f"{uploaded_count} files uploaded successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Hiển thị file theo id thư mục
@router_file.get("/show/")
async def get_file_in_folder_id(
    folder_id: int = Query(...),
    current_user: str = Depends(authenticate)
):
    files = file_model.get_by_folder(folder_id)
    return {
        "message": f"Files in folder {folder_id} retrieved successfully",
        "data": files
    }

@router_file.get("/{file_id}")
async def get_file_by_id(
    file_id: int,
    current_user: str = Depends(authenticate)
):
    file = file_model.get_file_by_id(file_id=file_id)
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    return {
        "message": "File retrieved successfully",
        "data": file
    }


# Hiển thị file mới nhật theo created_at
@router_file.get("/recent/")
async def get_recent_files(
    current_user: str = Depends(authenticate)
):
    files = file_model.get_recent(limit=5)
    return {
        "message": "Recent files retrieved successfully",
        "data": files
    }

# Delete nhiều file
@router_file.delete("/delete/")
async def delete_files(
    file_ids: List[int] = Form(..., description="Danh sách ID của file cần xóa"),
    current_user: str = Depends(authenticate)
):
    try:
        with db.get_cursor() as cursor:
            cursor.execute(
                "SELECT filepath, slug FROM files WHERE id IN ({})".format(",".join("?" * len(file_ids))),
                file_ids
            )
            results = cursor.fetchall()
            if not results:
                raise HTTPException(status_code=404, detail="Files not found")
            
            for result in results:
                rag.delete_docs(result[1])
                filepath = result[0]
                if os.path.exists(filepath):
                    os.remove(filepath)
            
            cursor.execute(
                "DELETE FROM files WHERE id IN ({})".format(",".join("?" * len(file_ids))),
                file_ids
            )
            
            return {
                "message": "Files deleted successfully"
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Download nhiều file
@router_file.post("/download/")
async def download_files(
    file_ids: List[int] = Form(..., description="Danh sách ID của file cần tải"),
    current_user: str = Depends(authenticate)
):
    try:
        with db.get_cursor() as cursor:
            cursor.execute(
                "SELECT filepath FROM files WHERE id IN ({})".format(",".join("?" * len(file_ids))),
                file_ids
            )
            results = cursor.fetchall()
            if not results:
                raise HTTPException(status_code=404, detail="Files not found")
            
            # Tạo thư mục tạm để chứa file
            temp_dir = os.path.join(storage_dir, "temp")
            if not os.path.exists(temp_dir):
                os.makedirs(temp_dir)
            
            # Copy file vào thư mục tạm
            for result in results:
                filepath = result[0]
                shutil.copy(filepath, temp_dir)
            
            # Nén thư mục tạm
            shutil.make_archive(temp_dir, 'zip', temp_dir)
            
            # Trả về file nén cho frontend
            return FileResponse(temp_dir + ".zip", filename="files.zip", media_type="application/zip")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router_file.get("/view/{file_id}")
async def view_file(
    file_id: int = Path(..., description="ID của file cần xem hoặc tải về"),
    current_user: str = Depends(authenticate)
):
    try:
        with db.get_cursor() as cursor:
            cursor.execute("SELECT filepath, name FROM files WHERE id = ?", (file_id,))
            result = cursor.fetchone()
            
            if not result:
                raise HTTPException(status_code=404, detail="File not found")
            
            filepath, filename = result
            
            # Xác định loại nội dung dựa trên đuôi file
            _, ext = os.path.splitext(filepath)
            
            # Xử lý file PDF để hiển thị trực tuyến, các loại file khác để tải xuống
            if ext.lower() == '.pdf':
                return FileResponse(
                    filepath, 
                    filename=filename,
                    media_type="application/pdf",
                    content_disposition_type="inline"  # PDF sẽ hiển thị trực tiếp trên trình duyệt
                )
            else:
                # Các file khác sẽ được tải xuống như bình thường
                return FileResponse(
                    filepath,
                    filename=filename
                )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@router_file.post("/update-parent")
async def update_parent(
    folder_id: int = Form(..., description="ID thư mục cha mới"),
    file_ids: List[int] = Form(..., description="Danh sách ID của file thay đổi thư mục cha"),
    current_user: str = Depends(authenticate),
):
    try:
        # Kiểm tra xem thư mục cha mới có tồn tại không
        folder = folder_model.get_by_id(folder_id)
        if not folder:
            raise HTTPException(status_code=404, detail="Folder not found")

        results = []
        success_count = 0
        errors = []

        # Log before update
        print(f"Starting update process for {len(file_ids)} files to folder_id={folder_id}")

        # Cập nhật thư mục cha cho các file
        for file_id in file_ids:
            file = file_model.get_file_by_id(file_id)
            if not file:
                errors.append(f"File with ID {file_id} not found")
                continue
            
            print(f"Processing file {file_id}: '{file.get('name')}', current path: {file.get('filepath')}")
            
            # Cập nhật thư mục cha trong cơ sở dữ liệu và di chuyển file
            success, message = file_model.update_parent(file_id, folder_id)
            
            if success:
                success_count += 1
                # Get the updated file path for confirmation
                updated_file = file_model.get_file_by_id(file_id)
                results.append({
                    "file_id": file_id, 
                    "status": "success",
                    "old_path": file.get('filepath'),
                    "new_path": updated_file.get('filepath') if updated_file else "unknown"
                })
                print(f"Successfully updated file {file_id}")
            else:
                errors.append(f"Failed to update file {file_id}: {message}")
                results.append({"file_id": file_id, "status": "error", "message": message})
                print(f"Failed to update file {file_id}: {message}")

        return {
            "message": f"Updated {success_count} of {len(file_ids)} files successfully",
            "data": {
                "folder_id": folder_id, 
                "folder_name": folder.get('name'),
                "results": results,
                "errors": errors if errors else None
            }
        }
    except Exception as e:
        print(f"Error in update_parent API: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router_file.post("/update-name")
async def update_name(
    file_id: int = Form(..., description="ID file cần đổi tên"),
    name: str = Form(..., description="Tên mới của file"),  # Changed from new_name to name to match frontend
    current_user: str = Depends(authenticate)
):
    """Update the name of a file in the database"""
    try:
        file = file_model.get_file_by_id(file_id)
        if not file:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Check if the file name changed
        if file.get('name') == name:
            return {
                "message": "File name unchanged",
                "data": {
                    "file_id": file_id,
                    "name": name
                }
            }
        
        # Update the name in the database
        success = file_model.update_name(file_id, name)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update file name")
        
        return {
            "message": "File name updated successfully",
            "data": {
                "file_id": file_id,
                "name": name
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in update_name API: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router_file.get("/debug/filepath/{file_id}")
async def debug_filepath(
    file_id: int,
    current_user: str = Depends(authenticate)
):
    """Debug endpoint to check the current filepath in the database"""
    try:
        # Get file directly from database
        with db.get_cursor() as cursor:
            cursor.execute("SELECT id, name, filepath, folder_id FROM files WHERE id = ?", (file_id,))
            file_data = cursor.fetchone()
            
            if not file_data:
                raise HTTPException(status_code=404, detail="File not found")
            
            # Get folder info if folder_id exists
            folder_info = None
            if file_data[3]:  # folder_id
                cursor.execute("SELECT id, name, slug FROM folders WHERE id = ?", (file_data[3],))
                folder_info = cursor.fetchone()
            
            # Check if the file exists at the stored path
            file_exists = os.path.exists(file_data[2]) if file_data[2] else False
            
            return {
                "message": "File path debug info",
                "data": {
                    "file_id": file_data[0],
                    "file_name": file_data[1],
                    "filepath_in_db": file_data[2],
                    "file_exists_at_path": file_exists,
                    "folder_id": file_data[3],
                    "folder_info": {
                        "id": folder_info[0] if folder_info else None,
                        "name": folder_info[1] if folder_info else None,
                        "slug": folder_info[2] if folder_info else None
                    } if folder_info else None
                }
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving file path info: {str(e)}")