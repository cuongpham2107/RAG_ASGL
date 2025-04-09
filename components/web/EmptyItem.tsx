import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateFileDialog } from './Document/File/CreateFileDialog';
import { cn } from '@/lib/utils';

interface EmptyCardProps {
  title?: string;
  description?: string;
  isIcon?: boolean;
  parentId: string;
  fetchFiles: () => void;
  className?: string;
}
const EmptyCard = ({ 
  title = "No items found", 
  description = "Get started by creating your first item",
  isIcon = false,
  parentId,
  fetchFiles,
  className
}: EmptyCardProps) => {

  return (
    <Card className={cn("mx-auto border-none shadow-none  hover:border-none hover:shadow-none hover:rounded-none h-full", className)}>
      <CardHeader className='text-center mb-4'>
        <CardTitle className="text-xl font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center h-full">
        <div className="flex flex-col space-y-4 items-center justify-center px-4  -mt-32">
          {isIcon && <CreateFileDialog parentId={parentId ?? "0"} fetchFilesAction={fetchFiles} /> }
          <p className="text-sm text-gray-500 text-center">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmptyCard;