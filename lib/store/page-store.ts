import { create } from "zustand";
import { Folder, Menu } from "../types";
import { getChildFolders } from "../api/folder";

interface MenuStore {
    menu: Menu[];
    loadMenuFromApi: () => Promise<void>;
    isLoading: boolean;
    refreshMenu: () => Promise<void>;  // Add a dedicated refresh function
}

export const usePageStore = create<MenuStore>((set, get) => ({
    menu: [],
    isLoading: false,
    
    loadMenuFromApi: async () => {
        // Use get() to access current state instead of calling usePageStore again
        const { isLoading, menu } = get();
        
        // Check if already loading to prevent duplicate calls
        if (isLoading) {
            return;
        }
        
        // Skip API call if menu already has data
        if (menu.length > 0) {
            return;
        }
        
        set({ isLoading: true });
        try {
            const data = await getChildFolders("0") as Folder[];
            
            set({
                menu: data.map((item) => ({
                    id: parseInt(item.id),
                    title: item.name,
                    slug: item.slug,
                    url: item.slug,
                })) || [],
                isLoading: false
            });
        } catch (error) {
            console.error("Failed to load menu data:", error);
            set({ isLoading: false });
        }
    },
    
    // Add a new method to explicitly refresh the menu data
    refreshMenu: async () => {
        set({ isLoading: true });
        try {
            const data = await getChildFolders("0") as Folder[];
            
            set({
                menu: data.map((item) => ({
                    id: parseInt(item.id),
                    title: item.name,
                    slug: item.slug,
                    url: item.slug,
                })) || [],
                isLoading: false
            });
        } catch (error) {
            console.error("Failed to refresh menu data:", error);
            set({ isLoading: false });
        }
    }
}));
