"use client"

import type React from "react"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Upload, Download, Trash } from "lucide-react"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu"

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
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAddFile = () => {
    if (newFileName.trim()) {
      onAddFile(newFileName.trim(), "")
      setNewFileName("")
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      onUploadFile(file)
    }
  }

  // Drag & drop handlers for uploading files
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    files.forEach((file) => onUploadFile(file))
  }, [onUploadFile])

  const handleContextMenu = useCallback((e: React.MouseEvent, fileName: string) => {
    e.preventDefault()
  }, [])

  return (
    <div
      className={`w-64 border-r p-4 h-full flex flex-col ${isDragging ? 'bg-blue-50' : ''}`}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <h2 className="text-lg font-semibold mb-4">Files</h2>
      <ul className="space-y-2 flex-grow overflow-auto">
        {files.map((file) => (
          <li key={file}>
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <Button
                  variant={file === activeFile ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => onSelectFile(file)}
                >
                  {file}
                </Button>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onClick={() => onSaveFile(file)}>
                  <Download className="mr-2 h-4 w-4" />
                  Save to PC
                </ContextMenuItem>
                <ContextMenuItem onClick={() => onRemoveFile(file)}>
                  <Trash className="mr-2 h-4 w-4" />
                  Remove
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
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
        <Button className="w-full" onClick={() => fileInputRef.current?.click()}>
          <Upload className="h-4 w-4 mr-2" />
          Upload File
        </Button>
        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept=".txt,.md,.json" />
      </div>
    </div>
  )
}
