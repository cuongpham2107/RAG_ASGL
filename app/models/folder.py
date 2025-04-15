from typing import List, Dict, Optional
from app.models.base import BaseModel

class FolderModel(BaseModel):
    COLUMNS = ['id', 'name', 'slug', 'parent_id', 'created_at']

    def get_all(self, search: str, skip: int, limit: int) -> List[Dict]:
        """Get all root folders (parent_id = 0) with pagination and search"""
        query = "SELECT * FROM folders"
        params = []
        if search:
            query += " AND (name LIKE ? OR slug LIKE ?)"
            params.extend([f"%{search}%", f"%{search}%"])
        query += " LIMIT ? OFFSET ?"
        params.extend([limit, skip])

        rows = self.execute_query(query, tuple(params))
        total_rows = self.execute_single("SELECT COUNT(*) FROM folders WHERE parent_id = 0", ())
        total = total_rows[0]
        folders = []
        for r in rows:
            folder_dict = self.row_to_dict(r, self.COLUMNS)
            count = self.execute_single(
                "SELECT COUNT(*) FROM files WHERE folder_id = ?", 
                (folder_dict['id'],)
            )[0]
            folder_dict['file_count'] = count
            folders.append(folder_dict)
            
        return folders, total

    def create(self, name: str, slug: str, parent_id: Optional[int] = None) -> int:
        """Create new folder"""
        return self.execute_insert(
            "INSERT INTO folders (name, slug, parent_id) VALUES (?, ?, ?)",
            (name, slug, parent_id)
        )
    def get_by_id(self, folder_id: int) -> Optional[Dict]:
        """Get folder by ID"""
        folder =  self.execute_single("SELECT * FROM folders WHERE id = ?", (folder_id,))
        return self.row_to_dict(folder, self.COLUMNS) if folder else None
    
    
    def update(self, folder_id: int, name: str, parent_id: Optional[int]) -> bool:
        """Update folder"""
        try:
            if parent_id is not None:
                query = "UPDATE folders SET name = ?, parent_id = ? WHERE id = ?"
                params = (name, parent_id, folder_id)
            else:
                query = "UPDATE folders SET name = ? WHERE id = ?"
                params = (name, folder_id)
                
            # Use execute_update method if available in BaseModel
            if hasattr(self, 'execute_update'):
                return self.execute_update(query, params) > 0
            else:
                # Fall back to a simpler approach
                with self.db.get_cursor() as cursor:
                    cursor.execute(query, params)
                    return cursor.rowcount > 0
        except Exception as e:
            print(f"Error updating folder: {e}")
            return False

    def slug_exists(self, slug):
        """Check if a folder with the given slug already exists"""
        with self.db.get_cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM folders WHERE slug = ?", (slug,))
            count = cursor.fetchone()[0]
            return count > 0
        
    def update_slug(self, folder_id, slug):
        """Update the slug for a folder"""
        try:
            query = "UPDATE folders SET slug = ? WHERE id = ?"
            params = (slug, folder_id)
            
            # Use execute_update method if available in BaseModel
            if hasattr(self, 'execute_update'):
                return self.execute_update(query, params) > 0
            else:
                # Fall back to a simpler approach
                with self.db.get_cursor() as cursor:
                    cursor.execute(query, params)
                    return cursor.rowcount > 0
        except Exception as e:
            print(f"Error updating slug: {e}")
            return False

    def get_children(self, parent_id: int, search: str = None, skip: int = 0, limit: int = 10) -> List[Dict]:
        """Get folders that have the specified parent_id with pagination and search"""
        query = "SELECT * FROM folders WHERE parent_id = ?"
        params = [parent_id]
        
        if search:
            query += " AND (name LIKE ? OR slug LIKE ?)"
            params.extend([f"%{search}%", f"%{search}%"])
            
        query += " LIMIT ? OFFSET ?"
        params.extend([limit, skip])
        
        rows = self.execute_query(query, tuple(params))
        
        # Get total count for pagination
        count_query = "SELECT COUNT(*) FROM folders WHERE parent_id = ?"
        count_params = [parent_id]
        
        if search:
            count_query += " AND (name LIKE ? OR slug LIKE ?)"
            count_params.extend([f"%{search}%", f"%{search}%"])
            
        total_rows = self.execute_single(count_query, tuple(count_params))
        total = total_rows[0]
        
        folders = []
        for row in rows:
            folder_dict = self.row_to_dict(row, self.COLUMNS)
            # Include file count for each folder
            file_count = self.execute_single(
                "SELECT COUNT(*) FROM files WHERE folder_id = ?", 
                (folder_dict['id'],)
            )[0]
            folder_count = self.execute_single(
                "SELECT COUNT(*) FROM folders WHERE parent_id = ?", 
                (folder_dict['id'],)
            )[0]

            folder_dict['file_count'] = file_count + folder_count
            folders.append(folder_dict)
        
        return folders, total
    
    def get_all_folders(self) -> List[Dict]:
        """Get all folders"""
        query = "SELECT * FROM folders"
        rows = self.execute_query(query, ())
        folders = []
        for r in rows:
            folder_dict = self.row_to_dict(r, self.COLUMNS)
            count = self.execute_single(
            "SELECT COUNT(*) FROM files WHERE folder_id = ?", 
            (folder_dict['id'],)
            )[0]
            folder_dict['file_count'] = count
            folders.append(folder_dict)
            
        return folders

    def delete(self, folder_id: int) -> bool:
        """Delete a folder by ID"""
        try:
            query = "DELETE FROM folders WHERE id = ?"
            # Use execute_update if available in BaseModel
            if hasattr(self, 'execute_update'):
                return self.execute_update(query, (folder_id,)) > 0
            else:
                # Fall back to a simpler approach
                with self.db.get_cursor() as cursor:
                    cursor.execute(query, (folder_id,))
                    return cursor.rowcount > 0
        except Exception as e:
            print(f"Error deleting folder: {e}")
            return False


    def build_tree(self) -> List[Dict]:
        """Build a tree structure from the database"""
        folders = self.get_all_folders()
        folder_dict = {folder['id']: folder for folder in folders}
        tree = []
        for folder in folders:
            folder['children'] = []
            if folder['parent_id'] == 0:
                tree.append(folder)
            else:
                parent = folder_dict.get(folder['parent_id'])
                if parent:
                    parent['children'].append(folder)
        return tree
   
