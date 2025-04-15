import { File } from "../types";
import { API_URL, token } from "./base";

export async function getFiles(
    folder_id: string,
    search: string = "",
    skip: number = 1,
    limit: number = 10
){
    try {
        const searchParam = search ? `search=${encodeURIComponent(search)}` : '';
        const response = await fetch(`${API_URL}/files/show/?folder_id=${folder_id ?? "0"}&${searchParam}&skip=${skip}&limit=${limit}`, {
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

export async function getFile(idFile: number) {
    try{
        const response = await fetch(`${API_URL}/files/${idFile}`, {
            headers: {
            Authorization: `Bearer ${token}`
            }
        });
        if(response.ok)
        {
            const results = await response.json();
            return results.data;
        }
        throw new Error("Failed to fetch file");
    }
    catch(error) {
        throw error;
    }
}


export async function getFilesRecent(){
    try {
        const response = await fetch(`${API_URL}/files/recent/`, {
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
    }
    catch(error) {
        throw error;
    }
}


export async function getAllFiles(
    search: string = "",
    skip: number = 1,
    limit: number = 10
){
    try {
        const searchParam = search ? `search=${encodeURIComponent(search)}` : '';
        const response = await fetch(`${API_URL}/files?${searchParam}&skip=${skip}&limit=${limit}`, {
            headers: {
            Authorization: `Bearer ${token}`
            }
        });
        if(response.ok)
        {
            const results = await response.json();
            return results;
        }
        throw new Error("Failed to fetch folders");
    } catch (error) {
        throw error;
    }
}

export async function downloadFiles(files: File[]){
    try {
    
        // Multiple files download with correct endpoint
        const formData = new FormData();
        files.forEach((file) => {
            formData.append("file_ids", file.id.toString());
        });
        
        const response = await fetch(`${API_URL}/files/download/`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Download failed');
        }
        
        const blob = await response.blob();
        return { blob, filename: "downloads.zip" };
        
    }
    catch(error) {
        throw error;
    }
}

export async function viewFile(file: File) {
    try {
        // Updated to use the correct view endpoint
        const response = await fetch(`${API_URL}/files/view/${file.id}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to view file');
        }
        
        // For PDFs, this will return with inline disposition
        // For other files, it will download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        return url;
    } catch (error) {
        throw error;
    }
}

export async function deleteFiles(files: File[]){
    try {
        const formData = new FormData();
        files.forEach((file) => {
          formData.append("file_ids", file.id.toString());
        });
  
        const response = await fetch(`${API_URL}/files/delete/`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`
            },
          body: formData
        });
  
        if (!response.ok) {
          throw new Error('Delete failed');
        }
  
        return true;
    }
    catch(error) {
        throw error;
    }
}


export async function updateParentFolder(fileIds: string[], folder_id: number){
    try{
        const formData = new FormData();
        fileIds.forEach((fileId)=>{
            formData.append("file_ids", fileId);
        });
        formData.append("folder_id", folder_id.toString());
        const response = await fetch(`${API_URL}/files/update-parent/`, {
            method:'POST',
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: formData
        });
        if(!response.ok){
            throw new Error('Update failed');
        }
        const result = await response.json();
        return result;
    }
    catch(error) {
        throw error;
    }
}


export async function updateFileName(fileId: number, name: string){
    try{
        const formData = new FormData();
        formData.append("file_id", fileId.toString());
        formData.append("name", name);
        const response = await fetch(`${API_URL}/files/update-name/`, {
            method:'POST',
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: formData
        });
        if(!response.ok){
            throw new Error('Update failed');
        }
        const result = await response.json();
        return result;
    }
    catch(error) {
        throw error;
    }
}
