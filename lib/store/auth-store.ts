import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';
import { usePermissionStore } from './permission-store';

interface AuthStore {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    login: (username: string, password: string) => Promise<{ error?: string }>;
    logout: () => void;
    fetchUserInfo: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            login: async (username, password) => {
                const api_url = process.env.NEXT_PUBLIC_API_URL!;
                try {
                    const formData = new FormData();
                    formData.append('username', username);
                    formData.append('password', password);
                    const response = await fetch(`${api_url}/auth/login/`, {
                        method: 'POST',
                        body: formData
                    });
                    
                    if (!response.ok) {
                        return { error: 'Lỗi đăng nhập' }
                    }

                    const data = await response.json();
                    if (data.token) {
                        const expires = new Date(Date.now() + 30 * 60 * 1000).toUTCString()
                        document.cookie = `auth-storage=${data.token}; path=/; expires=${expires}`
                    }
                   
                    set({ user: data.user, token: data.token, isAuthenticated: true });
                    
                    // Khởi tạo permission sau khi đăng nhập thành công
                    if (data.user && data.user.role_id) {
                        await usePermissionStore.getState().initPermissions(data.user.role_id);
                    }
                    
                    return {};
                } catch (error) {
                    return { error: String(error) };
                }
            },
            logout: () => {
                document.cookie = 'auth-storage=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
                set({ user: null, token: null, isAuthenticated: false });
                
                // Reset permission store
                usePermissionStore.getState().resetPermissions();
            },
            fetchUserInfo: async () => {
                try {
                    // Lấy token từ state hoặc từ cookie nếu cần
                    const token = get().token;
                    if (!token) return;
                    
                    const api_url = process.env.NEXT_PUBLIC_API_URL!;
                    const response = await fetch(`${api_url}/auth/me/`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    
                    if (!response.ok) {
                        // Token không hợp lệ, đăng xuất
                        get().logout();
                        return;
                    }
                    
                    const data = await response.json();
                    set({ user: data.user, isAuthenticated: true });
                    
                    // Khởi tạo permission sau khi lấy thông tin người dùng
                    if (data.user && data.user.role_id) {
                        await usePermissionStore.getState().initPermissions(data.user.role_id);
                    }
                } catch (error) {
                    console.error("Lỗi khi lấy thông tin người dùng:", error);
                }
            }
        }),
        {
            name: 'auth-storage',
            // Thêm hàm onRehydrateStorage để khôi phục thông tin user sau khi đọc từ storage
            onRehydrateStorage: () => {
                return (state, error) => {
                    if (error) {
                        console.log('Error rehydrating auth store:', error);
                        return;
                    }
                    
                    // Nếu có token nhưng không có user, gọi API để lấy thông tin user
                    if (state?.token && !state.user) {
                        state.fetchUserInfo();
                    }
                };
            }
        }
    )
)

// Kiểm tra và lấy thông tin người dùng sau khi client load
if (typeof window !== 'undefined') {
    const state = useAuthStore.getState();
    if (state.token && !state.user) {
        state.fetchUserInfo();
    }
}