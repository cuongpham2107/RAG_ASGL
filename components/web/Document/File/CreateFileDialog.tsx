"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Upload, X, File, Loader2, Edit } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/store/auth-store";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { formatFileSize } from "@/lib/utils";
import { getFileIcon } from "@/lib/contants";
import { ClientPermissionGuard } from "@/components/hoc/withPermission";
import { usePermissionStore } from "@/lib/store/permission-store";

interface EditableFile {
  name: string;
  size: number;
  type: string;
  editingName: boolean;
  lastModified: number;
  originalFile: File;
}

interface CreateFileDialogProps {
  parentId: string;
  fetchFilesAction: () => void;
}

export function CreateFileDialog({
  parentId,
  fetchFilesAction,
}: CreateFileDialogProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<EditableFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const url_api = process.env.NEXT_PUBLIC_API_URL!;
  const token = useAuthStore((state) => state.token);

  const handleDragEnter = useCallback(
    (e: { preventDefault: () => void; stopPropagation: () => void }) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    },
    []
  );

  const handleDragLeave = useCallback(
    (e: { preventDefault: () => void; stopPropagation: () => void }) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    },
    []
  );

  const handleDragOver = useCallback(
    (e: { preventDefault: () => void; stopPropagation: () => void }) => {
      e.preventDefault();
      e.stopPropagation();
    },
    []
  );

  const handleDrop = useCallback(
    (e: {
      preventDefault: () => void;
      stopPropagation: () => void;
      dataTransfer: { files: Iterable<unknown> | ArrayLike<unknown> };
    }) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const droppedFiles = Array.from(e.dataTransfer.files as FileList).map(
        (file) => {
          return {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified,
            editingName: false,
            originalFile: file,
          } as EditableFile;
        }
      );
      setFiles((prevFiles) => [...prevFiles, ...droppedFiles]);
    },
    []
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []).map((file) => {
        return {
          originalFile: file,
          name: file.name.lastIndexOf(".") > 0 
            ? file.name.substring(0, file.name.lastIndexOf(".")) 
            : file.name, // Remove only the last extension
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
          editingName: false,
        } as EditableFile;
      });
      setFiles((prevFiles) => [...prevFiles, ...selectedFiles]);
    },
    []
  );

  const removeFile = useCallback((index: number) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  }, []);

  const toggleEditFileName = useCallback((index: number) => {
    setFiles((prevFiles) =>
      prevFiles.map((file, i) =>
        i === index ? { ...file, editingName: !file.editingName } : file
      )
    );
  }, []);

  const handleFileNameChange = useCallback((index: number, newName: string) => {
    setFiles((prevFiles) =>
      prevFiles.map((file, i) =>
        i === index
          ? {
              ...file,
              name: newName,
              editingName: false,
            }
          : file
      )
    );
  }, []);

  const handleUpload = useCallback(async () => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("folder_id", parentId || "0");

      files.forEach((editableFile) => {
        // Sử dụng tệp gốc để đảm bảo loại chính xác
        formData.append("files", editableFile.originalFile, editableFile.originalFile.name);
        formData.append("names", editableFile.name);  
      });
      files.map((file) => {
        console.log(file);
      });
      const res = await fetch(`${url_api}/files/store`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        fetchFilesAction();
        setIsUploading(false);
        setOpenDialog(false);
        await usePermissionStore.getState().refreshPermissions();
        setFiles([]);
        toast({
          title: "Thành công",
          description: "Tải file lên thành công",
        });
      } else {
        setIsUploading(false);
        toast({
          title: "Lỗi",
          description: (await res.json()).detail ?? "Đã xảy ra lỗi",
        });
      }
    } catch (error) {
      setIsUploading(false);
      toast({
        title: "Lỗi",
        description: error instanceof Error ? error.message : "Đã xảy ra lỗi",
      });
    }
  }, [files, token, url_api, fetchFilesAction, parentId]);

  return (
    <ClientPermissionGuard permission="edit_files">
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="gap-1 h-7 sm:h-8 hover:bg-sky-50 hover:text-sky-600 hover:border-sky-200 px-2 sm:px-3 text-xs sm:text-sm inset-shadow-sm"
          >
            <Upload className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Tải tệp</span>
            <span className="inline xs:hidden">Tải</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-[90vw] sm:max-w-[550px] md:max-w-[650px] gap-1">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl md:text-2xl font-bold flex items-center gap-1 sm:gap-2">
              <Upload className="w-4 h-4 sm:w-6 sm:h-6 text-sky-500" />
              Tải file lên
            </DialogTitle>
          </DialogHeader>
          <Card className="border-none shadow-none">
            <CardHeader className="px-0">
              <p className="text-xs sm:text-sm text-gray-500">
                Tải lên file của bạn bằng cách kéo thả hoặc chọn từ máy tính
              </p>
            </CardHeader>
            <CardContent className="px-0">
              <div
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                relative overflow-hidden
                border-2 border-dashed rounded-xl
                flex flex-col items-center justify-center
                min-h-[150px] sm:min-h-[200px] md:min-h-64 p-4 sm:p-6 md:p-8
                transition-all duration-300 ease-in-out
                ${
                  isDragging
                    ? "border-sky-500 bg-sky-50 scale-[0.99]"
                    : "border-gray-200 hover:border-sky-400 hover:bg-sky-50"
                }
              `}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-white/50 to-transparent pointer-events-none" />
                <Upload
                  className={`w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 mb-3 sm:mb-4 md:mb-6 transition-all duration-300 ${
                    isDragging ? "text-sky-500 scale-110" : "text-gray-400"
                  }`}
                />
                <div className="space-y-1 sm:space-y-2 text-center">
                  <p className="text-xs sm:text-sm text-gray-600">
                    Kéo và thả tập tin của bạn vào đây
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500">hoặc</p>
                  <label className="inline-flex items-center justify-center px-3 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm font-medium text-white bg-sky-500 rounded-lg cursor-pointer hover:bg-sky-600 transition-colors">
                    Chọn tập tin
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileInput}
                      multiple
                    />
                  </label>
                </div>
              </div>
            </CardContent>
            {files.length > 0 && (
              <CardFooter className="flex flex-col items-start px-0">
                <div className="w-full space-y-2 sm:space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs sm:text-sm font-medium">
                      Tập tin đã chọn
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500">
                      {files.length} tập tin
                    </p>
                  </div>
                  <ul className="space-y-1 sm:space-y-2 w-full">
                    {files.map((file, index) => (
                      <li
                        key={index}
                        className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-2 sm:gap-3 w-full">
                          <div>{getFileIcon(file.name)}</div>
                          <div className="flex flex-1 items-center gap-2 w-full">
                            {file.editingName ? (
                              <Input
                                defaultValue={file.name}
                                onBlur={(e) =>
                                  handleFileNameChange(index, e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handleFileNameChange(
                                      index,
                                      (e.target as HTMLInputElement).value
                                    );
                                  }
                                  if (e.key === "Escape") {
                                    toggleEditFileName(index);
                                  }
                                }}
                                autoFocus
                                className="h-8 text-xs sm:text-sm"
                              />
                            ) : (
                              <>
                                <div>
                                  <div className="flex flex-row items-center gap-2 w-full">
                                    <p
                                      className="text-sm font-medium text-gray-700 cursor-text"
                                      onClick={() => toggleEditFileName(index)}
                                    >
                                      {file.name}
                                    </p>
                                    <Edit
                                      className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 cursor-pointer hover:text-gray-600"
                                      onClick={() => toggleEditFileName(index)}
                                    />
                                  </div>
                                    <p
                                      className="text-[0.6rem] font-medium text-gray-700 cursor-text"
                                      onClick={() => toggleEditFileName(index)}
                                    >
                                      {file.originalFile.name}
                                    </p>
                                </div>
                              </>
                            )}
                          </div>
                          <p className="text-[10px] sm:text-xs text-gray-500 ml-2">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                        <button
                          onClick={() => removeFile(index)}
                          className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                        >
                          <X className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="flex justify-end pt-2 sm:pt-4">
                    <Button
                      onClick={handleUpload}
                      className="bg-sky-500 hover:bg-sky-600 text-white text-xs sm:text-sm py-1 sm:py-2"
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                          <span className="ml-1 sm:ml-2">Đang tải lên...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="ml-1 sm:ml-2">Tải lên</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardFooter>
            )}
          </Card>
        </DialogContent>
      </Dialog>
    </ClientPermissionGuard>
  );
}