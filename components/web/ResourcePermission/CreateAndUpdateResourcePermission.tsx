import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  FormDataUpdateResourcePermission,
  ResourcePermissions,
} from "@/lib/types";
import { useCallback, useEffect, useState } from "react";
import {
  addAndUpdateResourcePermission,
  getFolderAndFileInPermissions,
} from "@/lib/api/role-permission";

interface Props {
  isAddEidt: "add" | "edit";
  resourcePermission?: ResourcePermissions;
  icon?: React.ReactNode;
  title_button?: string;
  title_dialog: string;
  description: string;
  formData: FormDataUpdateResourcePermission;
  id: number;
  setFormData: (data: FormDataUpdateResourcePermission) => void;
  actionSetRefreshTableKey: (key: number) => void;
}
export default function CreateAndUpdateResourcePermission({
  isAddEidt,
  resourcePermission,
  icon,
  title_button,
  title_dialog,
  description,
  formData,
  id,
  setFormData,
  actionSetRefreshTableKey,
}: Props) {
  const [open, setOpen] = useState(false);
  const [optionsBelongtoFileAndFolder, setOptionsBelongtoFileAndFolder] =
    useState<{ value: string; label: string }[]>([]);
  const [
    openOptionsBelongtoFileAndFolder,
    setOpenOptionsBelongtoFileAndFolder,
  ] = useState(false);
  const [
    searchOptionsBelongtoFileAndFolder,
    setSearchOptionsBelongtoFileAndFolder,
  ] = useState("");
  const filteredOptionsBelongtoFileAndFolder =
    optionsBelongtoFileAndFolder.filter((option) =>
      option.label
        .toLowerCase()
        .includes(searchOptionsBelongtoFileAndFolder.toLowerCase())
    );
  const fetchFolderAndFilePermissions = useCallback(async () => {
    setOptionsBelongtoFileAndFolder([]);
    if (!formData.resource_permissions.resource_type) return;
    try {
      const data = await getFolderAndFileInPermissions(formData.resource_permissions.resource_type);
      
      if (Array.isArray(data) && data.length > 0) {
          const folders = data.slice(1);// Lấy phần tử đầu tiên
          if (Array.isArray(folders)) { // Đảm bảo folders là một mảng
              const options = folders.map((item: { id: string; name: string }) => ({
                  value: item.id,
                  label: item.name,
              }));
              setOptionsBelongtoFileAndFolder(options);
          } else {
              setOptionsBelongtoFileAndFolder([]);
          }
      } else {
          setOptionsBelongtoFileAndFolder([]);
      }
  } catch (error) {
      setOptionsBelongtoFileAndFolder([]);
      toast({
          title: "Lỗi",
          description: error instanceof Error ? error.message : "Đã có lỗi xảy ra",
      });
  }
  
}, [formData.resource_permissions.resource_type]);

  const hanldedAddResourcePermission = async (
    formData: FormDataUpdateResourcePermission,
    id: number
  ) => {
    addAndUpdateResourcePermission(
      id,
      formData.resource_permissions.resource_type,
      formData.resource_permissions.resource_id.toString(),
      formData.resource_permissions.can_read,
      formData.resource_permissions.can_write,
      formData.resource_permissions.can_delete
    )
      .then(() => {
        toast({
          title: "Thành công",
          description: "Thêm quyền truy cập tài nguyên thành công",
        });
        actionSetRefreshTableKey(id + 1);
      })
      .catch((err) => {
        toast({
          title: "Lỗi",
          description: err instanceof Error ? err.message : "Đã có lỗi xảy ra",
        });
      });
  };
  const handleResourcePermissionChange = (
    field: keyof ResourcePermissions,
    value: string | boolean
  ) => {
    setFormData({
      ...formData,
      resource_permissions: {
        ...formData.resource_permissions,
        [field]: value,
      },
    });
  };
  useEffect(() => {
    fetchFolderAndFilePermissions();
  }, [fetchFolderAndFilePermissions]);
  useEffect(() => {
    if (open && isAddEidt === "edit" && resourcePermission) {
      setFormData({
        ...formData,
        resource_permissions: {
          ...formData.resource_permissions,
          resource_type: resourcePermission.resource_type,
          resource_id: resourcePermission.resource_id,
          can_read: resourcePermission.can_read,
          can_write: resourcePermission.can_write,
          can_delete: resourcePermission.can_delete,
        },
      });
    }

    if (open && isAddEidt === "add") {
      setFormData({
        ...formData,
        resource_permissions: {
          ...formData.resource_permissions,
          resource_type: "files",
          resource_id: 0,
          can_read: false,
          can_write: false,
          can_delete: false,
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]); // Chỉ theo dõi khi dialog mở
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          {icon}
          {title_button}
        </Button>
      </DialogTrigger>
      <DialogContent className="min-w-[400px]">
        <DialogHeader>
          <DialogTitle>{title_dialog}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="border border-gray-200 rounded-md p-4 mt-6">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Loại quyền truy cập:{" "}
              </label>
              <Select
                value={formData.resource_permissions.resource_type}
                onValueChange={(value) => {
                  handleResourcePermissionChange("resource_type", value);
                  fetchFolderAndFilePermissions();
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select resource type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="files">File</SelectItem>
                  <SelectItem value="folders">Folder</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col space-y-3">
              <label className="text-sm font-medium">Thuộc: </label>
              <Popover
                open={openOptionsBelongtoFileAndFolder}
                onOpenChange={setOpenOptionsBelongtoFileAndFolder}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openOptionsBelongtoFileAndFolder}
                    className="w-full justify-between"
                  >
                    {formData.resource_permissions.resource_id
                      ? filteredOptionsBelongtoFileAndFolder.find(
                          (option) =>
                            option.value ===
                            formData.resource_permissions.resource_id
                        )?.label
                      : `Chọn ${formData.resource_permissions.resource_type}...`}
                    <ChevronsUpDown className="opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="p-0 min-w-[var(--radix-popover-trigger-width)]">
                  <Command>
                    <CommandInput
                      value={searchOptionsBelongtoFileAndFolder}
                      onValueChange={setSearchOptionsBelongtoFileAndFolder}
                      placeholder={`Tìm kiếm theo tên ${formData.resource_permissions.resource_type} ...`}
                    />
                    <CommandList>
                      <CommandEmpty>
                        Không tìm thấy{" "}
                        {formData.resource_permissions.resource_type}.
                      </CommandEmpty>
                      <CommandGroup>
                        {filteredOptionsBelongtoFileAndFolder.map((option) => (
                          <CommandItem
                            key={option.value}
                            value={option.value}
                            onSelect={() => {
                              handleResourcePermissionChange(
                                "resource_id",
                                option.value
                              );
                              setOpenOptionsBelongtoFileAndFolder(false);
                            }}
                          >
                            {option.label}
                            <Check
                              className={cn(
                                "ml-auto",
                                formData.resource_permissions.resource_id ===
                                  option.value
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              
            </div>
          </div>

          <div className="flex flex-col gap-4 mt-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Quyền hạn:</label>
            </div>
            <div className="flex space-x-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="can_read"
                  checked={formData.resource_permissions.can_read}
                  onCheckedChange={(checked) =>
                    handleResourcePermissionChange("can_read", checked)
                  }
                />
                <label htmlFor="can_read" className="text-sm">
                  Có thể xem
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="can_write"
                  checked={formData.resource_permissions.can_write}
                  onCheckedChange={(checked) =>
                    handleResourcePermissionChange("can_write", checked)
                  }
                />
                <label htmlFor="can_write" className="text-sm">
                  Có thể chỉnh sửa
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="can_delete"
                  checked={formData.resource_permissions.can_delete}
                  onCheckedChange={(checked) =>
                    handleResourcePermissionChange("can_delete", checked)
                  }
                />
                <label htmlFor="can_delete" className="text-sm">
                  Có thể xoá
                </label>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            size="sm"
            onClick={() => hanldedAddResourcePermission(formData, id)}
          >
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
