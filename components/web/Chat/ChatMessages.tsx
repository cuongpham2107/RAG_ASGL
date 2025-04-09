import React from "react";
import { ChatMessage, File } from "@/lib/types";
import { MarkdownContent } from "../ui/markdown-content";
import { Skeleton } from "@/components/ui/skeleton";
import WaveText from "../Utils/WaveText";
import { Link } from "lucide-react";
import { getFile } from "@/lib/api/file";
import { toast } from "@/hooks/use-toast";
import { useFileDownload } from "@/hooks/use-file-download";

interface ChatMessagesProps {
  messages: ChatMessage[];
  isWaitingMessageAiSend: boolean;
  streamingTextResult: string;
  messagesEndRef: React.RefObject<HTMLDivElement | null>; // Update type here
  emptyState?: React.ReactNode;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  isWaitingMessageAiSend,
  streamingTextResult,
  messagesEndRef,
  emptyState,
}) => {
  const { handleFileView, handleFileDownload } = useFileDownload();
  
  if (messages.length === 0 && emptyState) {
    return emptyState;
  }
  const handleViewAndDownload = async (idFile: number) => {
    await getFile(idFile)
    .then((res) => {
      const file = res as File

      if(file.filepath.split(".").pop() === "pdf")
      {
        handleFileView(file);
      }
      else {
        handleFileDownload([file]);
      }
    })
    .catch((err) => {
      toast({
        title: "Lỗi",
        description: err.message,
        variant: "destructive",
      })
    });
  }
  return (
    <div className="flex-1 overflow-y-auto p-2 sm:p-4 w-full max-w-full sm:max-w-4xl scroll-smooth h-full">
      <div className="space-y-3 sm:space-y-4">
        {messages.map((chat, index) => (
          <div key={`${chat.id}-${index}`} className="space-y-3 sm:space-y-4">
            <div className="flex justify-end">
              <div className="bg-gray-200 text-gray-800 rounded-2xl px-3 sm:px-4 py-2 max-w-[90%] sm:max-w-[80%] text-sm sm:text-base break-words">
                {chat.question}
              </div>
            </div>
            <div className="flex justify-start">
              <div className="bg-white px-2 sm:px-4 py-2 w-full text-sm sm:text-base">
                <MarkdownContent>{chat.answer}</MarkdownContent>
                {chat.sources && (
                    <div className="text-xs mt-2 flex flex-row items-center gap-1.5 text-gray-600">
                    <Link className="text-blue-500" size={14} />
                    <p className="font-medium">Nguồn tài liệu:</p>
                    {(() => {
                      try {
                        const sourceData = typeof chat.sources === 'string' 
                          ? JSON.parse(chat.sources) 
                          : chat.sources;
                        if (Array.isArray(sourceData)) {
                          return (
                            <div className="flex flex-wrap gap-1">
                              {sourceData.map((source, i) => (
                                <span 
                                  key={i}
                                  onClick={() => handleViewAndDownload(typeof source.id === 'number' ? source.id : parseInt(source.id))}
                                  className="inline-block truncate max-w-xs bg-blue-50 text-blue-700 font-medium rounded-md px-2 py-0.5 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer">
                                  {typeof source.name === 'string' ? source.name : String(source.name)}
                                </span>
                              ))}
                            </div>
                          );
                        } else if (sourceData && typeof sourceData === 'object') {
                          // Safe extraction of name and id
                          const sourceName = sourceData.name ? String(sourceData.name) : "Không có tên";
                          const sourceId = sourceData.id ? 
                            (typeof sourceData.id === 'number' ? sourceData.id : parseInt(sourceData.id)) : 0;
                          
                          return (
                            <span 
                              onClick={() => handleViewAndDownload(sourceId)}
                              className="inline-block truncate max-w-xs bg-blue-50 text-blue-700 font-medium rounded-md px-2 py-0.5 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer">
                              {sourceName}
                            </span>
                          );
                        } else {
                          
                          return (
                            <span className="inline-block truncate max-w-xs bg-blue-50 text-blue-700 font-medium rounded-md px-2 py-0.5 border border-blue-200">
                              {"Không có thông tin"}
                            </span>
                          );
                        }
                      
                      // eslint-disable-next-line @typescript-eslint/no-unused-vars
                      } catch (error) {
                       
                        return (
                          <span className="inline-block truncate max-w-xs bg-blue-50 text-blue-700 font-medium rounded-md px-2 py-0.5 border border-blue-200">
                            {typeof chat.sources === 'string' ? chat.sources : "Không có thông tin"}
                          </span>
                        );
                      }
                    })()}
                    </div>
                )}
              </div>
            </div>
          </div>
        ))}
        <div className="mx-2 sm:mx-4 py-2 sm:py-4">
          {isWaitingMessageAiSend && (
            <div className="flex flex-col space-y-1 sm:space-y-2">
              <WaveText text={"Suy luận..."} />
              <div className="space-y-1 sm:space-y-2">
                <Skeleton className="h-3 sm:h-4 w-[200px] sm:w-[350px]" />
                <Skeleton className="h-3 sm:h-4 w-[250px] sm:w-[400px]" />
                <Skeleton className="h-3 sm:h-4 w-[150px] sm:w-[300px]" />
              </div>
            </div>
          )}
          {streamingTextResult && (
            <div className="flex justify-start">
              <div className="bg-white py-1 sm:py-2 w-full text-sm sm:text-base">
                <MarkdownContent>{streamingTextResult}</MarkdownContent>
              </div>
            </div>
          )}
        </div>
      </div>
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatMessages;
