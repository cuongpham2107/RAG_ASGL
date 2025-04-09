import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Folder } from "@/lib/types";
import { Trash2 } from "lucide-react";
import Image from "next/image";
import { TableCell, TableRow } from "@/components/ui/table";
import { useRouter, usePathname } from "next/navigation";
import { UpdateFolderDialog } from "./UpdateFolderDialog";
import { ClientPermissionGuard } from "@/components/hoc/withPermission";

interface FolderItemProps {
  folder: Folder;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onUpdate: (id: string, newName: string) => Promise<void>;
  onChangeFolder?: (folder: Folder) => void;
  useLocalNavigation?: boolean;
}

export default function FolderItem({
  folder,
  onDelete,
  onUpdate,
  onChangeFolder,
  useLocalNavigation = false,
}: FolderItemProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Handle navigation with path preservation or local navigation
  const handleNavigation = () => {
    if (useLocalNavigation && onChangeFolder) {
      // Use local navigation if specified and handler is provided
      onChangeFolder(folder);
    } else {
      // Otherwise use router navigation
      if (pathname.startsWith("/document/")) {
        // Extract current path segments
        const currentPath = pathname.split("/").filter(Boolean);
        // Remove 'document' from the path
        currentPath.shift();
        // Add the new folder ID
        router.push(`/document/${[...currentPath, folder.id].join("/")}`);
      } else {
        // If we're not in a document path or at root, just navigate to the folder
        router.push(`/document/${folder.id}`);
      }
    }
  };

  const renderEditButton = (
    folder: Folder,
    onUpdate: (id: string, newName: string) => Promise<void>
  ) => {
    return (
      <ClientPermissionGuard permission="edit_folders" resourcePermission={{ resuorceType: "folders", resourceId: folder.id, permissionType: "can_write"}}>
        <div
          className="flex items-center justify-center bg-gray-100 rounded-xl w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 transition-all duration-200 hover:bg-sky-100 hover:shadow-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <UpdateFolderDialog
            folderId={folder.id}
            folderName={folder.name}
            onUpdate={onUpdate}
          />
        </div>
      </ClientPermissionGuard>
    );
  };

  const renderDeleteButton = (
    folder: Folder,
    onDelete: (id: string, e: React.MouseEvent) => void
  ) => {
    return (
      <ClientPermissionGuard permission="delete_folders" resourcePermission={{ resuorceType: "folders", resourceId: folder.id, permissionType: "can_delete"}}>
        <div
          className="flex items-center justify-center bg-gray-100 rounded-xl w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 transition-all duration-200 hover:bg-red-100 hover:shadow-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <TooltipProvider delayDuration={200} skipDelayDuration={200}>
            <Tooltip>
              <TooltipTrigger onClick={(e) => onDelete(folder.id, e)}>
                <Trash2
                  size={14}
                  color="#ea580c"
                  className="sm:size-[16px] md:size-[18px]"
                />
              </TooltipTrigger>
              <TooltipContent className="text-red-500 font-medium mb-2 bg-white border border-red-400">
                <p>Xoá</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </ClientPermissionGuard>
    );
  };

  return (
   <ClientPermissionGuard resourcePermission={{ resuorceType: "folders", resourceId: folder.id, permissionType: "can_read"}}>
     <TableRow
      className="group cursor-pointer transition-all duration-200 hover:bg-sky-100/80 hover:shadow-sm"
      key={folder.id}
      onClick={handleNavigation}
    >
      <TableCell className="text-center w-12 p-0 sm:p-2">
        {/* Empty cell for alignment with file items */}
      </TableCell>
      <TableCell className="font-medium w-16 sm:w-20 p-2 sm:p-4">
        <div className="flex items-center justify-center relative">
          <Image
            src={"/images/close-folder.png"}
            width={45}
            height={45}
            alt="Folder icon"
            className="w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-[45px] lg:h-[45px] block transition-all duration-300 group-hover:hidden"
          />
          <Image
            src={"/images/open-folder.png"}
            width={45}
            height={45}
            alt="Open folder icon"
            className="w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-[45px] lg:h-[45px] hidden group-hover:block transition-all duration-300"
          />
        </div>
      </TableCell>
      <TableCell className="font-medium w-1/3 p-2 truncate transition-all duration-200 group-hover:text-sky-600 group-hover:font-medium">
        <span className="line-clamp-1">{folder.name}</span>
      </TableCell>
      <TableCell className="text-center p-2 whitespace-nowrap">
        {folder.file_count}
      </TableCell>
      <TableCell className="p-2 hidden sm:table-cell text-xs sm:text-sm text-gray-600">
        {folder.created_at.toString()}
      </TableCell>
      <TableCell className="p-2">
        <div className="flex flex-row space-x-1 sm:space-x-2 items-center justify-end">
          {renderEditButton(folder, onUpdate)}
          {renderDeleteButton(folder, onDelete)}
        </div>
      </TableCell>
    </TableRow>
   </ClientPermissionGuard>
  );
}
