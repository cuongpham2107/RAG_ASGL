from typing import List, Optional, Dict
from app.models.base import BaseModel
from app.core import security

class UserModel(BaseModel):
    COLUMNS = ['id', 'username', 'hashed_password', 'email', 'phone', 
               'address', 'full_name', 'role_id', 'created_at', 'is_active']

    def get_all(self, skip: int, limit: int, search:str) -> List[Dict]:
        """Get all users with pagination and search"""
        query = """
            SELECT u.*, r.name as role 
            FROM users u 
            LEFT JOIN roles r ON u.role_id = r.id
        """
        params = []
        if search:
            query += " WHERE u.username LIKE ? OR u.email LIKE ? OR u.phone LIKE ?"
            params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])
        query += " LIMIT ? OFFSET ?"
        params.extend([limit, skip])

        rows = self.execute_query(query, tuple(params))
        total_rows = self.execute_single("SELECT COUNT(*) FROM users", ())
        total = total_rows[0]
        
        users = []
        columns = self.COLUMNS + ['role']  # Add role to columns
        for r in rows:
            user_dict = self.row_to_dict(r, columns)
            users.append(user_dict)
      
        return {
            "users": users,
            "total": total,
            "skip": skip,
            "limit": limit,
            "search": search
        }
        
    

    def get_by_username(self, username: str) -> Optional[Dict]:
        """Get user by username"""
        # Ensure username is a string, not a tuple
        if isinstance(username, tuple) and username:
            username = username[0]
            
        row = self.execute_single(
            """SELECT u.*, r.name as role 
            FROM users u 
            LEFT JOIN roles r ON u.role_id = r.id 
            WHERE u.username = ?""", 
            (username,)  # Always pass as tuple for consistency
        )
        return self.row_to_dict(row, self.COLUMNS + ['role'])
    
    def get_by_usename_email_phone(self, username: str, email: str, phone: str) -> Optional[Dict]:
        """Get user by username, email, and phone"""
        row = self.execute_single(
            "SELECT * FROM users WHERE username = ? AND email = ? AND phone = ?",
            (username, email, phone)
        )
        return self.row_to_dict(row, self.COLUMNS)
    
    def create_user(
            self, 
            username: str, 
            password: str,
            role_id: int,
            email: str = None,
            phone: str = None, 
            address: str = None, 
            full_name: str = None
            ) -> int:
        """Create new user"""
        hashed_password = security.password_hash(password)
        return self.execute_insert(
            """INSERT INTO users (username, hashed_password, email, phone, address, full_name, role_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (username, hashed_password, email, phone, address, full_name, role_id)
        )
    def update_user(
        self, 
        user_id: int,
        role_id: int,
        email: str = None, 
        phone: str = None,
        address: str = None, 
        password: str = None,
        full_name: str = None,
        ) -> bool:
        """Update user"""
        fields = ["email = ?", "phone = ?", "address = ?", "full_name = ?", "role_id = ?"]
        params = [email, phone, address, full_name, role_id]

        if password:
            fields.append("hashed_password = ?")
            params.append(security.password_hash(password))

        params.append(user_id)
        query = f"UPDATE users SET {', '.join(fields)} WHERE id = ?"
        
        with self.db.get_cursor() as cursor:
            cursor.execute(query, tuple(params))
            return cursor.rowcount > 0

    def delete_user(self, user_id: int) -> bool:
        """Delete user"""
        with self.db.get_cursor() as cursor:
            cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
            return cursor.rowcount > 0
    def update_password(self, user_id: int, password: str) -> bool:
        """Update user password"""
        hashed_password = security.password_hash(password)
        query = "UPDATE users SET hashed_password = ? WHERE id = ?"
        with self.db.get_cursor() as cursor:
            cursor.execute(query, (hashed_password, user_id))
            return cursor.rowcount > 0
        
    def verify_password(self, username: str, password: str) -> bool:
        """Verify user password"""
        hashed = self.execute_single(
            "SELECT hashed_password FROM users WHERE username = ?",
            (username,)
        )
        return hashed and security.verify_password(password, hashed[0])

    def get_by_username_for_permission(self, username: str) -> Optional[Dict]:
        """Get user by username specifically for permission checks"""
        query = """
            SELECT id, username, role_id
            FROM users
            WHERE username = ?
        """
        with self.db.get_cursor() as cursor:
            # Ensure username is in the correct format for parameter binding
            param = username[0] if isinstance(username, tuple) else username
            cursor.execute(query, (param,))  # Use tuple instead of list
            row = cursor.fetchone()
            if row:
                return {
                    "id": row[0],
                    "username": row[1],
                    "role_id": row[2]
                }
        return None
    
    def get_user_by_role_id(self, role_id: int) -> List[Dict]:
        """Get users by role ID"""
        query = """
            SELECT u.*, r.name as role 
            FROM users u 
            LEFT JOIN roles r ON u.role_id = r.id 
            WHERE u.role_id = ?
        """
        rows = self.execute_query(query, (role_id,))
        return [self.row_to_dict(row, self.COLUMNS + ['role']) for row in rows]
