"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Search, FileArchive, Folder } from "lucide-react";
import { useRouter } from "next/navigation";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { getAllFiles, getFilesRecent } from "@/lib/api/file";
import { File } from "@/lib/types";

// VisuallyHidden component for accessibility
const VisuallyHidden = ({ children }: { children: React.ReactNode }) => {
  return (
    <span
      className="absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0"
      style={{ clip: "rect(0, 0, 0, 0)" }}
    >
      {children}
    </span>
  );
};

type SearchResult = {
  id: string;
  name: string;
  path: string;
  type: "file" | "folder";
};

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Real API search function
  const performSearch = async (searchQuery: string) => {
    setIsLoading(true);
    
    try {
      if (!searchQuery.trim()) {
        // Get recent files when search input is empty
        const recentFiles = await getFilesRecent();
        setResults(recentFiles.map((item: File) =>
          ({
            id: item.id.toString(),
            name: item.name,
            path: `/document/${item.folder_id}`,
            type: 'file' as const
          })));
      } else {
        // Search for files when there's a query
        const searchResponse = await getAllFiles(searchQuery, 1, 10);
        
        // Map API response to SearchResult format and directly set the results
        const formattedResults = searchResponse.map((item: File) => ({
          id: item.id.toString(),
          name: item.name,
          path: `/document/${item.folder_id}`,
          type: 'file' as const
        }));
        
        setResults(formattedResults);
      }
      
    } catch (error) {
      console.error("Search failed:", error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    router.push(result.path);
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(query);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setOpen(true);
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <Button 
        variant="outline" 
        className="relative h-9 w-9 p-0 xl:h-9 xl:w-auto xl:px-3 xl:py-2 border border-input bg-background"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4 xl:mr-2" />
        <kbd className="hidden xl:pointer-events-none xl:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground ml-auto">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[550px] p-0 gap-0 mt-8 border border-border/50 shadow-lg rounded-xl overflow-hidden bg-background/95 backdrop-blur-sm">
          <DialogHeader className="px-2">
            <VisuallyHidden>
              <DialogTitle>Tìm kiếm tài liệu</DialogTitle>
            </VisuallyHidden>
          </DialogHeader>
          <Command className="rounded-lg border-none shadow-none">
            <CommandInput 
              placeholder="Tìm kiếm tài liệu, thư mục..." 
              value={query}
              onValueChange={setQuery}
              className="h-12 border-none focus:ring-0"
            />
            <CommandList>
              {/* {results.length > 0 && (
                <div className="px-2 text-xs text-muted-foreground">
                  {results.length} kết quả tìm thấy
                </div>
              )} */}
              <CommandEmpty className="py-6 text-center text-muted-foreground">Không tìm thấy kết quả</CommandEmpty>
              <CommandGroup heading={query ? "Kết quả tìm kiếm" : "Tài liệu gần đây"} className="px-2 pb-2">
                {isLoading ? (
                  <div className="p-6 flex items-center justify-center text-muted-foreground">
                    <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
                    <span className="ml-2">Đang tìm kiếm...</span>
                  </div>
                ) : results.length > 0 ? (
                  results.map((result) => (
                    <CommandItem 
                      key={result.id}
                      onSelect={() => handleSelect(result)}
                      className="cursor-pointer py-3 rounded-lg hover:bg-accent/80 transition-colors"
                      value={result.name}
                    >
                      <div className="mr-3 flex items-center justify-center">
                        {result.type === 'file' ? (
                          <FileArchive className="h-4 w-4 text-blue-500" />
                        ) : (
                          <Folder className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <div className="font-medium">{result.name}</div>
                        <div className="text-xs text-muted-foreground">{result.path}</div>
                      </div>
                    </CommandItem>
                  ))
                ) : (
                  <div className="py-6 text-center text-muted-foreground">
                    Không có kết quả nào để hiển thị
                  </div>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
