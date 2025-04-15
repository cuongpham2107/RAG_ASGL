import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
} from "@/components/ui/select";
import Image from "next/image";
import { Folder } from "@/lib/types";
import { useEffect, useState } from "react";
import { getTreeFolder } from "@/lib/api/folder";
import { toast } from "@/hooks/use-toast";
import { useChatStore } from "@/lib/store/chat-store";
import { updateParentFolder } from "@/lib/api/file";

// Recursive component to render folder tree items
const FolderTreeItem = ({ folder, level = 0 }: { folder: Folder; level?: number }) => {
  const indent = Array(level).fill("\u00A0\u00A0\u00A0").join("");

  return (
    <>
      <SelectItem value={folder.id} className="truncate">
        {indent}
        {level > 0 ? "└─ " : ""}
        {folder.name}
      </SelectItem>
      {folder.children.map((childFolder) => (
        <FolderTreeItem key={childFolder.id} folder={childFolder} level={level + 1} />
      ))}
    </>
  );
};

interface MoveFileDialogProps {
  refreshData: () => void;
}
export default function MoveFileDialog({ refreshData }: MoveFileDialogProps) {
  const selectedFiles = useChatStore((state) => state.files);
  
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");

  const fetchFolders = async () => {
    await getTreeFolder()
      .then((res) => {
        setFolders(res);
      })
      .catch((err) => {
        toast({
          title: "Lỗi",
          description: err.message,
          variant: "destructive",
        });
      });
  };
  const handleMoveFile = async () => {
    const folderId = selectedFolderId;
    if (!folderId) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn một folder",
        variant: "destructive",
      });
      return;
    }
    const fileIds = selectedFiles;

    if (fileIds.length === 0) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn một file",
        variant: "destructive",
      });
      return;
    }

    await updateParentFolder(fileIds.map((file) => file.id), Number(folderId))
    .then(() => {
      toast({
        title: "Thành công",
        description: "Đã chuyển file thành công",
      });
      refreshData()
    })
    .catch((err) => {
      toast({
        title: "Lỗi",
        description: err.message,
        variant: "destructive",
      });
    });
  }
  useEffect(() => {
    fetchFolders();
  }, []);

  return (
    <AlertDialog>
      <AlertDialogTrigger className="flex items-center justify-center h-8 w-8 bg-gray-100 rounded-xl">
        <Image src={"/images/move-file.png"} alt="move-file" width="20" height="20" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Chọn Folder để chuyển tài liệu</AlertDialogTitle>
          <AlertDialogDescription>
            Hãy chọn một thư mục để chuyển tài liệu đã chọn vào đó.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Select onValueChange={setSelectedFolderId} value={selectedFolderId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Chọn thư mục" />
          </SelectTrigger>
          <SelectContent className="w-full max-h-[300px]">
            <SelectGroup>
              <SelectLabel>Chọn Folder</SelectLabel>
              {folders.map((folder) => (
                <FolderTreeItem 
                key={folder.id} 
                folder={folder}

                 />
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <AlertDialogFooter>
          <AlertDialogCancel>Đóng</AlertDialogCancel>
          <AlertDialogAction onClick={() => handleMoveFile()}>Chuyển</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
