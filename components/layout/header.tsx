"use client"

import { useState, useContext } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { UserDropdown } from "../user-dropdown"
import { Table, Download, Upload, Plus, ChevronDown } from "lucide-react"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { ProjectContext } from "@/contexts/project-context"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from "@/components/ui/dropdown-menu"

export function Header() {
  const {
    projectName,
    projectNames,
    handleDownloadState,
    handleUploadState,
    showTabulationView,
    setShowTabulationView,
    fileInputRef,
    createNewProject,
    switchProject,
    updateProjectName,
    deleteProject,
  } = useContext(ProjectContext)

  const [isProjectNameDialogOpen, setIsProjectNameDialogOpen] = useState<boolean>(false)
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState<boolean>(false)
  const [editedProjectName, setEditedProjectName] = useState<string>(projectName)
  const [newProjectName, setNewProjectName] = useState<string>("")
  const [renameTarget, setRenameTarget] = useState<string | null>(null)

  const handleProjectNameChange = () => {
    if (editedProjectName.trim() && renameTarget) {
      updateProjectName(renameTarget, editedProjectName.trim())
    }
    setIsProjectNameDialogOpen(false)
    setRenameTarget(null)
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
      <TooltipProvider>
        <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">QDA Project: </h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <span className="font-bold">{projectName}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {projectNames.map((name) => (
                <DropdownMenuSub key={name}>
                  <DropdownMenuSubTrigger>{name}</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {name !== projectName && (
                      <DropdownMenuItem onClick={() => switchProject(name)}>
                        Switch to {name}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => {
                        setRenameTarget(name)
                        setEditedProjectName(name)
                        setIsProjectNameDialogOpen(true)
                      }}
                    >
                      Edit Project Name
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => deleteProject(name)}>
                      Delete Project
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => setIsNewProjectDialogOpen(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Add Project</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleDownloadState}>
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Download Project</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Upload Project</TooltipContent>
            </Tooltip>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleUploadState}
              style={{ display: "none" }}
              accept=".json"
            />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => setShowTabulationView(true)}>
                <Table className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Tabulate</TooltipContent>
          </Tooltip>
        </div>
          <div className="flex items-center gap-2 flex-wrap">
            <UserDropdown />
          </div>
      </div>
      </TooltipProvider>

      {/* Project Name Dialog */}
      <Dialog open={isProjectNameDialogOpen} onOpenChange={(open) => { setIsProjectNameDialogOpen(open); if (!open) setRenameTarget(null); }}>
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
