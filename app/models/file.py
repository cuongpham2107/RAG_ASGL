from typing import List, Dict, Optional
from app.models.base import BaseModel

class FileModel(BaseModel):
    COLUMNS = ['id', 'name', 'slug', 'folder_id', 'filepath', 
               'file_size', 'created_at', 'folder_name']

    def get_all(self, skip: int = 0, limit: int = 10, 
                search: Optional[str] = None) -> tuple[List[Dict], int]:
        """Get all files with pagination and search"""
        # Base query with folder join
        query = """
            SELECT f.*, folders.name as folder_name 
            FROM files f
            LEFT JOIN folders ON f.folder_id = folders.id
        """
        count_query = "SELECT COUNT(*) FROM files f"
        params = []

        # Add search condition
        if search:
            query += " WHERE f.name LIKE ? OR f.slug LIKE ?"
            count_query += " WHERE f.name LIKE ? OR f.slug LIKE ?"
            params.extend([f"%{search}%", f"%{search}%"])

        # Add pagination
        query += " LIMIT ? OFFSET ?"
        params.extend([limit, skip])

        # Get total count
        total = self.execute_single(count_query, params[:-2])[0]

        # Get records
        rows = self.execute_query(query, tuple(params))
        files = [self.row_to_dict(row, self.COLUMNS) for row in rows]

        return files, total


    def get_all_files(self) -> List[Dict]:
        """Get all files"""
        query = "SELECT * FROM files"
        rows = self.execute_query(query, ())
        return [self.row_to_dict(row, self.COLUMNS) for row in rows]
    
    def get_recent(self, limit: int = 5) -> List[Dict]:
        """Get recent files"""
        rows = self.execute_query(
            "SELECT * FROM files ORDER BY created_at DESC LIMIT ?",
            (limit,)
        )
        return [self.row_to_dict(row, self.COLUMNS) for row in rows]

    def get_by_folder(self, folder_id: int) -> List[Dict]:
        """Get files in a folder"""
        query = """
            SELECT f.*, folders.name as folder_name 
            FROM files f
            LEFT JOIN folders ON f.folder_id = folders.id
            WHERE f.folder_id = ?
        """
        rows = self.execute_query(query, (folder_id,))
        return [self.row_to_dict(row, self.COLUMNS) for row in rows]

    def create(
        self, 
        name: str, 
        slug: str, 
        folder_id: Optional[int],
        filepath: str, 
        file_size: int) -> int:
        """Create new file record"""
        return self.execute_insert(
            """INSERT INTO files (name, slug, folder_id, filepath, file_size)
            VALUES (?, ?, ?, ?, ?)""",
            (name, slug, folder_id, filepath, file_size)
        )
    
    def get_file_by_id(self, file_id: int) -> Dict | None:
        """Get file by ID"""
        row = self.execute_single(
            "SELECT * FROM files WHERE id=?", 
            (file_id,)
        )
        return self.row_to_dict(row, self.COLUMNS) if row else None
    def slug_exists(self, slug: str) -> bool:
        """Check if a file with the slug exists"""
        return self.execute_single(
            "SELECT EXISTS(SELECT 1 FROM files WHERE slug=?)",
            (slug,)
        )[0] == 1
    
    def get_id_by_slug(self, slug: str) -> int | None:
        """Get file ID by slug"""
        return self.execute_single(
            "SELECT id FROM files WHERE slug=?", 
            (slug,)
        )[0]
    
    def get_name_by_slug(self, slug: str) -> str | None:
        """Get file name by slug"""
        return self.execute_single(
            "SELECT name FROM files WHERE slug=?", 
            (slug,)
        )[0]
