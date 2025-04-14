from fastapi import APIRouter, Depends, Form, HTTPException, Query
from typing import List, Optional
from enum import Enum

from app.api.dependencies import authenticate
from app.core.rag import RagSetup
from app.models.file import FileModel
from app.models.role import RoleModel
from app.models.user import UserModel

rag = RagSetup()

router_role = APIRouter()
role_model = RoleModel()
user_model = UserModel()
file_model = FileModel()

class ResourceType(str, Enum):
    FILE = "files"
    FOLDER = "folders"

# Role Management Endpoints
@router_role.get("/")
async def get_all_roles(
    search: Optional[str] = Query(None, description="Search query"),
    skip: int = Query(default=0, ge=0, description="Number of records to skip"),
    limit: int = Query(default=10, ge=1, le=100, description="Number of records to return"),
    current_user: str = Depends(authenticate)
):
    """Get all roles"""
    try:
        roles = role_model.get_all_roles(skip=skip, limit=limit, search=search)
       
        return {
            "message": "Roles retrieved successfully",
            "data": roles
            
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router_role.post("/")
async def create_role(
    name: str = Form(...),
    description: Optional[str] = Form(None),
    current_user: str = Depends(authenticate)
):
    """Create new role"""
    try:
        role_id = role_model.create_role(name, description)
        return {
            "message": "Role created successfully",
            "data": {"id": role_id}
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Permission Management Endpoints
@router_role.get("/permission/all")
async def get_all_permissions(
    current_user: str = Depends(authenticate)
):
    """Get all permissions"""
    permissions = role_model.get_all_permissions()
    return {
        "message": "Permissions retrieved successfully",
        "data": permissions
    }

@router_role.post("/permissions")
async def create_permission(
    name: str = Form(...),
    description: Optional[str] = Form(None),
    current_user: str = Depends(authenticate)
):
    """Create new permission"""
    try:
        permission_id = role_model.create_permission(name, description)
        return {
            "message": "Permission created successfully",
            "data": {"id": permission_id}
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router_role.get("/check-resource-permissions")
async def check_resource_permission(
    resource_type: ResourceType,
    resource_id: str,
    permission_type: str,
    current_user: str = Depends(authenticate)
):
    """Check if current user has specific permission for a resource"""
    user = user_model.get_by_username_for_permission(current_user)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    has_permission = role_model.check_resource_permission(
        user['id'], resource_type, resource_id, permission_type
    )
    return {
        "message": "Permission check completed",
        "has_permission": has_permission
    }

@router_role.post("/resource-permissions")
async def set_resource_permissions(
    role_id: int = Form(...),
    resource_type: ResourceType = Form(...),
    resource_id: int = Form(...),
    can_read: bool = Form(False),
    can_write: bool = Form(False),
    can_delete: bool = Form(False),
    current_user: str = Depends(authenticate)
):
    """Set permissions for a resource"""
    try:
        if not role_model.set_resource_permissions(
            role_id, resource_type, resource_id,
            can_read, can_write, can_delete
        ):
            raise HTTPException(
                status_code=400,
                detail="Failed to set resource permissions"
            )
        
        success_count = 0
        failure_count = 0
        
        if can_read and resource_type == ResourceType.FILE:
            # Get the file details
            file = file_model.get_file_by_id(resource_id)
            if not file:
                raise HTTPException(status_code=404, detail="File not found")
            
            # Get users in the role to update document ownership
            users = user_model.get_user_by_role_id(role_id)
            file_slug = file.get("slug")
            
            if not file_slug:
                print(f"⚠️ File missing slug: {file}")
                raise HTTPException(status_code=400, detail="File missing slug identifier")
            
            if users:
                for user in users:
                    user_id = user.get("id")
                    if user_id is not None:
                        try:
                            print(f"📄 Updating document {file_slug} to add owner: {user_id}")
                            updated = rag.update_document_owner(file_slug, str(user_id))
                            if updated > 0:
                                success_count += 1
                            else:
                                failure_count += 1
                                print(f"⚠️ No documents updated for file {file_slug}, user {user_id}")
                        except Exception as e:
                            failure_count += 1
                            print(f"❌ Error updating ownership for file {file_slug}, user {user_id}: {str(e)}")
            else:
                # If no users in role, just update with role_id
                try:
                    updated = rag.update_document_owner(file_slug, str(role_id))
                    if updated > 0:
                        success_count = 1
                except Exception as e:
                    print(f"❌ Error updating ownership with role_id for file {file_slug}: {str(e)}")
                    raise HTTPException(status_code=400, detail=f"Failed to set read permission: {str(e)}")

        return {
            "message": "Resource permissions set successfully",
            "details": {
                "role_id": role_id,
                "resource_type": resource_type,
                "resource_id": resource_id,
                "permissions": {
                    "read": can_read,
                    "write": can_write,
                    "delete": can_delete
                },
                "document_updates": {
                    "successful": success_count,
                    "failed": failure_count
                }
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in set_resource_permissions: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to set resource permissions: {str(e)}"
        )

# Parameterized routes
@router_role.get("/{role_id}")
async def get_role(
    role_id: int,
    current_user: str = Depends(authenticate)
):
    """Get role by ID"""
    role = role_model.get_role(role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    return {
        "message": "Role retrieved successfully",
        "data": role
    }

@router_role.put("/{role_id}")
async def update_role(
    role_id: int,
    name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    current_user: str = Depends(authenticate)
):

    """Update role"""
    if not role_model.update_role(role_id, name, description):
        raise HTTPException(status_code=404, detail="Role not found")
    return {"message": "Role updated successfully"}

@router_role.delete("/{role_id}")
async def delete_role(
    role_id: int,
    current_user: str = Depends(authenticate)
):
    """Delete role"""
    if not role_model.delete_role(role_id):
        raise HTTPException(status_code=404, detail="Role not found")
    return {"message": "Role deleted successfully"}

@router_role.post("/{role_id}/permissions/{permission_id}")
async def assign_permission(
    role_id: int,
    permission_id: int,
    current_user: str = Depends(authenticate)
):
    """Assign permission to role"""
    if not role_model.assign_permission_to_role(role_id, permission_id):
        raise HTTPException(
            status_code=400,
            detail="Failed to assign permission"
        )
    return {"message": "Permission assigned successfully"}

@router_role.delete("/{role_id}/permissions/{permission_id}")
async def remove_permission(
    role_id: int,
    permission_id: int,
    current_user: str = Depends(authenticate)
):
    """Remove permission from role"""
    if not role_model.remove_permission_from_role(role_id, permission_id):
        raise HTTPException(
            status_code=404,
            detail="Permission not found for this role"
        )
    return {"message": "Permission removed successfully"}

@router_role.get("/{role_id}/permissions")
async def get_role_permissions(
    role_id: int,
    current_user: str = Depends(authenticate)
):
    """Get all permissions for a role"""
    permissions = role_model.get_role_permissions(role_id)
    return {
        "message": "Permissions retrieved successfully",
        "data": permissions
    }

@router_role.get("/{role_id}/resource-permissions")
async def get_resource_permissions(
    role_id: int,
    current_user: str = Depends(authenticate)
):
    """Get all resource permissions for a role"""
    permissions = role_model.get_resource_permissions(role_id)
    return {
        "message": "Resource permissions retrieved successfully",
        "data": permissions
    }

@router_role.delete("/{role_id}/resource-permissions")
async def remove_resource_permissions(
    role_id: int,
    current_user: str = Depends(authenticate)
):
    """Remove resource permissions for a role"""
    if not role_model.remove_resource_permissions(role_id):
        raise HTTPException(
            status_code=404,
            detail="Resource permissions not found for this role"
        )
    return {"message": "Resource permissions removed successfully"}

@router_role.get("/user/{user_id}/role")
async def get_user_role(
    user_id: int,
    current_user: str = Depends(authenticate)
):
    """Get role information for a user"""
    role = role_model.get_user_role(user_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found for user")
    return {
        "message": "User role retrieved successfully",
        "data": role
    }

@router_role.post("/full-access/{role_id}")
async def set_full_access(
    role_id: int,
    current_user: str = Depends(authenticate)
):
    """Set full access to a resource"""
    try:
        # Set full access in the role model
        if not role_model.set_full_access(role_id):
            raise HTTPException(
                status_code=404,
                detail="Role not found"
            )
        
        # Get list of users in the role
        users = user_model.get_user_by_role_id(role_id)
        if not users:
            print(f"⚠️ No users found for role_id: {role_id}")
            return {"message": "Full access granted successfully, but no users found in role"}
        
        # Get list of files
        files = file_model.get_all_files()
        if not files:
            print("⚠️ No files found in system")
            return {"message": "Full access granted successfully, but no files found in system"}
        
        # Track success and failure counts
        success_count = 0
        failure_count = 0
        
        # Update document ownership for each file and user
        for file in files:
            file_slug = file.get("slug")
            if not file_slug:
                print(f"⚠️ File missing slug: {file}")
                continue
                
            for user in users:
                user_id = user.get("id")
                if user_id is None:
                    print(f"⚠️ User missing ID: {user}")
                    continue
                    
                try:
                    # Add this user as an owner to the document
                    print(f"📄 Updating document {file_slug} to add owner: {user_id}")
                    updated = rag.update_document_owner(file_slug, str(user_id))
                    
                    if updated > 0:
                        success_count += 1
                    else:
                        failure_count += 1
                        print(f"⚠️ No documents updated for file {file_slug}, user {user_id}")
                        
                except Exception as e:
                    failure_count += 1
                    print(f"❌ Error updating ownership for file {file_slug}, user {user_id}: {str(e)}")
        
        # Return results
        return {
            "message": "Full access granted successfully",
            "details": {
                "role_id": role_id,
                "users_count": len(users),
                "files_count": len(files),
                "successful_updates": success_count,
                "failed_updates": failure_count
            }
        }
        
    except Exception as e:
        print(f"❌ Error in set_full_access: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to set full access: {str(e)}"
        )