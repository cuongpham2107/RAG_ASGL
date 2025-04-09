import { useState, useRef, useCallback } from 'react';
import { ChatMessage } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { useAuthStore } from '@/lib/store/auth-store';
import { useChatStore } from '@/lib/store/chat-store';

export const useChatLogic = (groupId: string | null = null) => {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState<string>("");
  const [streamingTextResult, setStreamingTextResult] = useState<string>("");
  const [isWaitingMessageAiSend, setIsWaitingMessageAiSend] = useState(false);
  const [isDeduce, setIsDeduce] = useState(false);
  const abortController = useRef<AbortController | null>(null);
  
  const api_url = process.env.NEXT_PUBLIC_API_URL!;
  const token = useAuthStore((state) => state.token);
  const files = useChatStore((state) => state.files);

  const handleChatMessage = async () => {
    if (!message.trim()) return;

    abortController.current = new AbortController();
    setStreamingTextResult("");
    setIsWaitingMessageAiSend(true);

    const tempMessage = {
      id: Date.now(),
      group_id: groupId ? Number(groupId) : null,
      question: message,
      answer: "",
      sources: "",
      timestamp: new Date(),
    };
    
    setChatMessages((prev) => [...prev, tempMessage]);
    setMessage("");

    try {
      const params = new URLSearchParams();
      params.append('question', message);
      
      if (files.length > 0) {
        files.forEach(file => {
          params.append('files', file.name);
        });
      }

      const endpoint = groupId ? `${api_url}/chat/${groupId}` : `${api_url}/chat/`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "text/event-stream", 
          Authorization: `Bearer ${token}`,
        },
        body: params,
        signal: abortController.current.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((line) => line.trim());
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.type === "stream") {
              setIsWaitingMessageAiSend(false);
              setStreamingTextResult((prev) => prev + data.data);
            } else if (data.type === "final") {
              const finalMessage = {
                ...data.data,
                id: tempMessage.id,
                group_id: data.data.chat_history_id || groupId,
              };
              setChatMessages((prev) =>
                prev.map((msg) => (msg.id === tempMessage.id ? finalMessage : msg))
              );
              setStreamingTextResult("");
            }
          } catch (e) {
            toast({
              title: "Lỗi",
              description: e instanceof Error ? e.message : "An error occurred",
            });
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.name === "AbortError") {
          toast({
            variant: "destructive",
            description: "Request was cancelled",
          });
        } else {
          toast({
            variant: "destructive",
            description: err.message,
          });
        }
      }
    } finally {
      setIsWaitingMessageAiSend(false);
    }
  };

  const getChatMessages = useCallback(async () => {
    if (!groupId) return;
    if (!token) return;
    try {
      const res = await fetch(`${api_url}/chat/${groupId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setChatMessages(data.data);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        description: error instanceof Error ? error.message : "An error occurred",
      });
    }
  }, [api_url, groupId, token]);

  return {
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
  };
};
