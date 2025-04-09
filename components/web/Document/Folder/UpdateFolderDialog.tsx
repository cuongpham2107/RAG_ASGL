"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit } from "lucide-react";

interface UpdateFolderDialogProps {
  titleButton?: string;
  folderId: string;
  folderName?: string;
  onUpdate?: (id: string, newName: string) => void;
}

export function UpdateFolderDialog({ titleButton= "",folderId, folderName = "", onUpdate }: UpdateFolderDialogProps) {
  const [name, setName] = useState(folderName);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sửa event handler để không chặn Escape cho input chữ có dấu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Chỉ ngăn chặn sự kiện đóng dialog khi nhấn Escape và không phải đang focus vào input
      if (open && e.key === "Escape" && document.activeElement !== inputRef.current) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    if (open) {
      window.addEventListener("keydown", handleKeyDown, true);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [open]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(true);
  };

  const handleDialogClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleUpdate = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onUpdate && name.trim()) {
      onUpdate(folderId, name);
      setOpen(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setOpen(false);
    }
  };

  // Cho phép sử dụng dấu cách trong input
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    // Chỉ ngăn chặn sự lan truyền sự kiện, không ngăn chặn hành vi mặc định
    e.stopPropagation();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild onClick={handleClick}>
      <div className="flex flex-row items-center gap-2">
        <Edit size={16} className="text-black hover:text-sky-600 cursor-pointer sm:size-[20px]" />
        {titleButton}
      </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]" onClick={handleDialogClick}>
        <DialogHeader>
          <DialogTitle>Cập nhật thư mục</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2 py-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name" className="text-start">
              Tên thư mục:
            </Label>
            <Input
              id="name"
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={handleInputKeyDown}
              autoFocus
            />
          </div>
        </div>
        <Button onClick={handleUpdate}>Cập nhật</Button>
      </DialogContent>
    </Dialog>
  );
}
