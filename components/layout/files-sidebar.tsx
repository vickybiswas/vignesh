"use client"

import type React from "react"

import { useContext, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Upload, Download, Trash } from "lucide-react"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu"
import { ProjectContext } from "@/contexts/project-context"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@radix-ui/react-hover-card"
import WarningPopup from "../warning-popup"
import { messages } from "@/utils/messages"
import AddFilePopup from "../add-file-popup"
import { addTxtExtension, validateFileName } from "@/lib/utils"

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
  const [deleteFilePopup, setDeleteFilePopup] = useState<string>("")
  const [addFilePopup, setAddFilePopup] = useState(false)
  const [fileAddError, setFileAddError] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAddFileClick = () => {
    const trimmedName = newFileName.trim();
    const validated = validateFileName(trimmedName);
    const fileNameWithTxt = addTxtExtension(trimmedName);
    if (!validated.isValid) {
      return setFileAddError(validated.error || '');
    }
    if (Boolean(files?.[fileNameWithTxt])) {
      return setFileAddError(messages.fileExistWithSameName);
    }

    handleAddFile(fileNameWithTxt, "");
    setNewFileName("");
    setFileAddError("");
    setAddFilePopup(false)
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleUploadFile(file)
    }
  }

  const handleRemove = (fileName: string) => {
    setDeleteFilePopup(fileName)
  };
  const handleRemoveFileConfirm=(file)=>{
    handleRemoveFile(file)
    setDeleteFilePopup("")
  }

  // Ensure currentProject.files exists before trying to use it
  // Track drag state for drop target highlighting
  const [isDragging, setIsDragging] = useState(false)
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
    Array.from(e.dataTransfer.files).forEach((file) => handleUploadFile(file))
  }, [handleUploadFile])
  
  const files = currentProject?.files || {}

  return (
    <div
      className={
        `border-r p-2 md:p-4 h-full flex flex-col overflow-auto min-h-0 ${isDragging ? 'bg-blue-50 border-dashed border-blue-300' : ''}`
      }
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
         <div className="flex justify-between items-center">
      <h2 className="text-lg font-semibold mb-4">Files</h2>
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
      <ul className="space-y-2 flex-grow overflow-auto min-h-0">
        {Object.keys(files).map((file) => (
          <li key={file} className="flex items-center">
          <HoverCard openDelay={0} closeDelay={0}>
            <HoverCardTrigger asChild>
              <Button
                variant={file === activeFile ? "secondary" : "ghost"}
                className="w-full justify-between ct-20"
                onClick={() => handleSelectFile(file)}
              >
                {file}
              </Button>
            </HoverCardTrigger>
            <HoverCardContent side="right" sideOffset="-7" align="end" className="bg-red-100">
              <Button
                variant={"ghost"}
                size="icon"
                onClick={() => handleSaveFile(file)}
                className="hover:bg-black hover:text-white"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant={"ghost"}
                size="icon"
                onClick={() => handleRemove(file)}
                className="hover:bg-black hover:text-white"
              >
                <Trash className="h-4 w-4" />
              </Button>

            </HoverCardContent>
          </HoverCard>

        </li>
        ))}
      </ul>
      {/* <div className="mt-4 space-y-2">
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
      </div> */}
      <WarningPopup
        isOpen = {deleteFilePopup}
        setIsOpen = {setDeleteFilePopup}
        warningMessage = {messages.deleteFileWarningMessage}
        onConfirm = {()=>handleRemoveFileConfirm(deleteFilePopup)}
      />
      <AddFilePopup
        isOpen={addFilePopup}
        setIsOpen={setAddFilePopup}
        newFileName={newFileName}
        setNewFileName={setNewFileName}
        handleAddFile={handleAddFileClick}
        fileAddError={fileAddError}
      />
    </div>
  )
}
