import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { X } from "lucide-react";
import { getFileIcon } from "@/lib/contants";
import { useChatStore } from "@/lib/store/chat-store";

const FileList = () => {
  const files = useChatStore((state) => state.files);
  const deleteFile = useChatStore((state) => state.deleteFile);

  if (files.length === 0) return null;

  return (
    <div className="flex flex-row flex-wrap gap-1.5 xs:gap-2 sm:gap-4 mt-2 sm:mt-4">
      {files.map((file, index) => (
        <TooltipProvider
          key={`${file.name}-${index}`}
          delayDuration={200}
          skipDelayDuration={200}
        >
          <Tooltip>
            <TooltipTrigger>
              <div className="relative p-1.5 xs:p-2 sm:p-4 w-12 h-12 xs:w-14 xs:h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 border border-gray-200 rounded-lg hover:bg-sky-50 hover:border hover:border-sky-400 hover:cursor-pointer">
                {getFileIcon(file.filepath!)}
                <div
                  className="absolute -top-1 -right-1 p-0.5 xs:p-1 rounded-full bg-gray-200 hover:bg-red-100 hover:text-red-500 hover:border-red-500 hover:border cursor-pointer"
                  onClick={() => deleteFile(file.id)}
                >
                  <X size={10} className="xs:size-[12px]" />
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="mt-2">
              <p className="text-[10px] xs:text-xs sm:text-sm">{file.name}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
};

export default FileList;
