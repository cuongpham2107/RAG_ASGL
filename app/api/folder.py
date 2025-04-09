import shutil
from fastapi import APIRouter, Depends, Form, HTTPException, Query
from typing import Optional
import os

from app.api.dependencies import authenticate
from app.config import configs
from app.utils.common import sanitize_filename, get_folder_path
from app.models.folder import FolderModel
from app.models.role import RoleModel  # Assuming RoleModel is imported
from app.models.user import UserModel  # Assuming UserModel is imported

router_folder = APIRouter()
folder_model = FolderModel()
storage_dir = configs.storage_dir

@router_folder.get("/")
async def index(
    search: Optional[str] = Query(None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=10, ge=1, le=100),
    current_user: str = Depends(authenticate)
):
    folders, total = folder_model.get_all(search=search, skip=skip, limit=limit)
    return {
        "message": "Folders retrieved successfully",
        "data": folders,
        "pagination": {
            "total": total,
            "skip": skip,
            "limit": limit
        }

    }

@router_folder.get("/{folder_id}")
async def show(
    folder_id: int,
    current_user: str = Depends(authenticate)
):
    folder = folder_model.get_by_id(folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    return {
        "message": "Folder retrieved successfully",
        "data": folder
    }



@router_folder.get("/children/{folder_id}")
async def children(
    folder_id: int,
    search: Optional[str] = Query(None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=10, ge=1, le=100),
    current_user: str = Depends(authenticate)
):
    folders, total = folder_model.get_children(
        folder_id,
        search=search,
        skip=skip,
        limit=limit
    )
    return {
        "message": "Folders retrieved successfully",
        "data": folders,
        "pagination": {
            "total": total,
            "skip": skip,
            "limit": limit
        }
    }


@router_folder.post("/store/")
async def store(
    name: str = Form(...),
    parent_id: Optional[int] = Form(default=None),
    current_user: str = Depends(authenticate)
):
    try:
        safe_slug = sanitize_filename(name)
        
        # Check if the slug already exists
        if folder_model.slug_exists(safe_slug):
            raise HTTPException(status_code=400, detail="A folder with this name already exists")
            
        # Create folder record
        folder_id = folder_model.create(
            name=name,
            slug=safe_slug,
            parent_id=parent_id
        )
        
        # Get the created folder to ensure consistent data handling
        new_folder = folder_model.get_by_id(folder_id)
        
        # Create physical folder with proper hierarchical path
        folder_path = get_folder_path(storage_dir, new_folder, folder_model)
        os.makedirs(folder_path, exist_ok=True)
        
        # Assign view permission to the current user for the created folder
        role_model = RoleModel()  # Assuming RoleModel is imported
        user = UserModel().get_by_username(current_user)  # Assuming UserModel is imported
        if user:
            role_model.set_resource_permissions(
                role_id=user['role_id'],
                resource_type='folders',
                resource_id=folder_id,
                can_read=True,
                can_write=True,
                can_delete=True
            )
        
        return {
            "message": "Folder created successfully",
            "data": {"id": folder_id, "name": name, "slug": safe_slug}
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router_folder.put("/{folder_id}")
async def update(
    folder_id: int,
    name: Optional[str] = Form(default=None),
    parent_id: Optional[int] = Form(default=None),
    current_user: str = Depends(authenticate)
):
    try:
        folder = folder_model.get_by_id(folder_id)
        if not folder:
            raise HTTPException(status_code=404, detail="Folder not found")

        # Get old folder path
        old_path = get_folder_path(storage_dir, folder, folder_model)
        
        # Prepare new values
        new_name = name if name else folder['name']
        new_slug = sanitize_filename(new_name) if name else folder['slug']
        
        # Update database record
        update_success = folder_model.update(
            folder_id=folder_id,
            name=new_name,
            parent_id=parent_id
        )
        
        if not update_success:
            raise HTTPException(status_code=500, detail="Failed to update folder")
        
        # Update slug if name changed
        if name:
            slug_update_success = folder_model.update_slug(folder_id=folder_id, slug=new_slug)
            if not slug_update_success:
                raise HTTPException(status_code=500, detail="Failed to update folder slug")
        
        # Get updated folder data
        updated_folder = folder_model.get_by_id(folder_id)
        
        new_path = get_folder_path(storage_dir, updated_folder, folder_model)
        
        # Move physical folder if path changed
        if old_path != new_path and os.path.exists(old_path):
            os.makedirs(os.path.dirname(new_path), exist_ok=True)
            shutil.move(old_path, new_path)

        return {
            "message": "Folder updated successfully",
            "data": updated_folder
        }
        
    except Exception as e:
        print(f"Error in update endpoint: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router_folder.delete("/{folder_id}")
async def delete(
    folder_id: int,
    current_user: str = Depends(authenticate)
):
    try:
        folder = folder_model.get_by_id(folder_id)
        if not folder:
            raise HTTPException(status_code=404, detail="Folder not found")

        # Delete physical folder using consistent path handling
        folder_path = get_folder_path(storage_dir, folder, folder_model)
        if os.path.exists(folder_path):
            shutil.rmtree(folder_path)

        # Delete database record
        folder_model.delete(folder_id)

        return {"message": "Folder deleted successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))