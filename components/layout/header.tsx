"use client"

import { useState, useContext } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { UserDropdown } from "../user-dropdown"
import { Table, Download, Upload, Edit, Plus, ChevronDown } from "lucide-react"
import { ProjectContext } from "@/contexts/project-context"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function Header() {
  const {
    projectName,
    projectNames,
    setProjectName,
    handleDownloadState,
    handleUploadState,
    showTabulationView,
    setShowTabulationView,
    fileInputRef,
    createNewProject,
    switchProject,
  } = useContext(ProjectContext)

  const [isProjectNameDialogOpen, setIsProjectNameDialogOpen] = useState<boolean>(false)
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState<boolean>(false)
  const [editedProjectName, setEditedProjectName] = useState<string>(projectName)
  const [newProjectName, setNewProjectName] = useState<string>("")

  const handleProjectNameChange = () => {
    if (editedProjectName.trim()) {
      setProjectName(editedProjectName)
    }
    setIsProjectNameDialogOpen(false)
  }

  const handleCreateNewProject = () => {
    if (newProjectName.trim()) {
      createNewProject(newProjectName)
    }
    setIsNewProjectDialogOpen(false)
    setNewProjectName("")
  }

  return (
    <div className="border-b p-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <span className="font-bold">{projectName}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {projectNames.map((name) => (
                <DropdownMenuItem key={name} onClick={() => switchProject(name)}>
                  {name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setEditedProjectName(projectName)
              setIsProjectNameDialogOpen(true)
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="ml-2" onClick={() => setIsNewProjectDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Project
          </Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={() => setShowTabulationView(true)}>
            <Table className="h-4 w-4 mr-2" />
            Tabulate
          </Button>
          <Button onClick={handleDownloadState}>
            <Download className="h-4 w-4 mr-2" />
            Download Project
          </Button>
          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Project
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUploadState}
            style={{ display: "none" }}
            accept=".json"
          />
          <UserDropdown />
        </div>
      </div>

      {/* Project Name Dialog */}
      <Dialog open={isProjectNameDialogOpen} onOpenChange={setIsProjectNameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project Name</DialogTitle>
          </DialogHeader>
          <div className="flex items-center space-x-2">
            <Input
              type="text"
              placeholder="Enter project name"
              value={editedProjectName}
              onChange={(e) => setEditedProjectName(e.target.value)}
            />
            <Button onClick={handleProjectNameChange}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Project Dialog */}
      <Dialog open={isNewProjectDialogOpen} onOpenChange={setIsNewProjectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <div className="flex items-center space-x-2">
            <Input
              type="text"
              placeholder="Enter new project name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
            />
            <Button onClick={handleCreateNewProject}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
