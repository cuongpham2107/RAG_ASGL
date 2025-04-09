import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FolderTree } from "../Document/FolderTree";
import { Button } from "@/components/ui/button";

export default function ChooseFileInlineChat() {
  return (
    <div className="relative">
      <TooltipProvider delayDuration={200} skipDelayDuration={200}>
        <Tooltip>
          <Dialog>
            <TooltipTrigger asChild>
              <DialogTrigger asChild>
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white border-2 border-gray-200 hover:border-sky-400 hover:bg-sky-50 transition-all duration-200 shadow-sm cursor-pointer">
                  <Plus className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 hover:text-sky-600 transition-colors" />
                </div>
              </DialogTrigger>
            </TooltipTrigger>
            <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-[85vw] md:max-w-[80vw] lg:min-w-[1000px] overflow-y-auto max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>Danh sách tài liệu</DialogTitle>
                <DialogDescription>
                  Chọn hoặc tải tập tin mới lên từ máy tính của bạn để có thể
                  chat với AI
                </DialogDescription>
              </DialogHeader>
              <div>
                <FolderTree />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button">Tiếp tục</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <TooltipContent className="bg-gray-800 text-white px-3 py-1.5 rounded-lg shadow-lg text-xs sm:text-sm">
            <p>Chọn hoặc tải tập tin mới lên</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
