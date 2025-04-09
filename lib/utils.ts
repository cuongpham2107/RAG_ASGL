import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { ChatHistory, Folder } from "./types";


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function buildTree(data: Folder[] = []): Folder[] {
  if (!Array.isArray(data)) {
    return [];
  }

  const map: { [key: number]: Folder } = {};
  data.forEach((item) => {
    map[Number(item.id)] = { ...item, children: [] };
  });

  const tree: Folder[] = [];
  data.forEach((item) => {
    if (item.parent_id === null || item.parent_id === 0) {
      tree.push(map[Number(item.id)]);
    } else if (map[item.parent_id]) {
      map[item.parent_id].children!.push(map[Number(item.id)]);
    }
  });

  return tree;
}

export const getFileSize = (size: number) => {
  if (size < 1024) {
    return `${size} B`;
  } else if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(2)} KB`;
  } else if (size < 1024 * 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  } else {
    return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
}

export const formatFileSize = (bytes: number | undefined) => {
  if (bytes === undefined || isNaN(bytes)) return '0 B';
  
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  } else {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
}

export const filterDayChatHistories = (chatHistories: ChatHistory[]) => {
  const now = new Date();
  // Xác định thời điểm đầu ngày
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const startOf7DaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);

  // Khai báo các mảng chứa chat theo từng nhóm
  const today: ChatHistory[] = [];
  const yesterday: ChatHistory[] = [];
  const days7Ago: ChatHistory[] = [];

  // Phân loại chat dựa vào timestamp (sửa từ created_at sang timestamp)
  chatHistories.forEach((chat) => {
    const chatDate = new Date(chat.timestamp);
    if (chatDate >= startOfToday) {
      today.push(chat);
    } else if (chatDate >= startOfYesterday && chatDate < startOfToday) {
      yesterday.push(chat);
    } else if (chatDate >= startOf7DaysAgo && chatDate < startOfYesterday) {
      days7Ago.push(chat);
    }
    // Nếu có chat cũ hơn 7 ngày, bạn có thể xử lý thêm tại đây nếu cần.
  });

  // Sắp xếp theo thứ tự giảm dần (mới nhất trước)
  today.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  yesterday.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  days7Ago.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Giới hạn số lượng phần tử cho các nhóm "Hôm nay" và "Hôm qua"
  const groupedChats = [
    {
      name: "Hôm nay",
      items: today.slice(0, 7),
    },
    {
      name: "Hôm qua",
      items: yesterday.slice(0, 10),
    },
    {
      name: "7 ngày trước",
      items: days7Ago,
    },
  ];

  return groupedChats;
};


export const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];

