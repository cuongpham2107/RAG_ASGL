import { Permission } from "../types";
import { API_URL, token } from "./base";

export async function getRoles(
    search?: string,
    skip?: number,
    limit?: number
) {
    try{
        const searchParam = search ? `search=${encodeURIComponent(search)}` : '';
        const response = await fetch(`${API_URL}/roles?${searchParam ?? ""}&skip=${skip ?? 0}&limit=${limit ?? 20}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (!response.ok) {
            throw new Error('Failed to fetch roles');
        }
        const data = await response.json();
        return data.data;
    }
    catch (err) {
        throw new Error(err instanceof Error ? err.message : 'An error occurred');
    }
}

export async function addRole(name: string, description: string) {
    try {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('description', description);
        const response = await fetch(`${API_URL}/roles`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: formData,
        });
    
        if (!response.ok) {
            throw new Error('Failed to add role');
        }
    
        const data = await response.json();
        return data.data;
    } catch (err) {
        throw new Error(err instanceof Error ? err.message : 'An error occurred');
    }
}
export async function getRole(roleId: number){
    try {
        const response = await fetch(`${API_URL}/roles/${roleId}`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
        },
        });
        if (!response.ok) {
            throw new Error('Failed to fetch role');
        }
        const data = await response.json();
        return data.data;
    } catch (err) {
        throw new Error(err instanceof Error ? err.message : 'An error occurred');
    }
}

export async function deleleRole(id: number) {
    try {
        const response = await fetch(`${API_URL}/roles/${id}`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${token}`,
        },
        });
        if (!response.ok) {
            throw new Error('Failed to delete role');
        }
        const data = await response.json();
        return data.data;
    } catch (err) {
        throw new Error(err instanceof Error ? err.message : 'An error occurred');
    }
}

export async function getPermissions() {
    try {
        const response = await fetch(`${API_URL}/roles/permission/all`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
        },
        });
        if (!response.ok) {
            throw new Error('Failed to fetch permissions');
        }
        const data = await response.json();
        return data.data;
    } catch (err) {
        throw new Error(err instanceof Error ? err.message : 'An error occurred');
    }
}

export async function getRolePermissions(roleId: number): Promise<Permission[]> {
    try {
        const response = await fetch(`${API_URL}/roles/${roleId}/permissions`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
        },
        });
        if (!response.ok) {
            throw new Error('Failed to fetch role permissions');
        }
        const data = await response.json();
        return data.data;
    } catch (err) {
        throw new Error(err instanceof Error ? err.message : 'An error occurred');
    }
}

export async function getResourcePermissions(roleId: number) {
    try {
        const response = await fetch(`${API_URL}/roles/${roleId}/resource-permissions`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
        },
        });
    
        if (!response.ok) {
            throw new Error('Failed to fetch resource permissions');
        }
    
        const data = await response.json();
        return data.data;
    } catch (err) {
        throw new Error(err instanceof Error ? err.message : 'An error occurred');
    }
}

export async function getFolderAndFileInPermissions(resource_type: string) {
    try {
        const response = await fetch(`${API_URL}/${resource_type}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (!response.ok) {
            throw new Error('Failed to fetch folder and file');
        }
        const result = await response.json();
        
        let data = result.data;
        
        if (Array.isArray(result)) {
            data = result;
        }
        else if (!Array.isArray(data) && data?.items) {
            data = data.items;
        }
        if (!Array.isArray(data)) {
            return [];
        }
        
        return data;
    } catch (err) {
        console.error('Error in getFolderAndFileInPermissions:', err);
        return []; // Return empty array instead of throwing
    }
}

export async function createAndUpdateFullRoleAccess(roleId: number) {
    try {
        const response = await fetch(`${API_URL}/roles/full-access/${roleId}`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (!response.ok) {
            throw new Error('Failed to create full role access');
        }
        const data = await response.json();
        return data.data;

    } catch (err) {
        throw new Error(err instanceof Error ? err.message : 'An error occurred');
    }

}

export async function addAndUpdateResourcePermission(
    roleId: number,
    resourceType: string,
    resourceId: string,
    canRead: boolean,
    canWrite: boolean,
    canDelete: boolean
) {
    try {
        const formData = new FormData();
        formData.append('role_id', roleId.toString());
        formData.append('resource_type', resourceType);
        formData.append('resource_id', Number(resourceId).toString());
        formData.append('can_read', canRead ? '1' : '0');
        formData.append('can_write', canWrite ? '1' : '0');
        formData.append('can_delete', canDelete ? '1' : '0');
        
        
        const response = await fetch(`${API_URL}/roles/resource-permissions`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: formData,
        });
        
        if (!response.ok) {
            throw new Error('Failed to add resource permission');
        }
    
        const data = await response.json();
        return data.data;
    } catch (err) {
        throw new Error(err instanceof Error ? err.message : 'An error occurred');
    }
}


export async function removeResourcePermission(id: number) {
    try {
        const response = await fetch(`${API_URL}/roles/${id}/resource-permissions`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${token}`,
            },
        });
    
        if (!response.ok) {
            throw new Error('Failed to remove resource permission');
        }
    
        const data = await response.json();
        return data.data;
    } catch (err) {
        throw new Error(err instanceof Error ? err.message : 'An error occurred');
    }
}

export async function checkResourcePermission(
    resourceId: string,
    resourceType: string,
    permissionType: string
) {
    try {
        const queryParams = new URLSearchParams({
            resource_type: resourceType,
            resource_id: resourceId,
            permission_type: permissionType
        });

        const response = await fetch(`${API_URL}/roles/check-resource-permissions?${queryParams}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to check resource permissions');
        }

        const data = await response.json();
        return data.has_permission;
    } catch (err) {
        throw new Error(err instanceof Error ? err.message : 'An error occurred');
    }
}