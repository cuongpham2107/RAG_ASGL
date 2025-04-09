
import { API_URL, token } from "./base";

export async function getChatHistories() {
    if(!token) return [];
    try {
        const res = await fetch(`${API_URL}/chat-histories/`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (res.ok) {
            const results = await res.json();
            return results.data;
        }
        throw new Error("Failed to get chat histories");
    }
    catch (error) {
        throw error;
    }
}
export async function updateChatHistory(id: number, name: string){
    try {
        const formData = new FormData();
        formData.append("name", name);
        const res = await fetch(`${API_URL}/chat-histories/${id}`, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: formData,
        });
        if (res.ok) {
            return res.json();
        }
        throw new Error("Failed to update chat history");
    } catch (error) {
        throw error;
    }
}

export async function deleteChatHistory(id: number){
    try {
        const res = await fetch(`${API_URL}/chat-histories/${id}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (res.ok) {
            return res.json();
        }
        throw new Error("Failed to delete chat history");
    } catch (error) {
        throw error;
    }
}