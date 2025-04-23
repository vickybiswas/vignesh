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
import AddFilePopup from "./add-file-popup"

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
  const [addFilePopup, setAddFilePopup] = useState(false)

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
    setAddFilePopup(false)
  };


  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      onUploadFile(file)
    }
  }

  return (
    <div className="w-64 border-r p-4 h-full flex flex-col">
     <div className="flex justify-between items-center">
     <h2 className="text-lg font-semibold">Files</h2>
      <div>
      <Button size="icon" variant="outline" className="mr-2" onClick={() => setAddFilePopup(true)}>
          <Plus className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="outline" onClick={() => fileInputRef.current?.click()}>
          <Upload className="h-4 w-4" />
        </Button>
        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept=".txt,.md,.json" />
      </div>
     </div>
      <ul className="space-y-2 flex-grow overflow-auto">
        {files.map((file) => (
          <li key={file} className="flex items-center">
            <HoverCard openDelay={0} closeDelay={0}>
              <HoverCardTrigger asChild>
                <Button
                  variant={file === activeFile ? "secondary" : "ghost"}
                  className="w-full justify-between ct-20"
                  onClick={() => onSelectFile(file)}
                >
                  {file}
                </Button>
              </HoverCardTrigger>
              <HoverCardContent side="right" sideOffset="-7" align="end" className="bg-red-100">
                <Button
                  variant={"ghost"}
                  size="icon"
                  onClick={() => onSaveFile(file)}
                  className="hover:bg-black hover:text-white"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant={"ghost"}
                  size="icon"
                  onClick={() => onRemoveFile(file)}
                  className="hover:bg-black hover:text-white"
                >
                  <Trash className="h-4 w-4" />
                </Button>

              </HoverCardContent>
            </HoverCard>

          </li>
        ))}
      </ul>
      <AddFilePopup
        isOpen={addFilePopup}
        setIsOpen={setAddFilePopup}
        newFileName={newFileName}
        setNewFileName={setNewFileName}
        handleAddFile={handleAddFile}
        fileAddError={fileAddError}
      />
    </div>
  )
}
