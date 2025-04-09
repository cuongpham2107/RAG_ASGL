"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2 } from "lucide-react";
import { useAuthStore } from "@/lib/store/auth-store";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ClientPermissionGuard } from "@/components/hoc/withPermission";
import { usePermissionStore } from "@/lib/store/permission-store";

interface CreateFolderDialogProps {
  parentId: string;
  fetchFoldersAction: () => void;
  fetchFilesAction?: () => void;
  className?: string;
}

export function CreateFolderDialog({ 
  parentId, 
  fetchFoldersAction, 
  fetchFilesAction,
  className 
}: CreateFolderDialogProps) {
  const [name, setName] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const url_api = process.env.NEXT_PUBLIC_API_URL;
  const token = useAuthStore((state) => state.token);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({
        title: "Lỗi",
        description: "Tên thư mục không được để trống",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Create a Promise that resolves after 1 second
      const delay = new Promise(resolve => setTimeout(resolve, 1000));
      
      const formData = new FormData();
      formData.append("name", name);
      formData.append("parent_id", parentId || "0");
      
      // Wait for both the API request and the delay
      const [res] = await Promise.all([
        fetch(`${url_api}/folders/store/`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }),
        delay
      ]);
      
      if (res.ok) {
        setName("");
        await usePermissionStore.getState().refreshPermissions();
        setOpenDialog(false);
        
        // Ensure these callback functions are called properly
        if (typeof fetchFoldersAction === 'function') {
          fetchFoldersAction();
        }
        
        if (typeof fetchFilesAction === 'function') {
          fetchFilesAction();
        }
        
        toast({
          title: "Thành công",
          description: "Tạo thư mục thành công",
        });
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to create folder");
      }
    } catch (error) {
      toast({
        title: "Lỗi",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <ClientPermissionGuard permission="edit_folders">
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogTrigger asChild>
          <Button 
            className={cn("h-7 sm:h-8 px-2 sm:px-3 gap-1 texTht-xs sm:text-sm inset-shadow-sm", className)}   
            variant="outline"
          >
            <Plus className="w-4 h-4 sm:w-6 sm:h-6" />
            <span className="inline xs:hidden">Tạo thư mục</span>
            <span className="hidden xs:inline">Thư mục</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-[90vw] sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Tạo mới thư mục</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Nhập thông tin cần thiết để tạo thư mục mới
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <div className="flex flex-col gap-1 sm:gap-2">
              <Label htmlFor="name" className="text-start text-sm sm:text-base">
                Tên thư mục:
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3 text-xs sm:text-sm"
                disabled={isLoading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              className="text-xs sm:text-sm py-1 sm:py-2" 
              onClick={handleCreate} 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang tạo...
                </>
              ) : (
                "Tạo"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ClientPermissionGuard>
  );
}