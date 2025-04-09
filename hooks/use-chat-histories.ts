import { create } from 'zustand';
import { getChatHistories } from '@/lib/api/chat-history';
import { filterDayChatHistories } from '@/lib/utils';
import { ChatHistory } from '@/lib/types';
import { toast } from './use-toast';

interface ChatHistoriesStore {
  filteredChatHistories: { name: string; items: ChatHistory[] }[];
  fetchChatHistories: () => Promise<void>;
}

export const useChatHistoriesStore = create<ChatHistoriesStore>((set) => ({
  filteredChatHistories: [],
  fetchChatHistories: async () => {
    try {
      const results = await getChatHistories();
      set({ filteredChatHistories: filterDayChatHistories(results) });
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    }
  },
}));
