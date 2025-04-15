
import { API_URL, token } from "./base";

export async function getFolders(
    search: string = "",
    skip: number = 0,
    limit: number = 10
){
    try {
        const searchParam = search ? `search=${encodeURIComponent(search)}` : '';
        const response = await fetch(`${API_URL}/folders?${searchParam}&skip=${skip}&limit=${limit}`, {
            headers: {
            Authorization: `Bearer ${token}`
            }
        });
        if(response.ok)
        {
            const results = await response.json();
            return results.data;
        }
        throw new Error("Failed to fetch folders");
    } catch (error) {
        throw error;
    }
}


export async function getFolder(id: string){
    try {
        const response = await fetch(`${API_URL}/folders/${id}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        if(response.ok)
        {
            const results = await response.json();
            return results.data;
        }
        throw new Error("Failed to fetch folder");
    }
    catch (error) {
        throw error;
    }
}

export async function getChildFolders(
    id: string,
    search: string = "",
    skip: number = 0,
    limit: number = 10
){
    try {
        const searchParam = search ? `search=${encodeURIComponent(search)}` : '';
        const response = await fetch(`${API_URL}/folders/children/${id}?${searchParam}&skip=${skip}&limit=${limit}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        if(response.ok)
        {
            const results = await response.json();
            return results.data;
        }
        throw new Error("Failed to fetch child folders");
    }
    catch (error) {
        throw error;
    }
}

export async function updateFolder(id: string, name: string){
    try {
        const formData = new FormData();
        formData.append('name', name);
        const response = await fetch(`${API_URL}/folders/${id}`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: formData
        });
        if(response.ok)
        {
            return true;
        }
        throw new Error("Failed to update folder");
    }
    catch (error) {
        throw error;
    }
}

export async function deleteFolder(id: string){
    try {
        const response = await fetch(`${API_URL}/folders/${id}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        if(response.ok)
        {
            return true;
        }
        throw new Error("Failed to delete folder");
    }
    catch (error) {
        throw error;
    }
}


export async function getTreeFolder(){
    try {
        const response = await fetch(`${API_URL}/folders/build-tree/`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        if(response.ok)
        {
            const results = await response.json();
            return results.data;
        }
        throw new Error("Failed to fetch tree folder");
    }
    catch (error) {
        throw error;
    }
}