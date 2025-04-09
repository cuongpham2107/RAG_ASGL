"use client";

import { ArrowLeft, Download, Trash } from "lucide-react";
import { useEffect } from "react";
import EmptyCard from "../EmptyItem";
import { Button } from "@/components/ui/button";
import SearchIcon from "../ui/search-icon";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import FileItem from "./File/FileItem";
import FolderItem from "./Folder/FolderItem";
import { Checkbox } from "@/components/ui/checkbox";
import { useDocument } from "@/hooks/use-document";

export function FolderTree() {
  // Use the document hook
  const {
    folders,
    files,
    search,
    setSearch,
    currentFolder,
    selectedFiles,
    fetchFolders,
    fetchFiles,
    handleChangeFolder,
    handleBackFolder,
    handleDeleteFolder,
    handleUpdateFolder,
    handleDeleteFiles,
    handleFileDownload,
    handleSelectAllFiles,
    handleBulkDownload,
    handleBulkDelete,
    clearSelection,
  } = useDocument();

  // Effect hooks
  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // Render function for table view
  const renderTableView = () => {
    return (
      <div className="rounded-lg border border-indigo-100 overflow-hidden">
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-sky-50 hover:bg-sky-100">
                <TableHead className="w-12 py-3 font-medium">
                  {files.length > 0 && (
                    <Checkbox
                      checked={
                        selectedFiles.length > 0 &&
                        selectedFiles.length === files.length
                      }
                      onCheckedChange={(checked) => {
                        if (checked) {
                          handleSelectAllFiles();
                        } else {
                          clearSelection();
                        }
                      }}
                    />
                  )}
                </TableHead>
                <TableHead className="font-medium text-black">Tên</TableHead>
                <TableHead className="hidden md:table-cell font-medium text-black">Kích thước</TableHead>
                <TableHead className="hidden sm:table-cell font-medium text-black">Ngày tạo</TableHead>
                <TableHead className="w-16 text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {folders.map((folder) => (
                <FolderItem
                  key={folder.id}
                  folder={folder}
                  onDelete={handleDeleteFolder}
                  onUpdate={handleUpdateFolder}
                  onChangeFolder={handleChangeFolder}
                  useLocalNavigation={true}
                />
              ))}
              {files.map((file) => (
                <FileItem
                  key={file.id}
                  file={file}
                  allFiles={files}
                  onDelete={handleDeleteFiles}
                  onDownload={handleFileDownload}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    const hasContent = folders.length > 0 || files.length > 0;

    if (!hasContent && !search) {
      return (
        <EmptyCard
          title={currentFolder ? "Thư mục trống" : "Chưa có thư mục nào"}
          description={
            currentFolder
              ? "Chưa có tài liệu nào trong thư mục này"
              : "Chưa có thư mục nào"
          }
          isIcon={true}
          parentId={currentFolder?.id ?? "0"}
          fetchFiles={fetchFiles}
          className="py-12 px-4"
        />
      );
    }

    if (!hasContent && search) {
      return (
        <EmptyCard
          title="Không tìm thấy"
          description="Không tìm thấy thư mục hoặc tệp nào"
          isIcon={false}
          parentId={currentFolder?.id ?? "0"}
          fetchFiles={fetchFiles}
          className="py-12 px-4"
        />
      );
    }

    return renderTableView();
  };

  // Main render
  return (
    <div className="flex flex-1 flex-col gap-2 sm:gap-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 sm:p-4">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          {currentFolder ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={handleBackFolder}
                className="hover:bg-gray-100"
              >
                <ArrowLeft className="w-4 h-4 text-blue-600" />
              </Button>
              <h3 className="text-base sm:text-lg md:text-xl font-medium text-gray-800 truncate max-w-[180px] sm:max-w-xs md:max-w-md">
                {currentFolder.name}
              </h3>
            </div>
          ) : (
            <h3 className="text-xl font-medium text-gray-800">Tài liệu của bạn</h3>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2 sm:gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {selectedFiles.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkDownload}
                  className="flex items-center gap-1.5 h-9"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden xs:inline">Tải xuống</span>
                  <span className="bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5 text-xs">
                    {selectedFiles.length}
                  </span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="flex items-center gap-1.5 text-red-500 hover:bg-red-50 hover:text-red-600 border-red-200 h-9"
                >
                  <Trash className="w-4 h-4" />
                  <span className="hidden xs:inline">Xoá</span>
                  <span className="bg-red-100 text-red-700 rounded-full px-1.5 py-0.5 text-xs">
                    {selectedFiles.length}
                  </span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  className="text-gray-500 h-9"
                >
                  Bỏ chọn
                </Button>
              </>
            )}
          </div>
          <div className="w-full sm:w-auto mt-2 sm:mt-0">
            <SearchIcon search={search} setSearch={setSearch} />
          </div>
        </div>
        
        <div className="h-full">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
