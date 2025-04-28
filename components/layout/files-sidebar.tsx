"use client"

import type React from "react"

import { useContext, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Upload, Download, Trash } from "lucide-react"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu"
import { ProjectContext } from "@/contexts/project-context"
import { useState } from "react"

export function FilesSidebar() {
  const {
    currentProject,
    activeFile,
    handleSelectFile,
    handleAddFile,
    handleUploadFile,
    handleSaveFile,
    handleRemoveFile,
  } = useContext(ProjectContext)

  const [newFileName, setNewFileName] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAddFileClick = () => {
    if (newFileName.trim()) {
      handleAddFile(newFileName.trim(), "")
      setNewFileName("")
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleUploadFile(file)
    }
  }

  // Ensure currentProject.files exists before trying to use it
  const files = currentProject?.files || {}

  return (
    <div className="w-48 md:w-64 border-r p-2 md:p-4 h-full flex flex-col">
      <h2 className="text-lg font-semibold mb-4">Files</h2>
      <ul className="space-y-2 flex-grow overflow-auto">
        {Object.keys(files).map((file) => (
          <li key={file}>
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <Button
                  variant={file === activeFile ? "secondary" : "ghost"}
                  className="w-full justify-start text-sm md:text-base truncate"
                  onClick={() => handleSelectFile(file)}
                >
                  {file}
                </Button>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onClick={() => handleSaveFile(file)}>
                  <Download className="mr-2 h-4 w-4" />
                  Save to PC
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleRemoveFile(file)}>
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
            onKeyPress={(e) => e.key === "Enter" && handleAddFileClick()}
          />
          <Button size="icon" onClick={handleAddFileClick}>
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
