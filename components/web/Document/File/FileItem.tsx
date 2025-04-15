import { getFileIcon } from "@/lib/contants";
import { File } from "@/lib/types";
import { getFileSize } from "@/lib/utils";
import { CloudDownload, Eye, PenBox, Trash2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TableCell, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useChatStore } from "@/lib/store/chat-store";
import { ClientPermissionGuard } from "@/components/hoc/withPermission";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { updateFileName } from "@/lib/api/file";
import { toast } from "@/hooks/use-toast";

interface FileItemProps {
  file: File;
  allFiles: File[];
  onDelete: (files: File[]) => void;
  onDownload: (files: File[]) => void;
  onView: (file: File) => void;
}

export default function FileItem({
  file,
  allFiles,
  onDelete,
  onDownload,
  onView,
}: FileItemProps) {
  // Use the enhanced chat store
  const selectedFiles = useChatStore((state) => state.files);
  const toggleFile = useChatStore((state) => state.toggleFile);
  const isSelected = useChatStore((state) => state.isSelected(file.id));
  const setFiles = useChatStore((state) => state.setFiles);
  const addFiles = useChatStore((state) => state.addFiles);

  const [editNameFile, setEditNameFile] = useState({
    open: false,
    file: file,
  });

  // Toggle selection with multi-select support
  const toggleSelection = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // If holding Ctrl/Cmd key, toggle this file while keeping other selections
    if (e.ctrlKey || e.metaKey) {
      toggleFile(file);
    }
    // If holding Shift key, select range
    else if (e.shiftKey && selectedFiles.length > 0) {
      // Find the index of the last selected file and this file
      const fileIds = allFiles.map((f) => f.id);
      const lastSelectedIndex = fileIds.findIndex(
        (id) => id === selectedFiles[selectedFiles.length - 1].id
      );
      const currentIndex = fileIds.findIndex((id) => id === file.id);

      // Get the range of files
      const start = Math.min(lastSelectedIndex, currentIndex);
      const end = Math.max(lastSelectedIndex, currentIndex);
      const rangeToAdd = allFiles.slice(start, end + 1);

      // Add range to selection (store will handle duplicates)
      addFiles(rangeToAdd);
    }
    // Normal click - just select this file
    else {
      setFiles([file]);
    }
  };

  const handleCheckboxChange = (checked: boolean) => {
    if (checked && !isSelected) {
      toggleFile(file);
    } else if (!checked && isSelected) {
      toggleFile(file);
    }
  };
  const renderEditNameFileButton = () => {
    return (
      <ClientPermissionGuard permission="edit_files">
        <div
          className="flex items-center justify-center bg-gray-100 rounded-xl w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 transition-all duration-200 hover:bg-green-100 hover:shadow-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <TooltipProvider delayDuration={200} skipDelayDuration={200}>
            <Tooltip>
              <TooltipTrigger
                onClick={(e) => {
                  e.stopPropagation();
                  setEditNameFile((prev) => ({
                    ...prev,
                    open: true,
                    file: file,
                  }));
                }}
              >
                <PenBox
                  size={14}
                  className="text-black hover:text-green-600 sm:size-[16px] md:size-[18px]"
                />
              </TooltipTrigger>
              <TooltipContent className="mb-2 bg-white border border-green-400 text-green-600 font-medium">
                <p>Đổi tên</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </ClientPermissionGuard>
    );
  };
  const renderViewButton = () => {
    // Only render the view button for PDF files
    if (!file.filepath || !file.filepath.toLowerCase().endsWith(".pdf")) {
      return null;
    }

    return (
      <ClientPermissionGuard permission="edit_files">
        <div
          className="flex items-center justify-center bg-gray-100 rounded-xl w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 transition-all duration-200 hover:bg-green-100 hover:shadow-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <TooltipProvider delayDuration={200} skipDelayDuration={200}>
            <Tooltip>
              <TooltipTrigger
                onClick={(e) => {
                  e.stopPropagation();
                  onView(file);
                }}
              >
                <Eye
                  size={14}
                  className="text-black hover:text-green-600 sm:size-[16px] md:size-[18px]"
                />
              </TooltipTrigger>
              <TooltipContent className="mb-2 bg-white border border-green-400 text-green-600 font-medium">
                <p>Xem file</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </ClientPermissionGuard>
    );
  };

  const renderDownloadButton = () => {
    return (
      <ClientPermissionGuard permission="edit_files">
        <div
          className="flex items-center justify-center bg-gray-100 rounded-xl w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 transition-all duration-200 hover:bg-sky-100 hover:shadow-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <TooltipProvider delayDuration={200} skipDelayDuration={200}>
            <Tooltip>
              <TooltipTrigger
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload([file]);
                }}
              >
                <CloudDownload
                  size={14}
                  className="text-black hover:text-sky-600 sm:size-[16px] md:size-[18px]"
                />
              </TooltipTrigger>
              <TooltipContent className="mb-2 bg-white border border-sky-400 text-sky-600 font-medium">
                <p>Tải file</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </ClientPermissionGuard>
    );
  };

  const renderDeleteButton = () => {
    return (
      <ClientPermissionGuard permission="delete_files">
        <div
          className="flex items-center justify-center bg-gray-100 rounded-xl w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 transition-all duration-200 hover:bg-red-100 hover:shadow-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <TooltipProvider delayDuration={200} skipDelayDuration={200}>
            <Tooltip>
              <TooltipTrigger
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete([file]);
                }}
              >
                <Trash2
                  size={14}
                  color="#ea580c"
                  className="sm:size-[16px] md:size-[18px]"
                />
              </TooltipTrigger>
              <TooltipContent className="text-red-500 font-medium mb-2 bg-white border border-red-400">
                <p>Xoá file</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </ClientPermissionGuard>
    );
  };

  return (
    <ClientPermissionGuard
      resourcePermission={{
        resuorceType: "files",
        resourceId: file.id,
        permissionType: "can_read",
      }}
    >
      <TableRow
        key={file.id}
        onClick={toggleSelection}
        className={`cursor-pointer transition-all duration-200 hover:bg-sky-100/80 hover:shadow-sm ${
          isSelected ? "bg-sky-100 shadow-sm" : ""
        }`}
      >
        <TableCell className="w-12 p-0 sm:p-2">
          <div className="flex justify-center items-center">
            <Checkbox
              checked={isSelected}
              onCheckedChange={handleCheckboxChange}
              onClick={(e) => e.stopPropagation()}
              className="data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500"
            />
          </div>
        </TableCell>
        <TableCell className="w-16 sm:w-20 p-2 sm:p-4">
          <div className="flex items-center justify-center">
            {getFileIcon(file.filepath!)}
          </div>
        </TableCell>
        <TableCell className="font-medium w-1/3 p-2 truncate">
          {editNameFile.open && editNameFile.file.id === file.id ? (
            <Input
              className="w-full"
              value={editNameFile.file.name}
              onChange={(e) => {
                setEditNameFile({
                  ...editNameFile,
                  file: {
                    ...editNameFile.file,
                    name: e.target.value,
                  },
                });
                file.name = e.target.value;
              }}
              onKeyDown={async (e) => {
                if (e.key === "Enter") {
                  await updateFileName(Number(file.id), editNameFile.file.name);
                  setEditNameFile({
                    open: false,
                    file: {
                      ...file,
                      name: editNameFile.file.name,
                    },
                  });
                  file.name =  editNameFile.file.name;

                  toast({
                    title: "Thành công",
                    description: "Đã đổi tên file thành công",
                    variant: "default",
                  })
                }
              }}
              onBlur={() => {
                setEditNameFile({
                  open: false,
                  file: file,
                });
              }}
              placeholder={file.name}
              autoFocus
            />
          ) : (
            <span className="line-clamp-1 transition-all duration-200 hover:text-sky-600">
              {file.name}
            </span>
          )}
        </TableCell>
        <TableCell className="text-center p-2 whitespace-nowrap text-xs sm:text-sm text-gray-600">
          {getFileSize(file.file_size)}
        </TableCell>
        <TableCell className="p-2 hidden sm:table-cell text-xs sm:text-sm text-gray-600">
          {file.created_at.toString()}
        </TableCell>
        <TableCell className="p-2">
          <div className="flex flex-row space-x-1 sm:space-x-2 items-center justify-end">
            {renderViewButton()}
            {renderDownloadButton()}
            {renderEditNameFileButton()}
            {renderDeleteButton()}
          </div>
        </TableCell>
      </TableRow>
    </ClientPermissionGuard>
  );
}
