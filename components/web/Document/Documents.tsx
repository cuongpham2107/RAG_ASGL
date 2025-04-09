"use client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEffect } from "react";
import SearchIcon from "../ui/search-icon";
import { CreateFolderDialog } from "./Folder/CreateFolderDialog";
import { CreateFileDialog } from "./File/CreateFileDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

import EmptyCard from "../EmptyItem";
import { useDocument } from "@/hooks/use-document";
import FolderItem from "./Folder/FolderItem";
import FileItem from "./File/FileItem";
import { useFileDownload } from "@/hooks/use-file-download";

interface DocumentProps {
  id: string;
}

export default function DocumentsComponent({ id }: DocumentProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Use the document hook with initial folder ID
  const {
    folders,
    files,
    search,
    setSearch,
    isLoading,
    fetchFolders,
    fetchFiles,
    handleDeleteFolder,
    handleUpdateFolder,
    handleDeleteFiles,
    handleFileDownload,
    setNullFiles,
  } = useDocument({ initialFolderId: id });
  const { handleFileView } = useFileDownload();
  // Function to handle going back to parent folder
  const handleBack = () => {
    if (pathname.startsWith('/document/')) {
      // Extract current path segments
      const segments = pathname.split('/').filter(Boolean);
      // Remove 'document' from the path
      segments.shift();
      
      // If we have more than one segment, go back to parent
      if (segments.length > 1) {
        // Remove the last segment (current folder)
        segments.pop();
        router.push(`/document/${segments.join('/')}`);
      } else {
        // If we're at the root level of documents, go to home or documents root
        router.push('/document');
      }
    }
  };

  // Check if we should show the back button
  const showBackButton = pathname.startsWith('/document/') && 
    pathname.split('/').filter(Boolean).length > 2;
  
  useEffect(() => {
    fetchFolders();
    fetchFiles();
    setNullFiles();
  }, [fetchFolders, fetchFiles, setNullFiles]);

  const renderRowFolder = () => {
    if (!isLoading && folders.length === 0 && files.length === 0) {
      return (
        <TableRow>
          <TableCell
            colSpan={5}
            className="h-[300px] hover:bg-none hover:border-none p-0"
          >
            <EmptyCard
              title="Thư mục trống"
              description="Chưa có tài liệu nào trong thư mục này"
              isIcon={true}
              parentId={id}
              fetchFiles={fetchFiles}
              className="py-12 px-4"
            />
          </TableCell>
        </TableRow>
      );
    }

    return (
      folders.length > 0 &&
      folders.map((folder) => (
        <FolderItem 
          key={folder.id}
          folder={folder}
          onDelete={handleDeleteFolder}
          onUpdate={handleUpdateFolder}
        />
      ))
    );
  };

  const renderRowFile = () => {
    return (
      files.length > 0 &&
      files.map((file) => (
        <FileItem
          key={file.id}
          file={file}
          allFiles={files}
          onDelete={handleDeleteFiles}
          onDownload={handleFileDownload}
          onView={handleFileView}
        />
      ))
    );
  };

  const renderLoadingSkeleton = () => {
    return Array(3).fill(0).map((_, index) => (
      <TableRow key={index}>
        <TableCell className="py-3">
          <Skeleton className="h-4 w-4" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-5 w-1/2" />
        </TableCell>
        <TableCell className="hidden md:table-cell">
          <Skeleton className="h-4 w-1/4" />
        </TableCell>
        <TableCell className="hidden sm:table-cell">
          <Skeleton className="h-4 w-1/4" />
        </TableCell>
        <TableCell className="text-right">
          <Skeleton className="h-4 w-8 ml-auto" />
        </TableCell>
      </TableRow>
    ));
  };

  return (
    <div className="flex flex-col space-y-4 p-2 md:p-4 bg-white rounded-lg shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-2">
        <div className="flex flex-row items-center space-x-2">
          {showBackButton && (
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleBack}
              className="mr-1"
              title="Quay lại thư mục cha"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="flex flex-wrap gap-2">
            <CreateFolderDialog
              parentId={id}
              fetchFoldersAction={fetchFolders}
              fetchFilesAction={fetchFiles}
            />
            <CreateFileDialog parentId={id} fetchFilesAction={fetchFiles} />
          </div>
        </div>
        <div className="w-full sm:w-auto mt-2 sm:mt-0">
          <SearchIcon search={search} setSearch={setSearch} />
        </div>
      </div>
      
      <div className="rounded-lg border border-indigo-100 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-sky-50 hover:bg-sky-100">
                <TableHead className="w-[50px] py-3 font-medium"></TableHead>
                <TableHead className="w-[80px] py-3 font-medium"></TableHead>
                <TableHead className="font-medium text-black">
                  Tên
                </TableHead>
                <TableHead className="hidden md:table-cell font-medium text-black">
                  Kích thước
                </TableHead>
                <TableHead className="hidden sm:table-cell font-medium text-black">
                  Ngày tạo
                </TableHead>
                <TableHead className="text-right w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? renderLoadingSkeleton() : (
                <>
                  {renderRowFolder()}
                  {renderRowFile()}
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
