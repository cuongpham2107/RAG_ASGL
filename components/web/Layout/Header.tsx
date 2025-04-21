"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Drama, LogOut, UserPen, Users } from "lucide-react";
import { useAuthStore } from "@/lib/store/auth-store";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import InforProfile from "../Profile/Infor";
import Link from "next/link";

import GlobalSearch from "@/components/web/GlobalSearch";


export function Header() {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const handleLogout = () => {
    logout();
    router.push("/auth/login");
  };
  return (
    <header className="relative">
      <div className="absolute top-0 left-0 flex items-center gap-2 p-2 z-10 pointer-events-auto">
        <SidebarTrigger className="border border-input bg-background p-4" />
        <GlobalSearch />
      </div>

      <div className="absolute top-0 right-0 w-full h-[60px] flex items-center justify-end pr-2 z-[5]">
      <Popover>
        <PopoverTrigger>
          <Avatar>
            <AvatarImage
              height={20}
              width={20}
              src={"/images/profile.png"}
              alt="profile"
            />
          </Avatar>
        </PopoverTrigger>
        <PopoverContent className="p-0 mr-2 mt-1 max-w-max w-full">
          <div className="flex flex-col ">
            <div>
              <div className="flex flex-row space-x-2 px-4 py-3 border-b">
                <Avatar>
                  <AvatarImage src={"/images/profile.png"} alt="profile" />
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{user?.full_name}</span>
                  <span className="text-xs text-gray-500">{user?.email}</span>
                </div>
              </div>
            </div>
            <div className="px-4 py-3 hover:bg-gray-200">
              <Dialog>
                <DialogTrigger className="flex flex-row space-x-2 items-center !border-none !shadow-none cursor-pointer p-0 m-0">
                  <UserPen size={20} />
                  <p className="text-sm">Thông tin tài khoản</p>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Thông tin tài khoản</DialogTitle>
                    <DialogDescription>
                      Dưới đây là chi tiết thông tin cá nhân của bạn
                    </DialogDescription>
                  </DialogHeader>
                  <InforProfile />
                </DialogContent>
              </Dialog>
            </div>
            {user?.role !== null && user?.role.toUpperCase() === "ADMIN" ? (
              <>
                <div className="px-4 py-3 border-t hover:bg-gray-200">
                  <Link
                    href="/user"
                    className="flex flex-row items-center space-x-2 w-full borber-none shadow-none cursor-pointer"
                  >
                    <Users size={20} />
                    <p className="text-sm">Danh sách tài khoản</p>
                  </Link>
                </div>
                <div className="px-4 py-3 border-t hover:bg-gray-200">
                  <Link
                    href="/role"
                    className="flex flex-row items-center space-x-2 w-full borber-none shadow-none cursor-pointer"
                  >
                    <Drama size={20} />
                    <p className="text-sm">Phân quyền</p>
                  </Link>
                </div>
              </>
            ) : null}
            <div className="px-4 py-3 border-t hover:bg-gray-200">
              <div
                onClick={() => handleLogout()}
                className="flex flex-row items-center space-x-2 w-full borber-none shadow-none cursor-pointer"
              >
                <LogOut size={20} />
                <p className="text-sm">Đăng xuất</p>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      </div>
    </header>
  );
}
