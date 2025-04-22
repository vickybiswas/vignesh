"use client"

import type React from "react"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Upload, Download, Trash } from "lucide-react"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu"
import { messages } from "@/utils/messages"
import { addTxtExtension, validateFileName } from "@/lib/utils"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@radix-ui/react-hover-card"

interface FileListProps {
  files: string[]
  activeFile: string
  onSelectFile: (file: string) => void
  onAddFile: (fileName: string, content: string) => void
  onUploadFile: (file: File) => void
  onSaveFile: (fileName: string) => void
  onRemoveFile: (fileName: string) => void
}

export function FileList({
  files,
  activeFile,
  onSelectFile,
  onAddFile,
  onUploadFile,
  onSaveFile,
  onRemoveFile,
}: FileListProps) {
  const [newFileName, setNewFileName] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileAddError, setFileAddError] = useState<string>("")
  const handleAddFile = () => {
    const trimmedName = newFileName.trim();
    const validated = validateFileName(trimmedName);
    const fileNameWithTxt = addTxtExtension(trimmedName);

    if (!validated.isValid) {
      return setFileAddError(validated.error || '');
    }
    if (files.includes(fileNameWithTxt)) {
      return setFileAddError(messages.fileExistWithSameName);
    }

    onAddFile(fileNameWithTxt, "");
    setNewFileName("");
    setFileAddError("");
  };


  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      onUploadFile(file)
    }
  }

  return (
    <div className="w-64 border-r p-4 h-full flex flex-col">
      <h2 className="text-lg font-semibold mb-4">Files</h2>
      <ul className="space-y-2 flex-grow overflow-auto">
        {files.map((file) => (
          <li key={file} className="flex items-center">
            <HoverCard>
              <HoverCardTrigger asChild>
                <Button
                  variant={file === activeFile ? "secondary" : "ghost"}
                  className="w-full justify-between ct-20"
                  onClick={() => onSelectFile(file)}
                >
                  {file}
                </Button>
              </HoverCardTrigger>
              <HoverCardContent className="text-right w-full">
                <Button
                  variant={"ghost"}
                  size="icon"
                  onClick={() => onSaveFile(file)}
                >
                  <Download className="h-4 w-4" /> 
                </Button>
                <Button
                  variant={"ghost"}
                  size="icon"
                  onClick={() => onRemoveFile(file)}
                >
                  <Trash className="h-4 w-4" /> 
                </Button>

              </HoverCardContent>
            </HoverCard>

          </li>
        ))}
      </ul>
      <div className="mt-4 space-y-2">
        <div className="flex items-center space-x-2">
          <Input
            type="text"
            placeholder="New file name"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleAddFile()}
          />
          <Button size="icon" onClick={handleAddFile}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {fileAddError && <div className="text-red-600">{fileAddError}</div>}
        <Button className="w-full" onClick={() => fileInputRef.current?.click()}>
          <Upload className="h-4 w-4 mr-2" />
          Upload File
        </Button>
        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept=".txt,.md,.json" />
      </div>
    </div>
  )
}
