"use client";

import { useForm } from "react-hook-form";
import * as z from "zod";
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
import { Button } from "@/components/ui/button";
import { Role, User } from "@/lib/types";
import { ReactNode, useEffect, useState } from "react";
import { getRoles } from "@/lib/api/role-permission";
import { toast } from "@/hooks/use-toast";
import { SelectSearch } from "../ui/select-search";
import { createUser, updateUser } from "@/lib/api/user";
import { zodResolver } from "@hookform/resolvers/zod";

interface CreateAndUpdateProps {
  isAddEdit: "add" | "edit";
  user?: User;
  icon?: ReactNode;
  title_button?: string;
  title_dialog: string;
  description_dialog: string;
  onSuccess?: () => void;
}

// Separate schemas for add and edit modes
const baseSchema = {
  full_name: z.string().min(1, "Vui lòng nhập họ tên"),
  email: z.string().email("Email không hợp lệ"),
  phone: z.string().min(9, "Số điện thoại phải có ít nhất 9 số"),
  address: z.string().min(1, "Vui lòng nhập địa chỉ"),
  username: z.string().min(6, "Tài khoản phải có ít nhất 6 ký tự"),
  role_id: z.union([z.string(), z.number()]),
};

const addSchema = z
  .object({
    ...baseSchema,
    password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
    confirmPassword: z.string().min(6, "Vui lòng nhập lại mật khẩu"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu không khớp",
    path: ["confirmPassword"],
  });
const editSchema = z
  .object({
    ...baseSchema,
    password: z.union([
      z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
      z.string().length(0),
    ]),
    confirmPassword: z.union([
      z.string().min(6, "Vui lòng nhập lại mật khẩu"),
      z.string().length(0),
    ]),
  })
  .superRefine((data, ctx) => {
    // Nếu cả hai trường đều trống, valid
    if (!data.password && !data.confirmPassword) {
      return;
    }

    // Nếu chỉ một trong hai trường có giá trị
    if (!data.password || !data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vui lòng nhập đầy đủ mật khẩu và xác nhận mật khẩu",
        path: ["password"],
      });
      return;
    }

    // Nếu cả hai trường có giá trị nhưng không khớp
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Mật khẩu không khớp",
        path: ["confirmPassword"],
      });
      return;
    }
  });

export function CreateAndUpdate({
  isAddEdit,
  user,
  icon,
  title_button,
  title_dialog,
  description_dialog,
  onSuccess,
}: CreateAndUpdateProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const schema = isAddEdit === "add" ? addSchema : editSchema;
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      address: "",
      username: "",
      password: "",
      role_id: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });

  const handleSubmit = async (formData: z.infer<typeof schema>) => {

    try {
      setIsLoading(true);

      const formattedValues = {
        ...formData,
        role_id: formData.role_id?.toString(),
      };

      if (isAddEdit === "edit" && user) {
        await updateUser(
          user.id,
          formattedValues.full_name,
          formattedValues.email,
          formattedValues.phone,
          formattedValues.address,
          formattedValues.password || null, // Only send password if provided
          formattedValues.role_id
        );
        toast({
          title: "Thành công",
          description: "Cập nhật người dùng thành công",
        });
      } else {
        await createUser(
          formattedValues.full_name,
          formattedValues.email,
          formattedValues.phone,
          formattedValues.address,
          formattedValues.username,
          formattedValues.password!,
          formattedValues.role_id
        );
        toast({
          title: "Thành công",
          description: "Tạo mới người dùng thành công",
        });
      }

      form.reset();
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Lỗi",
        description:
          error instanceof Error ? error.message : "Đã có lỗi xảy ra",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getRoles()
      .then((data) => setRoles(data.roles))
      .catch((error) => {
        toast({
          title: "Lỗi",
          description:
            error instanceof Error ? error.message : "Đã có lỗi xảy ra",
          variant: "destructive",
        });
      });
  }, []);

  useEffect(() => {
    if (open) {
      if (isAddEdit === "edit" && user) {
        form.reset({
          full_name: user.full_name,
          email: user.email,
          phone: user.phone,
          address: user.address,
          username: user.username,
          role_id: user.role_id,
        });
      } else {
        form.reset();
      }
    }
  }, [open, isAddEdit, user, form]);


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={`${
            isAddEdit === "add" ? "bg-blue-500" : ""
          } text-white font-semibold gap-1 h-8 hover:bg-sky-50 hover:text-sky-600 hover:border-sky-200 px-3 inset-shadow-sm`}
        >
          {icon}
          {title_button}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] md:max-w-[550px] gap-1">
        <DialogHeader>
          <DialogTitle>{title_dialog}</DialogTitle>
          <DialogDescription>{description_dialog}</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="grid gap-4 py-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="full_name">Họ và tên</Label>
              <Input {...form.register("full_name")} placeholder="Họ và tên" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                {...form.register("email")}
                type="email"
                placeholder="Email"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="phone">Số điện thoại</Label>
              <Input {...form.register("phone")} placeholder="Số điện thoại" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="address">Địa chỉ</Label>
              <Input {...form.register("address")} placeholder="Địa chỉ" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="username">Tài khoản</Label>
            <Input
              {...form.register("username")}
              placeholder="Tài khoản"
              disabled={isAddEdit === "edit"}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">
                {isAddEdit === "add" ? "Mật khẩu" : "Mật khẩu mới"}
              </Label>
              <Input
                {...form.register("password")}
                type="password"
                placeholder="Mật khẩu"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirmPassword">
                {isAddEdit === "add"
                  ? "Nhập lại mật khẩu"
                  : "Nhập lại mật khẩu mới"}
              </Label>
              <Input
                {...form.register("confirmPassword")}
                type="password"
                placeholder="Nhập lại mật khẩu"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="role_id">Quyền</Label>
            <SelectSearch
              options={roles.map((role) => ({
                value: role.id,
                label: role.name,
              }))}
              value={form.watch("role_id")?.toString()}
              onValueChange={(value) => form.setValue("role_id", value)}
              placeholder="Chọn quyền..."
              searchPlaceholder="Tìm kiếm theo tên..."
              emptyText="Không tìm thấy"
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
