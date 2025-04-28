"use client"

import { useState, useContext } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { ChevronRight, FolderPlus, Trash, Edit } from "lucide-react"
import { ProjectContext } from "@/contexts/project-context"

export function GroupManagement() {
  const {
    groups,
    currentProject,
    isNewGroupDialogOpen,
    setIsNewGroupDialogOpen,
    isEditGroupDialogOpen,
    setIsEditGroupDialogOpen,
    newGroupName,
    setNewGroupName,
    selectedGroupForEdit,
    setSelectedGroupForEdit,
    createGroup,
    deleteGroup,
    updateGroupMarks,
    getMarksByGroup,
  } = useContext(ProjectContext)

  const [selectedMarks, setSelectedMarks] = useState<string[]>([])

  const handleCreateGroup = () => {
    if (newGroupName.trim()) {
      createGroup(newGroupName)
      setNewGroupName("")
      setIsNewGroupDialogOpen(false)
    }
  }

  const handleEditGroup = (groupId: string) => {
    const group = currentProject.groups?.[groupId]
    if (group) {
      setSelectedGroupForEdit(groupId)
      setSelectedMarks(group.marks || [])
      setIsEditGroupDialogOpen(true)
    }
  }

  const handleSaveGroupEdit = () => {
    if (selectedGroupForEdit) {
      updateGroupMarks(selectedGroupForEdit, selectedMarks)
      setIsEditGroupDialogOpen(false)
      setSelectedGroupForEdit(null)
      setSelectedMarks([])
    }
  }

  // Get all available marks (tags and searches)
  const allMarks = Object.entries(currentProject.marks || {}).map(([id, mark]) => ({
    id,
    name: mark.name,
    type: mark.type,
    color: mark.color,
  }))

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Groups</CardTitle>
        <Button variant="outline" size="sm" onClick={() => setIsNewGroupDialogOpen(true)}>
          <FolderPlus className="h-4 w-4 mr-1" />
          New Group
        </Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[200px] pr-4">
          <div className="space-y-2">
            {groups.length === 0 ? (
              <div className="text-center text-muted-foreground py-4">No groups created yet</div>
            ) : (
              groups.map((group) => (
                <Collapsible key={group.id}>
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border bg-card p-4 text-left hover:bg-accent">
                    <div className="flex items-center gap-2">
                      <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                      <div className="h-3 w-3 rounded" style={{ backgroundColor: group.color }} />
                      <span className="font-semibold">{group.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditGroup(group.id)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteGroup(group.id)
                        }}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-2 pl-6">
                    {getMarksByGroup(group.id).length === 0 ? (
                      <div className="text-muted-foreground">No marks in this group</div>
                    ) : (
                      getMarksByGroup(group.id).map((mark) => (
                        <div key={mark.id} className="flex items-center gap-2 p-2 rounded-md border">
                          <div className="h-3 w-3 rounded" style={{ backgroundColor: mark.color }} />
                          <span>
                            {mark.type}: {mark.name}
                          </span>
                        </div>
                      ))
                    )}
                  </CollapsibleContent>
                </Collapsible>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>

      {/* New Group Dialog */}
      <Dialog open={isNewGroupDialogOpen} onOpenChange={setIsNewGroupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
          </DialogHeader>
          <div className="flex items-center space-x-2">
            <Input
              type="text"
              placeholder="Enter group name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
            />
            <Button onClick={handleCreateGroup}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={isEditGroupDialogOpen} onOpenChange={setIsEditGroupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm font-medium">Select marks to include in this group:</div>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {allMarks.map((mark) => (
                  <div key={mark.id} className="flex items-center space-x-2 p-2 rounded hover:bg-accent">
                    <Checkbox
                      id={`mark-${mark.id}`}
                      checked={selectedMarks.includes(mark.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedMarks([...selectedMarks, mark.id])
                        } else {
                          setSelectedMarks(selectedMarks.filter((id) => id !== mark.id))
                        }
                      }}
                    />
                    <label
                      htmlFor={`mark-${mark.id}`}
                      className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                    >
                      <div className="h-3 w-3 rounded" style={{ backgroundColor: mark.color }} />
                      <span>
                        {mark.type}: {mark.name}
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="flex justify-end">
              <Button onClick={handleSaveGroupEdit}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
