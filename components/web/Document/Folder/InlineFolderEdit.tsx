import React, { useState, useRef, useEffect } from 'react';
import { Edit, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface InlineFolderEditProps {
  titleButton?: string;
  folderId: string;
  folderName: string;
  onUpdate: (folderId: string, newName: string) => void;
}

export function InlineFolderEdit({ 
  titleButton = "",
  folderId, 
  folderName = "", 
  onUpdate 
}: InlineFolderEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(folderName);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setName(folderName); // Reset to original name
    setIsEditing(false);
  };

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onUpdate && name.trim()) {
      onUpdate(folderId, name);
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (name.trim()) {
        onUpdate(folderId, name);
        setIsEditing(false);
      }
    } else if (e.key === 'Escape') {
      setName(folderName);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <Input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-8 py-1 px-2 text-sm"
          autoFocus
        />
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6" 
          onClick={handleSave}
        >
          <Check size={16} className="text-green-600" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6" 
          onClick={handleCancel}
        >
          <X size={16} className="text-red-600" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-row items-center gap-2" onClick={handleStartEdit}>
      <Edit size={16} className="text-black hover:text-sky-600 cursor-pointer sm:size-[20px]" />
      {titleButton}
    </div>
  );
}