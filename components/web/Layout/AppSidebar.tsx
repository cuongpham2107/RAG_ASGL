"use client";

import * as React from "react";
import Image from "next/image";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter, usePathname } from "next/navigation";
import { usePageStore } from "@/lib/store/page-store";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Ellipsis,
  Trash,
  Edit,
  ChevronRight,
  FolderOpen,
  CircleDot,
  Bot,
  Dot,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import {
  deleteChatHistory,
  getChatHistories,
  updateChatHistory,
} from "@/lib/api/chat-history";
import { useChatHistoriesStore } from "@/hooks/use-chat-histories";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";

import Link from "next/link";
import { CreateFolderDialog } from "../Document/Folder/CreateFolderDialog";
import { UpdateFolderDialog } from "../Document/Folder/UpdateFolderDialog";
import { deleteFolder, updateFolder } from "@/lib/api/folder";
import { ClientPermissionGuard } from "@/components/hoc/withPermission";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentPath, setCurrentPath] = useState("");

  useEffect(() => {
    setCurrentPath(pathname);
  }, [pathname]);

  const { filteredChatHistories, fetchChatHistories } = useChatHistoriesStore();

  const menu_documents = usePageStore((state) => state.menu);
  const loadMenuFromApi = usePageStore((state) => state.loadMenuFromApi);
  const refreshMenu = usePageStore((state) => state.refreshMenu);

  const [hoveredItem, setHoveredItem] = useState<number | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const [isCollapsibleOpen, setIsCollapsibleOpen] = useState(true);
  const [openChatGroups, setOpenChatGroups] = useState<{
    [key: string]: boolean;
  }>({});
  useEffect(() => {
    loadMenuFromApi();
  }, [loadMenuFromApi]);

  const [currentChatHistoryEiditInline, setCurrentChatHistoryEiditInline] =
    useState<{ id: number | null; name: string | null }>({
      id: null,
      name: null,
    });
  const handleEditInline = (id: number, name: string) => {
    setCurrentChatHistoryEiditInline({ id, name });
  };
  const handleSaveEiditInlineChatHistory = async () => {
    updateChatHistory(
      currentChatHistoryEiditInline.id!,
      currentChatHistoryEiditInline.name!
    )
      .then(() => {
        fetchChatHistories();
        setCurrentChatHistoryEiditInline({ id: null, name: null });
        toast({
          title: "Chỉnh sửa thành công",
          description: "Đã cập nhật tên cuộc trò chuyện",
        });
      })
      .catch((err) => {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: err instanceof Error ? err.message : "Đã xảy ra lỗi",
        });
      });
  };
  const handleDelete = async (id: number) => {
    deleteChatHistory(id)
      .then(() => {
        getChatHistories();
        toast({
          title: "Xóa thành công",
          description: "Đã xóa cuộc trò chuyện",
        });
      })
      .catch((err) => {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: err instanceof Error ? err.message : "Đã xảy ra lỗi",
        });
      });
  };

  const handleDeleteFolder = async (id: string) => {
    deleteFolder(id)
      .then(() => {
        refreshMenu();
        toast({
          title: "Xóa thành công",
          description: "Đã xóa thư mục",
        });
      })
      .catch((err) => {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: err instanceof Error ? err.message : "Đã xảy ra lỗi",
        });
      });
  };

  useEffect(() => {
    fetchChatHistories();
  }, [fetchChatHistories]);

  useEffect(() => {
    if (filteredChatHistories.length > 0) {
      const initialState = filteredChatHistories.reduce((acc, chat) => {
        acc[chat.name] = true;
        return acc;
      }, {} as { [key: string]: boolean });
      setOpenChatGroups(initialState);
    }
  }, [filteredChatHistories, filteredChatHistories.length]);

  const toggleChatGroup = (groupName: string) => {
    setOpenChatGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  const handleUpdateFolder = async (folderId: string, newName: string) => {
    try {
      await updateFolder(folderId, newName);
      refreshMenu();
      toast({
        title: "Thành công",
        description: "Cập nhật thư mục thành công",
      });
      return Promise.resolve();
    } catch (error) {
      toast({
        title: "Lỗi",
        description:
          error instanceof Error ? error.message : "Không thể cập nhật thư mục",
        variant: "destructive",
      });
      return Promise.reject(error);
    }
  };
  return (
    <Sidebar {...props}>
      <SidebarHeader className="p-4">
        <Image
          src="/images/logo.png"
          sizes="100%"
          width={100}
          height={50}
          style={{ objectFit: "contain", width: "50%", height: "auto" }}
          alt="Logo"
          priority
        />
      </SidebarHeader>
      <SidebarContent className="px-2 overflow-y-auto">
        <SidebarMenu>
          <SidebarMenuItem>
            <Link
              href="/chat"
              className={cn(
                "h-10 hover:bg-sky-100 hover:border hover:border-sky-200 flex items-center gap-2 px-2 py-2 rounded-md text-sm",
                currentPath === "/chat" && "bg-sky-100 border border-sky-200"
              )}
            >
              <Bot size={18} />
              Cuộc trò truyện mới
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>

        <SidebarMenu>
          <Collapsible
            open={isCollapsibleOpen}
            onOpenChange={setIsCollapsibleOpen}
          >
            <SidebarMenuItem className="flex items-center justify-between">
              <SidebarMenuButton
                className="flex-1"
                onClick={() => setIsCollapsibleOpen(!isCollapsibleOpen)}
              >
                <FolderOpen />
                <span>Danh sách tài liệu</span>
              </SidebarMenuButton>

              {menu_documents?.length ? (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCollapsibleOpen(!isCollapsibleOpen);
                  }}
                >
                  <SidebarMenuAction
                    className={isCollapsibleOpen ? "rotate-90" : ""}
                  >
                    <ChevronRight />
                    <span className="sr-only">Toggle</span>
                  </SidebarMenuAction>
                </div>
              ) : null}
            </SidebarMenuItem>

            {menu_documents?.length > 0 ? (
              <CollapsibleContent>
                <SidebarMenuSub>
                  {menu_documents.map((item) => (
                    <ClientPermissionGuard
                      key={item.id}
                      permission="view_folders"
                      resourcePermission={{
                        resuorceType: "folders",
                        resourceId: item.id,
                        permissionType: "can_read",
                      }}
                    >
                      <ContextMenu>
                        <ContextMenuTrigger>
                          <SidebarMenuSubItem
                            className={`
                      ${
                        currentPath.split("/")[2] === item.id.toString()
                          ? "bg-sky-100 border border-sky-200"
                          : ""
                      }
                      py-1 hover:bg-sky-100 hover:border hover:border-sky-200 rounded-md`}
                          >
                            <SidebarMenuSubButton asChild>
                              <a href={`/document/${item.id}`}>
                                <Dot strokeWidth={2.75} />
                                <span>{item.title}</span>
                              </a>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuItem>
                            <UpdateFolderDialog
                              titleButton="Chỉnh sửa"
                              folderId={item.id.toString()}
                              folderName={item.title}
                              onUpdate={handleUpdateFolder}
                            />
                          </ContextMenuItem>
                          <ContextMenuItem>
                            <div
                              onClick={() => {
                                handleDeleteFolder(item.id.toString());
                              }}
                              className="flex flex-row items-center cursor-pointer gap-2"
                            >
                              <Trash size={20} color="#ea580c" />
                              <span>Xóa</span>
                            </div>
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    </ClientPermissionGuard>
                  ))}
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild>
                      <CreateFolderDialog
                        className="w-full justify-center"
                        parentId={"0"}
                        fetchFoldersAction={refreshMenu}
                      />
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              </CollapsibleContent>
            ) : null}
          </Collapsible>
        </SidebarMenu>

        {filteredChatHistories.map((chat, index) => {
          if (!chat.items || chat.items.length <= 0) return null;
          return (
            <SidebarMenu key={index}>
              <Collapsible
                open={openChatGroups[chat.name] ?? true}
                onOpenChange={() => toggleChatGroup(chat.name)}
              >
                <SidebarMenuItem className="flex items-center justify-between">
                  <SidebarMenuButton
                    className="flex-1"
                    onClick={() => toggleChatGroup(chat.name)}
                  >
                    <CircleDot />
                    <span className="font-bold text-sm">{chat.name}</span>
                  </SidebarMenuButton>

                  {chat.items.length > 0 && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleChatGroup(chat.name);
                      }}
                    >
                      <SidebarMenuAction
                        className={openChatGroups[chat.name] ? "rotate-90" : ""}
                      >
                        <ChevronRight />
                        <span className="sr-only">Toggle</span>
                      </SidebarMenuAction>
                    </div>
                  )}
                </SidebarMenuItem>

                <CollapsibleContent>
                  <SidebarMenuSub>
                    {(chat.items ?? []).map((subItem) => (
                      <SidebarMenuSubItem
                        key={subItem.id}
                        onMouseEnter={() => setHoveredItem(subItem.id)}
                        onMouseLeave={() => setHoveredItem(null)}
                        className={`cursor-pointer ${
                          currentPath === `/chat/${subItem.id}`
                            ? "bg-gray-200"
                            : ""
                        } py-1 hover:bg-gray-200 rounded-md`}
                      >
                        <SidebarMenuSubButton
                          onClick={() => router.push(`/chat/${subItem.id}`)}
                        >
                          {currentChatHistoryEiditInline.name !== null &&
                          currentChatHistoryEiditInline.id === subItem.id ? (
                            <div className="flex justify-between items-center w-full">
                              <Input
                                value={currentChatHistoryEiditInline.name}
                                onChange={(e) =>
                                  setCurrentChatHistoryEiditInline({
                                    id: subItem.id,
                                    name: e.target.value,
                                  })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handleSaveEiditInlineChatHistory();
                                  }
                                  if (e.key === "Escape") {
                                    setCurrentChatHistoryEiditInline({
                                      id: null,
                                      name: null,
                                    });
                                  }
                                }}
                                className="border border-gray-600 rounded-md px-2 m-1 focus-visible:outline-none focus-visible:outline-offset-0 focus-visible:ring-0"
                                autoFocus
                              />
                            </div>
                          ) : (
                            <div className="flex flex-row justify-between items-center w-full">
                              <TooltipProvider
                                delayDuration={200}
                                skipDelayDuration={200}
                              >
                                <Tooltip>
                                  <TooltipTrigger>
                                    <div className="flex-1 items-start text-left w-full">
                                      <span className="line-clamp-1 ">
                                        {subItem.name}
                                      </span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{subItem.name}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              {(hoveredItem === subItem.id ||
                                openDropdownId === subItem.id) && (
                                <div className="transition-opacity">
                                  <DropdownMenu
                                    open={openDropdownId === subItem.id}
                                    onOpenChange={(open) => {
                                      setOpenDropdownId(
                                        open ? subItem.id : null
                                      );
                                    }}
                                  >
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <DropdownMenuTrigger className="focus:outline-none flex items-center justify-between">
                                            <Ellipsis size={20} />
                                          </DropdownMenuTrigger>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p className="font-semibold">
                                            Tuỳ chọn
                                          </p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                    <DropdownMenuContent
                                      align="start"
                                      className="max-w-max"
                                    >
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleEditInline(
                                            subItem.id,
                                            subItem.name
                                          )
                                        }
                                        className="cursor-pointer"
                                      >
                                        <Edit className="mr-2 h-4 w-4" />
                                        <span>Đổi tên</span>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleDelete(subItem.id)}
                                        className="cursor-pointer text-red-600 focus:text-red-600"
                                      >
                                        <Trash className="mr-2 h-4 w-4" />
                                        <span>Xóa</span>
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              )}
                            </div>
                          )}
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </Collapsible>
            </SidebarMenu>
          );
        })}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
