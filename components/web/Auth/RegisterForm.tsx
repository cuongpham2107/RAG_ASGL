"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const formSchema = z.object({
  username: z.string().min(6),
  password: z.string().min(6),
  confirmPassword: z.string().min(6),
  full_name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  address: z.string(),
});

export function RegisterForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const { toast } = useToast();
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      username: "",
      password: "",
      confirmPassword: "",
      email: "",
      phone: "",
      address: "",
    },
  });
  async function onSubmit(values: z.infer<typeof formSchema>) {
    const URL_API = process.env.NEXT_PUBLIC_API_URL!;
    try {
      const formData = new FormData();
      formData.append("full_name", values.full_name);
      formData.append("username", values.username);
      formData.append("password", values.password);
      formData.append("confirmPassword", values.confirmPassword);
      formData.append("email", values.email);
      formData.append("phone", values.phone);
      formData.append("address", values.address);
      const response = await fetch(`${URL_API}/auth/register`, {
        method: "POST",
        body: formData,
      });
     
      if(!response.ok) {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: "Đã xảy ra lỗi khi đăng ký",
        });
        return;
      }
      toast({
        variant: "default",
        title: "Thành công",
        description: "Đăng ký thành công",
      });
      router.push("/auth/login");
    
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error instanceof Error ? error.message : "Đã xảy ra lỗi",
      });
    }
  }
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="w-full mx-auto max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Đăng ký</CardTitle>
          <CardDescription>
            Nhập thông tin tài khoản của bạn dưới đây để đăng ký vào tài khoản
            của bạn
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="full_name">Họ và tên</Label>
                <Input
                  id="full_name"
                  type="text"
                  placeholder="Họ và tên"
                  required
                  {...form.register("full_name")}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Email"
                    required
                    {...form.register("email")}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Số điện thoại</Label>
                  <Input
                    id="phone"
                    type="text"
                    placeholder="Số điện thoại"
                    required
                    {...form.register("phone")}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address">Địa chỉ</Label>
                <Input
                  id="address"
                  type="text"
                  placeholder="Địa chỉ"
                  required
                  {...form.register("address")}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="username">Tài khoản</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Tài khoản"
                  required
                  {...form.register("username")}
                />
              </div>
              <div className="grid gap-2">
                  <Label htmlFor="password">Mật khẩu</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  {...form.register("password")}
                  placeholder="*******"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Nhập lại mật khẩu</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  required
                  {...form.register("confirmPassword")}
                  placeholder="*******"
                />
              </div>
              <Button type="submit" className="w-full">
                Đăng kí
              </Button>
            </div>
          </form>
          <div className="mt-4 text-center text-sm">
            Bạn chưa đã có tài khoản?{" "}
            <Link href="/auth/login" className="underline underline-offset-4">
              Đăng nhập
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
