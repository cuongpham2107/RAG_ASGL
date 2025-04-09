import { useState, useCallback, useMemo } from 'react';
import { toast } from "@/hooks/use-toast";
import { File, Folder } from "@/lib/types";
import { deleteFolder, getChildFolders, updateFolder } from "@/lib/api/folder";
import { deleteFiles, getFiles } from "@/lib/api/file";
import { useFileDownload } from "@/hooks/use-file-download";
import { useChatStore } from "@/lib/store/chat-store";

// Generic sort function for both Date and string types
const sortByDate = <T extends { created_at: Date | string }>(
  items: T[]
): T[] => {
  return [...items].sort((a, b) => {
    const dateA =
      a.created_at instanceof Date ? a.created_at : new Date(a.created_at);
    const dateB =
      b.created_at instanceof Date ? b.created_at : new Date(b.created_at);
    return dateB.getTime() - dateA.getTime();
  });
};

interface UseDocumentOptions {
  initialFolderId?: string;
}

export function useDocument(options: UseDocumentOptions = {}) {
  // State
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [search, setSearch] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentFolder, setCurrentFolder] = useState<Folder | null>(null);
  const [folderHistory, setFolderHistory] = useState<Folder[]>([]);

  // Store hooks
  const selectedFiles = useChatStore((state) => state.files);
  const setSelectedFiles = useChatStore((state) => state.setFiles);
  const clearSelection = useChatStore((state) => state.clearSelection);
  const selectAll = useChatStore((state) => state.selectAll);
  const setNullFiles = useChatStore((state) => state.setNullFiles);
  
  const { handleFileDownload } = useFileDownload();

  // Memoized sorted data
  const sortedFolders = useMemo(() => sortByDate<Folder>(folders), [folders]);
  const sortedFiles = useMemo(() => sortByDate<File>(files), [files]);

  // Get the current folder ID
  const getFolderId = useCallback(() => {
    return currentFolder?.id ?? options.initialFolderId ?? "0";
  }, [currentFolder?.id, options.initialFolderId]);

  // Fetch folders
  const fetchFolders = useCallback(async () => {
    setIsLoading(true);
    try {
      const folderId = getFolderId();
      const data = await getChildFolders(folderId, search);
      setFolders(data);
      return data;
    } catch (error) {
      toast({
        title: "Lỗi",
        description:
          error instanceof Error ? error.message : "Không thể tải thư mục",
        variant: "destructive",
      });
      return [];
    } finally {
      // We don't set isLoading to false here if we're expecting to load files too
    }
  }, [getFolderId, search]);

  // Fetch files
  const fetchFiles = useCallback(async () => {
    try {
      const folderId = getFolderId();
      const data = await getFiles(folderId, search);
      setFiles(data);
      return data;
    } catch (error) {
      toast({
        title: "Lỗi",
        description:
          error instanceof Error ? error.message : "Không thể tải tệp",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [getFolderId, search]);

  // Folder navigation
  const handleChangeFolder = useCallback(async (folder: Folder) => {
    setFolderHistory(
      (prev) => [...prev, currentFolder].filter(Boolean) as Folder[]
    );
    setCurrentFolder(folder);
    // Fetch data will be triggered separately
  }, [currentFolder]);

  const handleBackFolder = useCallback(async () => {
    if (folderHistory.length > 0) {
      const previousFolder = folderHistory[folderHistory.length - 1];
      setFolderHistory((prev) => prev.slice(0, -1));
      setCurrentFolder(previousFolder);
      // Fetch data will be triggered separately
    } else {
      setCurrentFolder(null);
      // Fetch data will be triggered separately
    }
  }, [folderHistory]);

  // Folder actions
  const handleDeleteFolder = useCallback(async (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteFolder(folderId);
      setFolders(folders => folders.filter(folder => folder.id !== folderId));
      toast({
        title: "Thành công",
        description: "Xoá thư mục thành công",
      });
    } catch (error) {
      toast({
        title: "Lỗi",
        description:
          error instanceof Error ? error.message : "Không thể xóa thư mục",
        variant: "destructive",
      });
    }
  }, []);

  const handleUpdateFolder = useCallback(async (folderId: string, newName: string) => {
    try {
      await updateFolder(folderId, newName);
      setFolders(folders => 
        folders.map(folder => 
          folder.id === folderId ? { ...folder, name: newName } : folder
        )
      );
      toast({
        title: "Thành công",
        description: "Cập nhật thư mục thành công",
      });
      return Promise.resolve();
    } catch (error) {
      toast({
        title: "Lỗi",
        description:
          error instanceof Error ? error.message : "Không thể cập nhật thư mục",
        variant: "destructive",
      });
      return Promise.reject(error);
    }
  }, []);

  // File actions
  const handleDeleteFiles = useCallback(async (filesToDelete: File[]) => {
    try {
      await deleteFiles(filesToDelete);
      setSelectedFiles([]);
      await fetchFiles();
      toast({
        title: "Thành công",
        description: "Xoá file thành công",
      });
    } catch (error) {
      toast({
        title: "Lỗi",
        description:
          error instanceof Error ? error.message : "Không thể xóa tệp",
        variant: "destructive",
      });
    }
  }, [fetchFiles, setSelectedFiles]);

  // Bulk actions
  const handleSelectAllFiles = useCallback(() => {
    selectAll(files);
  }, [files, selectAll]);

  const handleBulkDownload = useCallback(() => {
    if (selectedFiles.length > 0) {
      handleFileDownload(selectedFiles);
    }
  }, [selectedFiles, handleFileDownload]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedFiles.length > 0) {
      try {
        await deleteFiles(selectedFiles);
        clearSelection();
        await fetchFiles();
        toast({
          title: "Thành công",
          description: `Đã xoá ${selectedFiles.length} file`,
        });
      } catch (error) {
        toast({
          title: "Lỗi",
          description:
            error instanceof Error ? error.message : "Không thể xóa tệp",
          variant: "destructive",
        });
      }
    }
  }, [selectedFiles, clearSelection, fetchFiles]);

  // Function to refresh both folders and files
  const refreshData = useCallback(async () => {
    await fetchFolders();
    await fetchFiles();
  }, [fetchFolders, fetchFiles]);

  return {
    // State
    folders: sortedFolders,
    files: sortedFiles,
    search,
    setSearch,
    isLoading,
    setIsLoading,
    currentFolder,
    folderHistory,
    selectedFiles,
    
    // Actions
    fetchFolders,
    fetchFiles,
    refreshData,
    handleChangeFolder,
    handleBackFolder,
    handleDeleteFolder,
    handleUpdateFolder,
    handleDeleteFiles,
    handleFileDownload,
    handleSelectAllFiles,
    handleBulkDownload,
    handleBulkDelete,
    clearSelection,
    setNullFiles,
  };
}
