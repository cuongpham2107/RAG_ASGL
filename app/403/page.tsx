"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ForbiddenPage() {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="max-w-md w-full shadow-lg">
        <CardHeader className="flex flex-col items-center gap-2 pt-6">
          <div className="bg-destructive/10 p-3 rounded-full">
            <AlertCircle className="h-10 w-10 text-destructive" />
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight">403</h1>
            <p className="text-xl text-muted-foreground mt-1">Truy Cập Bị Từ Chối</p>
          </div>
        </CardHeader>
        <CardContent className="text-center px-6">
          <p className="text-muted-foreground">
            Bạn không có quyền truy cập vào tài nguyên này. Vui lòng liên hệ với quản trị viên nếu bạn cho rằng đây là lỗi.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center gap-3 pb-6">
          <Button
            variant="outline"
            onClick={() => router.back()}
          >
            Quay Lại
          </Button>
          <Button asChild>
            <Link href="/auth/login">Quay lại trang Đăng nhập</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}


