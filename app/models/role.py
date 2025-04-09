from typing import List, Optional, Dict
from datetime import datetime
from app.models.base import BaseModel

class RoleModel(BaseModel):
    COLUMNS = ['id', 'name', 'description', 'created_at']

    # Role Management
    def get_all_roles(self, skip: int, limit: int, search:str ) -> List[Dict]:
        """Get all roles with pagination and search"""
        query = "SELECT * FROM roles"
        params = []
        if search:
            query += " WHERE name LIKE ? OR description LIKE ?"
            params.extend([f"%{search}%", f"%{search}%"])
        
        query += " LIMIT ? OFFSET ?"
        params.extend([limit, skip])

        row = self.execute_query(query, tuple(params))


        total_rows = self.execute_single("SELECT COUNT(*) FROM roles", ())
        total = total_rows[0]

        return {
            "roles" : [self.row_to_dict(r, self.COLUMNS) for r in row], 
            "total": total,
            "skip": skip,
            "limit": limit,
            "search": search
        }

        
    def create_role(self, name: str, description: str = None) -> int:
        """Create a new role"""
        with self.db.get_cursor() as cursor:
            cursor.execute(
                "INSERT INTO roles (name, description) VALUES (?, ?)",
                (name, description)
            )
            return cursor.lastrowid

    def get_role(self, role_id: int) -> Dict:
        """Get role by id"""
        with self.db.get_cursor() as cursor:
            cursor.execute("SELECT * FROM roles WHERE id = ?", (role_id,))
            role = cursor.fetchone()
            if role:
                return {
                    "id": role[0],
                    "name": role[1],
                    "description": role[2],
                    "created_at": role[3]
                }
        return None

    def update_role(self, role_id: int, name: str = None, description: str = None) -> bool:
        """Update role details"""
        updates = []
        values = []
        if name:
            updates.append("name = ?")
            values.append(name)
        if description:
            updates.append("description = ?")
            values.append(description)
        
        if not updates:
            return False

        values.append(role_id)
        query = f"UPDATE roles SET {', '.join(updates)} WHERE id = ?"
        
        with self.db.get_cursor() as cursor:
            cursor.execute(query, tuple(values))
            return cursor.rowcount > 0

    def delete_role(self, role_id: int) -> bool:
        """Delete a role"""
        with self.db.get_cursor() as cursor:
            cursor.execute("DELETE FROM roles WHERE id = ?", (role_id,))
            return cursor.rowcount > 0

    # Permission Management
    def get_all_permissions(self) -> List[Dict]:
        """Get all permissions"""
        with self.db.get_cursor() as cursor:
            cursor.execute("SELECT * FROM permissions")
            permissions = cursor.fetchall()
            return [{
                "id": p[0],
                "name": p[1],
                "description": p[2],
                "created_at": p[3]
            } for p in permissions]

    def create_permission(self, name: str, description: str = None) -> int:
        """Create a new permission"""
        with self.db.get_cursor() as cursor:
            cursor.execute(
                "INSERT INTO permissions (name, description) VALUES (?, ?)",
                (name, description)
            )
            return cursor.lastrowid

    def assign_permission_to_role(self, role_id: int, permission_id: int) -> bool:
        """Assign a permission to a role"""
        try:
            with self.db.get_cursor() as cursor:
                cursor.execute(
                    "INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)",
                    (role_id, permission_id)
                )
                return True
        except:
            return False

    def remove_permission_from_role(self, role_id: int, permission_id: int) -> bool:
        """Remove a permission from a role"""
        with self.db.get_cursor() as cursor:
            cursor.execute(
                "DELETE FROM role_permissions WHERE role_id = ? AND permission_id = ?",
                (role_id, permission_id)
            )
            return cursor.rowcount > 0

    def get_role_permissions(self, role_id: int) -> List[Dict]:
        """Get all permissions for a role"""
        with self.db.get_cursor() as cursor:
            cursor.execute("""
                SELECT p.* FROM permissions p
                JOIN role_permissions rp ON p.id = rp.permission_id
                WHERE rp.role_id = ?
            """, (role_id,))
            permissions = cursor.fetchall()
            return [{
                "id": p[0],
                "name": p[1],
                "description": p[2],
                "created_at": p[3]
            } for p in permissions]

    # Resource Permission Management
    def get_resource_permissions(self, role_id: int) -> List[Dict]:
        """Get all resource permissions for a role"""
        with self.db.get_cursor() as cursor:
            cursor.execute("""
                SELECT * FROM resource_permissions 
                WHERE role_id = ?
            """, (role_id,))
            permissions = cursor.fetchall()
            results = []
            for p in permissions:
                # Validate resource type
                resource_type = p[2]
                if resource_type not in ['files', 'folders']: 
                    continue
                
                # Use f-string for table name but parameters for values
                query = f"SELECT * FROM {resource_type} WHERE id = ?"
                resource = self.execute_single(query, (p[3],))
                if not resource:
                    continue

                results.append({
                    "id": p[0],
                    "role_id": p[1],
                    "resource_type": resource_type,
                    "resource_id": p[3],
                    "resource_name": resource[1],  # Fixed typo in key name
                    "can_read": bool(p[4]),
                    "can_write": bool(p[5]),
                    "can_delete": bool(p[6]),
                    "created_at": p[7]
                })
            return results

    def set_resource_permissions(
        self, 
        role_id: int, 
        resource_type: str,
        resource_id: int,
        can_read: bool = False,
        can_write: bool = False,
        can_delete: bool = False
    ) -> bool:
        """Set permissions for a resource (file/folder) for a role"""
        with self.db.get_cursor() as cursor:
            # Check if permission exists
            cursor.execute("""
                SELECT id FROM resource_permissions 
                WHERE role_id = ? AND resource_type = ? AND resource_id = ?
            """, (role_id, resource_type, resource_id))
            
            exists = cursor.fetchone()
            
            if exists:
                # Update existing permission
                cursor.execute("""
                    UPDATE resource_permissions 
                    SET can_read = ?, can_write = ?, can_delete = ?
                    WHERE role_id = ? AND resource_type = ? AND resource_id = ?
                """, (
                    int(can_read), int(can_write), int(can_delete),
                    role_id, resource_type, resource_id
                ))
            else:
                # Insert new permission
                cursor.execute("""
                    INSERT INTO resource_permissions 
                    (role_id, resource_type, resource_id, can_read, can_write, can_delete)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    role_id, resource_type, resource_id,
                    int(can_read), int(can_write), int(can_delete)
                ))
            
            return True

    def check_resource_permission(
        self, 
        user_id: int, 
        resource_type: str,
        resource_id: str,
        permission_type: str
    ) -> bool:
        """Check if a user has specific permission for a resource"""
        with self.db.get_cursor() as cursor:
            cursor.execute("""
                SELECT rp.can_read, rp.can_write, rp.can_delete
                FROM users u
                JOIN resource_permissions rp ON u.role_id = rp.role_id
                WHERE u.id = ? 
                AND rp.resource_type = ?
                AND rp.resource_id = ?
            """, (user_id, resource_type, resource_id))
            
            result = cursor.fetchone()
            if not result:
                return True
                
            if permission_type == 'can_read':
                return bool(result[0])
            elif permission_type == 'can_write':
                return bool(result[1])
            elif permission_type == 'can_delete':
                return bool(result[2])
            return False

    def remove_resource_permissions(self, id: int) -> bool:
        """Remove resource permissions for a role"""
        with self.db.get_cursor() as cursor:
            cursor.execute("DELETE FROM resource_permissions WHERE id = ?", (id,))
            return cursor.rowcount > 0
        
    def get_user_role(self, user_id: int) -> Dict:
        """Get role information for a user"""
        with self.db.get_cursor() as cursor:
            cursor.execute("""
                SELECT r.* FROM roles r
                JOIN users u ON r.id = u.role_id
                WHERE u.id = ?
            """, (user_id,))
            role = cursor.fetchone()
            if role:
                return {
                    "id": role[0],
                    "name": role[1],
                    "description": role[2],
                    "created_at": role[3]
                }
        return None


    def set_full_access(self, role_id: int) -> bool:
        """
        Set full access for a role
        Get All files and folders and set permissions
        If role_id, resource_type, resource_id already exists, update the permissions
        """
        with self.db.get_cursor() as cursor:
            # Get all files
            cursor.execute("SELECT id FROM files")
            files = cursor.fetchall()
            for f in files:
                self.set_resource_permissions(role_id, 'files', f[0], True, True, True)
            
            # Get all folders
            cursor.execute("SELECT id FROM folders WHERE id != 0")
            folders = cursor.fetchall()
            for f in folders:
                self.set_resource_permissions(role_id, 'folders', f[0], True, True, True)
            
            return True
