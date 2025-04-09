import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  FileSearch,
  FileArchive,
  Send } from "lucide-react";
// import ChooseFileInlineChat from "./ChooseFileInlineChat";
import FileList from "./FileList";

interface ChatInputProps {
  message: string;
  setMessage: (message: string) => void;
  handleChatMessage: () => void;
  isDeduce: boolean;
  setIsDeduce: (isDeduce: boolean) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
  message,
  setMessage,
  handleChatMessage,
  isDeduce,
  setIsDeduce,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const resetTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "";
      textareaRef.current.rows = 1;
    }
  };
  
  const handleSendMessage = () => {
    handleChatMessage();
    resetTextareaHeight();
  };
  
  return (
    <div className="p-2 sm:p-4 w-full">
      <Card className="w-full max-w-full sm:max-w-3xl mx-auto bg-white border-gray-200 shadow-sm rounded-2xl sm:rounded-3xl">
        <CardContent className="p-2 sm:p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <textarea
                ref={textareaRef}
                placeholder="Nhắn tin cho AI"
                className="border-none focus:outline-none focus:ring-0 hover:border-none resize-none overflow-y-auto max-h-[200px] sm:max-h-[400px] w-full text-sm sm:text-base"
                rows={1}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                onInput={(e: React.FormEvent<HTMLTextAreaElement>) => {
                  e.currentTarget.style.height = "";
                  e.currentTarget.style.height = `${Math.min(
                    e.currentTarget.scrollHeight,
                    window.innerWidth < 640 ? 200 : 400
                  )}px`;
                }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1 sm:space-x-2">
              {/* <ChooseFileInlineChat /> */}
              <div
                className={`flex flex-row items-center space-x-1 sm:space-x-2 bg-gray-100 rounded-2xl sm:rounded-3xl px-2 sm:px-3 py-1 sm:py-1.5 cursor-pointer border border-gray-200 ${
                  isDeduce && "bg-blue-100 border-blue-200"
                }`}
                onClick={() => setIsDeduce(!isDeduce)}
              >
                {isDeduce ? (
                  <FileSearch color="#2563eb" className="h-3 w-3 sm:h-4 sm:w-4" />
                ) : (
                  <FileArchive className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                )}
                <span
                  className={`text-xs sm:text-sm text-gray-600 ${
                    isDeduce && "!text-blue-600"
                  }`}
                >
                  Suy luận
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 sm:h-8 sm:w-8 text-gray-500"
              onClick={handleSendMessage}
            >
              <Send className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
          <FileList />
        </CardContent>
      </Card>
    </div>
  );
};

export default ChatInput;
