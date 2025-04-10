"use client";

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/store/auth-store";
import Link from "next/link";

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast";

const formSchema = z.object({
  username: z.string(),
  password: z.string().min(6),
})


export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {

  const router = useRouter()
  const login = useAuthStore((state) => state.login)
  // const setCurrentMenuItem = usePageStore(state => state.setCurrentMenuItem);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  })
  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const result = await login(values.username, values.password)
      if (result?.error) {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: result.error,
        })
      } else {
        router.push('/chat')
      }
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error instanceof Error ? error.message : "Đã có lỗi xảy ra",
      })
    } finally {
      // Reset form values regardless of success or failure
      form.reset({
        username: "",
        password: "",
      });
    }
  }
  return (
    <div className={cn("flex flex-col gap-4", className)} {...props}>
      <Card className="w-full mx-auto max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Đăng nhập</CardTitle>
          <CardDescription>
            Nhập tài khoản và mật khẩu của bạn dưới đây để đăng nhập vào tài khoản của bạn
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-6">
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
                <div className="flex items-center">
                  <Label htmlFor="password">Mật khẩu</Label>
                  <a
                    href="/auth/forgot-password"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Quên mật khẩu?
                  </a>
                </div>
                <Input id="password" type="password" required {...form.register("password")} placeholder="*******"/>
              </div>
              <Button type="submit" className="w-full">
                Đăng nhập
              </Button>
              
            </div>
            
          </form>
          <div className="mt-4 text-center text-sm">
              Bạn chưa có tài khoản?{" "}
              <Link href="/auth/register" className="underline underline-offset-4">
                Đăng ký
              </Link>
            </div>
        </CardContent>
      </Card>
    </div>
  )
}
