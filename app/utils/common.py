import os
import re

def sanitize_filename(name: str) -> str:
    """Sanitize filename by removing special chars and converting Vietnamese chars"""
    # Vietnamese character mapping
    vietnamese_chars = {
        'à':'a', 'á':'a', 'ạ':'a', 'ả':'a', 'ã':'a', 'â':'a', 'ầ':'a', 'ấ':'a', 'ậ':'a', 'ẩ':'a', 'ẫ':'a', 'ă':'a',
        'ằ':'a', 'ắ':'a', 'ặ':'a', 'ẳ':'a', 'ẵ':'a',
        'è':'e', 'é':'e', 'ẹ':'e', 'ẻ':'e', 'ẽ':'e', 'ê':'e', 'ề':'e', 'ế':'e', 'ệ':'e', 'ể':'e', 'ễ':'e',
        'ì':'i', 'í':'i', 'ị':'i', 'ỉ':'i', 'ĩ':'i',
        'ò':'o', 'ó':'o', 'ọ':'o', 'ỏ':'o', 'õ':'o', 'ô':'o', 'ồ':'o', 'ố':'o', 'ộ':'o', 'ổ':'o', 'ỗ':'o',
        'ơ':'o', 'ờ':'o', 'ớ':'o', 'ợ':'o', 'ở':'o', 'ỡ':'o',
        'ù':'u', 'ú':'u', 'ụ':'u', 'ủ':'u', 'ũ':'u', 'ư':'u', 'ừ':'u', 'ứ':'u', 'ự':'u', 'ử':'u', 'ữ':'u',
        'ỳ':'y', 'ý':'y', 'ỵ':'y', 'ỷ':'y', 'ỹ':'y',
        'đ':'d'
    }
    
    # Convert to lowercase
    name = name.lower()
    
    # Replace Vietnamese characters
    for vietnamese, latin in vietnamese_chars.items():
        name = name.replace(vietnamese, latin)
    
    # Remove special characters and replace spaces
    name = re.sub(r'[^\w\s-]', '', name)
    name = re.sub(r'[-\s]+', '_', name)
    
    # Remove leading/trailing hyphens and underscores
    return name.strip('-_')


def find_subdir(base_dir, target):
    for root, dirs, files in os.walk(base_dir):
        if target in dirs:
            return os.path.join(root, target)
    return None

def get_folder_path(storage_dir, folder=None, folder_model=None):
    """Build a consistent folder path based on folder data and storage directory
    
    Args:
        storage_dir: Base storage directory
        folder: Dictionary containing folder data with 'id', 'slug', and 'parent_id' keys
        folder_model: FolderModel instance to look up parent folders
        
    Returns:
        Full path to the folder
    """
    if not folder:
        return storage_dir
    
    # If folder has no parent or parent is 0/None, it's a root folder
    if not folder.get('parent_id'):
        return os.path.join(storage_dir, folder['slug'])
    
    # For nested folders, we need to build the full path
    path_parts = [folder['slug']]
    current_folder = folder
    
    # Use folder_model to get parent folders and build the full path
    while current_folder.get('parent_id') and folder_model:
        parent = folder_model.get_by_id(current_folder['parent_id'])
        if not parent:
            break
        
        path_parts.append(parent['slug'])
        current_folder = parent
    
    # Reverse the parts to get correct order (parent -> child)
    path_parts.reverse()
    
    # Join all parts to build the complete path
    return os.path.join(storage_dir, *path_parts)