from typing import Any, Dict, List, Optional

class BaseModel:
    def __init__(self):
        # Import db động khi cần thiết để tránh circular import
        from app.api.dependencies import db
        self.db = db

    @staticmethod
    def row_to_dict(row: tuple, columns: List[str]) -> Dict[str, Any]:
        """Convert database row to dictionary"""
        return dict(zip(columns, row)) if row else None

    def execute_query(self, query: str, params: tuple = None) -> Any:
        """Execute database query and return result"""
        with self.db.get_cursor() as cursor:
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)
            return cursor.fetchall()

    def execute_single(self, query: str, params: tuple | list | str | int = None) -> tuple:
        """Execute a query and return first row"""
        with self.db.get_cursor() as cursor:
            if params is None:
                cursor.execute(query)
            else:
                # If single string/int value, convert to single-item tuple
                if isinstance(params, (str, int)):
                    params = (params,)
                # If list, convert to tuple
                elif isinstance(params, list):
                    params = tuple(params)
                cursor.execute(query, params)
            return cursor.fetchone()

    def execute_insert(self, query: str, params: tuple) -> int:
        """Execute insert query and return last row id"""
        with self.db.get_cursor() as cursor:
            cursor.execute(query, params)
            return cursor.lastrowid
