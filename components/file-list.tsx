import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Upload } from "lucide-react"

interface FileListProps {
  files: string[]
  activeFile: string
  onSelectFile: (file: string) => void
  onAddFile: (fileName: string, content: string) => void
  onUploadFile: (file: File) => void
}

export function FileList({ files, activeFile, onSelectFile, onAddFile, onUploadFile }: FileListProps) {
  const [newFileName, setNewFileName] = useState("")
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

  return (
    <div className="w-64 border-r p-4 h-full flex flex-col">
      <h2 className="text-lg font-semibold mb-4">Files</h2>
      <ul className="space-y-2 flex-grow overflow-auto">
        {files.map((file) => (
          <li key={file}>
            <Button
              variant={file === activeFile ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => onSelectFile(file)}
            >
              {file}
            </Button>
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

