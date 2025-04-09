"use client";
import React, { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useChatLogic } from "@/hooks/use-chat-logic";
import ChatInput from "./ChatInput";
import ChatMessages from "./ChatMessages";
import { useChatStore } from "@/lib/store/chat-store";
import { useChatHistoriesStore } from '@/hooks/use-chat-histories';

const NewChatUi = () => {
  const router = useRouter();
  const {
    chatMessages,
    message,
    setMessage,
    streamingTextResult,
    isWaitingMessageAiSend,
    isDeduce,
    setIsDeduce,
    handleChatMessage,
    abortController
  } = useChatLogic();

  const messagesEndRef = useRef<HTMLDivElement | null>(null); // Update ref type
  const setNullFiles = useChatStore((state) => state.setNullFiles);
  const { fetchChatHistories } = useChatHistoriesStore();

  useEffect(() => {
    setIsDeduce(false);
    const controller = abortController.current;
    return () => {
      if (controller) {
        controller.abort();
      }
    };
  }, [abortController, setIsDeduce]);

  useEffect(() => {
    if (chatMessages.length > 0 && chatMessages[0].group_id) {
      setTimeout(async () => {
        await router.replace(`/chat/${chatMessages[0].group_id}`);
        fetchChatHistories();
      }, 100);
    }
  }, [chatMessages, router, fetchChatHistories]);

  useEffect(() => {
    setNullFiles();
  }, [setNullFiles]);

  const emptyState = (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="text-center px-2 sm:px-4">
        <h1 className="text-xl sm:text-2xl mb-2 sm:mb-4">
          Chào mừng bạn đến với trợ lý ảo của tôi
        </h1>
        <p className="text-gray-500 text-sm sm:text-base">
          Để bắt đầu, hãy nhập câu hỏi của bạn vào ô chat bên dưới
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center h-full w-full px-2 sm:px-4">
      <ChatMessages
        messages={chatMessages}
        isWaitingMessageAiSend={isWaitingMessageAiSend}
        streamingTextResult={streamingTextResult}
        messagesEndRef={messagesEndRef}
        emptyState={emptyState}
      />
      <ChatInput
        message={message}
        setMessage={setMessage}
        handleChatMessage={handleChatMessage}
        isDeduce={isDeduce}
        setIsDeduce={setIsDeduce}
      />
    </div>
  );
};

export default NewChatUi;
