

export interface User {
    id: string;
    is_checked: boolean;
    username: string;
    hashed_password: string;
    email: string;
    phone: string;
    address: string;
    full_name: string;
    role: string;
    role_id: number;
    created_at?: Date;
    is_active?: boolean;
}

export interface Role
{
    is_checked: boolean;
    id: string;
    name: string;
    description: string;
    created_at: Date;
}

export interface Permission {
    id: string;
    name: string;
    description: string;
    created_at: Date;
}

export interface RolePermission {
    id: string;
    role_id: number;
    permission_id: number
    created_at: Date;
}

export interface ResourcePermissions {
    id: string;
    role_id: number | null;
    resource_type: string | "files" | "folders";
    resource_id: string | number;
    resource_name: string;
    can_read: boolean;
    can_write: boolean;
    can_delete: boolean;
    created_at: Date;
}


export interface Folder {
    id: string;
    children: Folder[];
    name: string;
    slug: string;
    parent_id: number;
    file_count: number;
    created_at: Date;
}

export interface File {
    id: string;
    name: string;
    slug: string;
    folder_id: number;
    folder_name: string;
    filepath: string;
    file_size: number;
    created_at: string;
}
export interface ChatHistory {
    slug: string;
    id: number;
    name: string;
    user_id: number;
    timestamp: Date;
}

export interface ChatMessage {
    id: number;
    group_id: number | null; 
    question: string;
    answer: string;
    sources: string;
    timestamp: Date;
}


export interface ReponseApiData<T> {
    message: string;
    data: T;
    pagination: Pagination;
}

export interface Pagination {
    limit: number;
    skip: number;
    total: number;
}

export interface Menu {
    id: number;
    title: string;
    slug?: string;
    icon?: string;
    url: string;
    active?: boolean;
}



export interface FormDataUpdateResourcePermission {
  name: string;
  description: string;
  items: string[];
  resource_permissions: ResourcePermissions;
}


