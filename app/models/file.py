from typing import List, Dict, Optional
from app.models.base import BaseModel
import os

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
        
        # Clean search parameter 
        if search:
            # Remove extra spaces
            search = search.strip()
            print(f"Searching for: '{search}', length: {len(search)}")
            
            # Modify query to use LOWER function for case-insensitive search
            query += " WHERE LOWER(f.name) LIKE LOWER(?)"
            count_query += " WHERE LOWER(f.name) LIKE LOWER(?)"
            
            # Add wildcard % to the start and end for partial matching
            search_param = f"%{search}%"
            params.append(search_param)
            print(f"Search parameter: '{search_param}'")

        # Get total count first (before pagination)
        total = self.execute_single(count_query, params)[0]
        print(f"Total matching records: {total}")

        # Check if skip is valid
        if skip >= total:
            print(f"Warning: skip value ({skip}) is greater than or equal to total records ({total})")
            # Adjust skip to get at least one result if possible
            skip = max(0, total - 1) if total > 0 else 0
            print(f"Adjusted skip to {skip}")

        # Add pagination
        query += " LIMIT ? OFFSET ?"
        params.extend([limit, skip])
        
        # Print full query with parameters for debugging
        print(f"Full query: {query}")
        print(f"Parameters: {params}")

        # Get records
        rows = self.execute_query(query, tuple(params))
        print(f"Fetched rows count: {len(rows)}")
        
        files = [self.row_to_dict(row, self.COLUMNS) for row in rows]
        
        # Debug the first few results
        if files:
            print(f"Sample result name: '{files[0].get('name')}'")
        else:
            # Debug rows in the database that might match
            debug_rows = self.execute_query(
                "SELECT id, name FROM files WHERE name LIKE ?", 
                (f"%{search}%",)
            )
            if debug_rows:
                print(f"Found {len(debug_rows)} rows with direct LIKE match:")
                for row in debug_rows:
                    print(f"  ID: {row[0]}, Name: '{row[1]}'")
        
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
    
    def update_parent(self, file_id: int, folder_id: int):
        """Update file's parent folder and move the file to the new location"""
        try:
            # Get file information
            file_data = self.get_file_by_id(file_id)
            if not file_data:
                return False, "File not found"
            
            # Get the new folder information
            folder = self.execute_single(
                "SELECT name, slug FROM folders WHERE id=?", 
                (folder_id,)
            )
            if not folder:
                return False, "Destination folder not found"
            
            folder_name, folder_slug = folder
            
            # Get the file's current path
            file_path_old = file_data.get('filepath')
            if not file_path_old:
                return False, "Source file path not found in database"
                
            if not os.path.exists(file_path_old):
                # If the physical file doesn't exist, just update the database
                print(f"Warning: Source file not found at {file_path_old}, updating database only")
            
            # Extract the filename from the old path
            file_name = os.path.basename(file_path_old)
            
            # Find the new folder path in the storage directory
            from pathlib import Path
            
            # Start with the base storage directory
            base_storage = Path("storage/uploads")
            
            # Look for the folder with the matching slug
            folder_path = None
            for path in base_storage.rglob('*'):
                if path.is_dir() and path.name == folder_slug:
                    folder_path = path
                    break
            
            if not folder_path:
                return False, f"Destination folder with slug '{folder_slug}' not found in storage"
            
            # Create the new file path
            file_path_new = str(folder_path / file_name)
            
            # Move the physical file if it exists
            if os.path.exists(file_path_old):
                import shutil
                try:
                    # Create parent directory if it doesn't exist
                    Path(file_path_new).parent.mkdir(parents=True, exist_ok=True)
                    # Move the file
                    shutil.move(file_path_old, file_path_new)
                    print(f"Successfully moved file from {file_path_old} to {file_path_new}")
                except Exception as e:
                    return False, f"Failed to move file: {str(e)}"

            # Update the database record - CRITICAL PART
            print(f"Updating database: file_id={file_id}, folder_id={folder_id}, new_path={file_path_new}")
            
            # Use direct execution with the database cursor since execute_update doesn't exist
            try:
                with self.db.get_cursor() as cursor:
                    # Execute the update SQL
                    cursor.execute(
                        "UPDATE files SET folder_id = ?, filepath = ? WHERE id = ?",
                        (folder_id, file_path_new, file_id)
                    )
                    
                    # Check if any rows were affected
                    if cursor.rowcount == 0:
                        return False, f"Database update failed: No rows affected for file ID {file_id}"
                    
                # Verify the update
                updated_file = self.get_file_by_id(file_id)
                if not updated_file or updated_file.get('filepath') != file_path_new:
                    return False, f"Database update verification failed: path not updated correctly"
                
                print(f"Database updated successfully for file_id={file_id}")
                return True, "File moved successfully"
            except Exception as db_error:
                print(f"Database update error: {db_error}")
                return False, f"Database update error: {str(db_error)}"
            
        except Exception as e:
            print(f"Error updating file parent: {e}")
            return False, str(e)
    def update_name(self, file_id: int, name: str) -> bool:
        """Update file name"""
        try:
            with self.db.get_cursor() as cursor:
                cursor.execute(
                    "UPDATE files SET name=? WHERE id=?", 
                    (name, file_id)
                )
                return cursor.rowcount > 0
        except Exception as e:
            print(f"Error updating file name: {e}")
            return False


