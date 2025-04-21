import { File } from "../types/index";
import { create } from "zustand";

interface ChatStore {
    files: File[];
    setNullFiles: () => void;
    setFiles: (files: File[]) => void;
    deleteFile: (id: string) => void;
    
    // New methods for multi-file operations
    addFile: (file: File) => void;
    addFiles: (newFiles: File[]) => void;
    removeFile: (id: string) => void;
    toggleFile: (file: File) => void;
    isSelected: (id: string) => boolean;
    selectAll: (files: File[]) => void;
    clearSelection: () => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
    files: [] as File[],
    setNullFiles: () => set({ files: [] }),
    setFiles: (files) => set({ files }),
    deleteFile: (id) => set(
        (state) => ({ 
            files: state.files.filter((file) => file.id !== id) 
        })
    ),
    
    // Implementation of new methods
    addFile: (file) => set((state) => {
        // Don't add if already exists
        if (state.files.some(f => f.id === file.id)) {
            return state;
        }
        return { files: [...state.files, file] };
    }),
    
    addFiles: (newFiles) => set((state) => {
        // Filter out files that already exist in the store
        const uniqueNewFiles = newFiles.filter(
            newFile => !state.files.some(existingFile => existingFile.id === newFile.id)
        );
        
        return { files: [...state.files, ...uniqueNewFiles] };
    }),
    
    removeFile: (id) => set((state) => ({
        files: state.files.filter(file => file.id !== id)
    })),
    
    toggleFile: (file) => set((state) => {
        const isAlreadySelected = state.files.some(f => f.id === file.id);
        
        if (isAlreadySelected) {
            // Remove from selection
            return { files: state.files.filter(f => f.id !== file.id) };
        } else {
            // Add to selection
            return { files: [...state.files, file] };
        }
    }),
    
    isSelected: (id) => {
        // Convert ID to string for consistent comparison
        const stringId = String(id);
        return get().files.some(file => String(file.id) === stringId);
    },
    
    selectAll: (files) => set({ files }),
    
    clearSelection: () => set({ files: [] }),
}));



