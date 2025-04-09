import { User } from "../types";
import { API_URL, token } from "./base";

export async function getUsers(
    search: string,
    skip: number,
    limit: number
): Promise<{ users: User[]; total: number; skip: number; limit: number; search: string }> {
    try{
        const searchParam = search ? `search=${encodeURIComponent(search)}` : '';
        const response = await fetch(`${API_URL}/users?${searchParam}&skip=${skip}&limit=${limit}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (!response.ok) {
            throw new Error('Failed to fetch users');
        }
        const data = await response.json();
        return data.data;
    }
    catch (err) {
        throw new Error(err instanceof Error ? err.message : 'An error occurred');
    }
}

export async function createUser(
    full_name: string,
    email: string,
    phone: string,
    address: string,
    username: string,
    password: string,
    role_id: string
): Promise<User> {
    try {
        const formData = new FormData();
        formData.append('full_name', full_name);
        formData.append('email', email);
        formData.append('phone', phone);
        formData.append('address', address);
        formData.append('username', username);
        formData.append('password', password);
        formData.append('role_id', role_id);
        const response = await fetch(`${API_URL}/users/`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: formData,
        });
        if (!response.ok) {
            throw new Error('Failed to create user');
        }
        const data = await response.json();
        return data.data;
    }
    catch (err) {
        throw new Error(err instanceof Error ? err.message : 'An error occurred');
    }
}


export async function updateUser(
    id: string,
    full_name: string,
    email: string,
    phone: string,
    address: string,
    password: string | null,
    role_id: string
): Promise<void> {
    try {
        const formData = new FormData();
        formData.append('full_name', full_name);
        formData.append('email', email);
        formData.append('phone', phone);
        formData.append('address', address);
        formData.append('password', password || '');
        formData.append('role_id', role_id);
        const response = await fetch(`${API_URL}/users/${id}`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: formData,
        });
        if (!response.ok) {
            throw new Error('Failed to update user');
        }
    } catch (err) {
        throw new Error(err instanceof Error ? err.message : 'An error occurred');
    }

}


export async function deleteUser(id: number): Promise<void> {
    try {
        const response = await fetch(`${API_URL}/users/${id}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (!response.ok) {
            throw new Error('Failed to delete user');
        }
    } catch (err) {
        throw new Error(err instanceof Error ? err.message : 'An error occurred');
    }
}
