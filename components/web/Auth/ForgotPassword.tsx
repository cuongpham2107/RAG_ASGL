"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@radix-ui/react-label";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

const formSchema = z.object({
  username: z.string(),
  email: z.string().min(6).email(),
  phone: z.string().min(10),
  password: z.string().min(6),
  password_confirmation: z.string().min(6),
});
export default function ForgotPassword() {
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      email: "",
      phone: "",
      password: "",
      password_confirmation: "",
    },
  });
  const url_api = process.env.NEXT_PUBLIC_API_URL!;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if(values.password !== values.password_confirmation){
      toast({
        title: "Lỗi",
        description: "Mật khẩu không khớp",
      });
      return;
    }
    try {
        const formData = new FormData();
        formData.append("username", values.username);
        formData.append("email", values.email);
        formData.append("phone", values.phone);
        formData.append("password", values.password);
        await fetch(`${url_api}/auth/forgot-password`, {
            method: "POST",
            headers: {},
            body: formData,
        }).then((res) => res.json())
        .then((data) => {
            if(data.error){
                toast({
                    title: "Lỗi",
                    description: data.error,
                });
            } else {
                toast({
                    title: "Thành công",
                    description: "Lấy lại mật khẩu thành công",
                });
                router.push("/auth/login");
            }
        });
    }
    catch (error) {
        toast({
            variant: "destructive",
            title: "Lỗi",
            description: error instanceof Error ? error.message : "An error occurred",
        });
    }

  };

  return (
    <div className="flex h-screen items-center justify-center">
      <Card className="w-full mx-auto max-w-md min-w-[400px]">
        <CardHeader>
          <CardTitle className="text-2xl">Lấy lại mật khẩu</CardTitle>
          <CardDescription>
            Điền thông tin tài khoản để lấy lại mật khẩu
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-4">
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
                <div className="grid gap-2">
                    <Label htmlFor="password">Mật khẩu mới</Label>
                    <Input
                    id="password"
                    type="password"
                    placeholder="Mật khẩu mới"
                    required
                    {...form.register("password")}
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="password_confirmation">Nhập lại mật khẩu</Label>
                    <Input
                    id="password_confirmation"
                    type="password"
                    placeholder="Nhập lại mật khẩu"
                    required
                    {...form.register("password_confirmation")}
                    />
                </div>

              <Button type="submit" className="w-full">
                Lấy lại mật khẩu
              </Button>
            </div>
          </form>
          <div className="mt-4 text-center text-sm">
            Bạn chưa có tài khoản?{" "}
            <Link
              href="/auth/register"
              className="underline underline-offset-4"
            >
              Đăng ký
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
