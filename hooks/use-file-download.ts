import { File } from "@/lib/types";
import { downloadFiles, viewFile } from "@/lib/api/file";
import { toast } from "@/hooks/use-toast";

export const useFileDownload = () => {
  const handleFileDownload = async (files: File[]) => {
    try {
      const { blob, filename } = await downloadFiles(files);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: "Thành công",
        description: "Tải file thành công",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      toast({
        title: "Lỗi",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleFileView = async (file: File) => {
    try {
      // For PDFs, this will open in a new tab
      // For other file types, this will trigger a download
      const url = await viewFile(file);
      window.open(url, '_blank');
      toast({
        title: "Thành công",
        description: "Mở file thành công",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      toast({
        title: "Lỗi",
        description: message,
        variant: "destructive",
      });
    }
  };

  return { handleFileDownload, handleFileView };
};
