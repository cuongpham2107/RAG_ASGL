"use client";
import React, { useEffect, useRef } from "react";
import { useChatLogic } from "@/hooks/use-chat-logic";
import ChatInput from "./ChatInput";
import ChatMessages from "./ChatMessages";
import { useChatStore } from "@/lib/store/chat-store";

const OldChatUi = ({ id }: { id: string }) => {
  const {
    chatMessages,
    message,
    setMessage,
    streamingTextResult,
    isWaitingMessageAiSend,
    isDeduce,
    setIsDeduce,
    handleChatMessage,
    getChatMessages,
    abortController
  } = useChatLogic(id);

  const messagesEndRef = useRef<HTMLDivElement | null>(null); // Update ref type
  const setNullFiles = useChatStore((state) => state.setNullFiles);

  useEffect(() => {
    getChatMessages();
    setIsDeduce(false);
    const controller = abortController.current;
    return () => {
      if (controller) {
        controller.abort();
      }
    };
  }, [getChatMessages, abortController, setIsDeduce]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  });

  useEffect(() => {
    setNullFiles();
  }, [setNullFiles]);

  return (
    <div className="flex flex-col items-center h-full w-full px-2 sm:px-4">
      <ChatMessages
        messages={chatMessages}
        isWaitingMessageAiSend={isWaitingMessageAiSend}
        streamingTextResult={streamingTextResult}
        messagesEndRef={messagesEndRef}
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

export default OldChatUi;
