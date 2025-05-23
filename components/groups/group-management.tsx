"use client"

import { useState, useContext, useEffect } from "react"
import { ProjectContext } from "@/contexts/project-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Edit, Trash2, Tag, Search, Save } from "lucide-react"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"

export function GroupManagement() {
  const {
    groups,
    currentProject,
    newGroupName,
    setNewGroupName,
    isNewGroupDialogOpen,
    setIsNewGroupDialogOpen,
    isEditGroupDialogOpen,
    setIsEditGroupDialogOpen,
    selectedGroupForEdit,
    setSelectedGroupForEdit,
    createGroup,
    deleteGroup,
    getMarksByGroup,
    updateGroupMarks,
    saveGroupAsTag,
  } = useContext(ProjectContext)

  const [availableMarks, setAvailableMarks] = useState<Array<{ id: string; name: string; type: "Tag" | "Search" }>>([])
  const [selectedMarks, setSelectedMarks] = useState<string[]>([])

  // Get all available marks (tags and searches)
  useEffect(() => {
    const marks: Array<{ id: string; name: string; type: "Tag" | "Search" }> = []

    // Add tags
    Object.entries(currentProject.marks || {}).forEach(([id, mark]) => {
      marks.push({
        id,
        name: mark.name,
        type: mark.type,
      })
    })

    setAvailableMarks(marks)
  }, [currentProject.marks])

  // Load selected marks when editing a group
  useEffect(() => {
    if (selectedGroupForEdit && isEditGroupDialogOpen) {
      const groupMarks = getMarksByGroup(selectedGroupForEdit)
      setSelectedMarks(groupMarks.map((mark) => mark.id))
    } else {
      setSelectedMarks([])
    }
  }, [selectedGroupForEdit, isEditGroupDialogOpen, getMarksByGroup])

  const handleCreateGroup = () => {
    if (newGroupName.trim()) {
      createGroup(newGroupName)
      setNewGroupName("")
      setIsNewGroupDialogOpen(false)
    }
  }

  const handleUpdateGroup = () => {
    if (selectedGroupForEdit) {
      updateGroupMarks(selectedGroupForEdit, selectedMarks)
      setIsEditGroupDialogOpen(false)
      setSelectedGroupForEdit(null)
    }
  }

  const handleDeleteGroup = (groupId: string) => {
    if (confirm("Are you sure you want to delete this group?")) {
      deleteGroup(groupId)
    }
  }

  const handleEditGroup = (groupId: string) => {
    setSelectedGroupForEdit(groupId)
    setIsEditGroupDialogOpen(true)
  }

  const toggleMarkSelection = (markId: string) => {
    setSelectedMarks((prev) => (prev.includes(markId) ? prev.filter((id) => id !== markId) : [...prev, markId]))
  }

  // Save Group as Tag state and handlers
  const [isSaveTagDialogOpen, setIsSaveTagDialogOpen] = useState(false)
  const [selectedGroupForSave, setSelectedGroupForSave] = useState<string | null>(null)
  const [saveTagName, setSaveTagName] = useState("")
  const [saveTagError, setSaveTagError] = useState("")

  const handleSaveGroup = (groupId: string) => {
    setSelectedGroupForSave(groupId)
    setSaveTagName("")
    setSaveTagError("")
    setIsSaveTagDialogOpen(true)
  }

  const handleConfirmSaveTag = () => {
    if (selectedGroupForSave && saveTagName.trim()) {
      const name = saveTagName.trim()
      // Check for duplicate tag name
      const exists = availableMarks
        .filter((m) => m.type === "Tag")
        .some((m) => m.name.toLowerCase() === name.toLowerCase())
      if (exists) {
        setSaveTagError("A tag with this name already exists. Please choose a different name.")
        return
      }
      saveGroupAsTag(selectedGroupForSave, name)
      setIsSaveTagDialogOpen(false)
    }
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Groups</span>
            <Button size="sm" onClick={() => setIsNewGroupDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              New Group
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] pr-4">
            {groups.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <p>No groups created yet.</p>
                <p className="text-sm">Create a group to organize your tags and searches.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {groups.map((group) => {
                  const groupMarks = getMarksByGroup(group.id)
                  const tagCount = groupMarks.filter((mark) => mark.type === "Tag").length
                  const searchCount = groupMarks.filter((mark) => mark.type === "Search").length

                  return (
                    <div
                      key={group.id}
                      className="rounded-lg border p-4 hover:bg-accent/5 transition-colors"
                      style={{ borderLeftColor: group.color, borderLeftWidth: "4px" }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{group.name}</h3>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditGroup(group.id)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {/* Save this group as a tag */}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleSaveGroup(group.id)}
                                >
                                  <Save className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">Save this Group as a Tag</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDeleteGroup(group.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex gap-3 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <Tag className="h-3.5 w-3.5 mr-1" />
                          {tagCount} {tagCount === 1 ? "tag" : "tags"}
                        </div>
                        <div className="flex items-center">
                          <Search className="h-3.5 w-3.5 mr-1" />
                          {searchCount} {searchCount === 1 ? "search" : "searches"}
                        </div>
                      </div>
                      {groupMarks.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {groupMarks.map((mark) => (
                            <div
                              key={mark.id}
                              className="inline-flex items-center rounded-full px-2 py-0.5 text-xs"
                              style={{ backgroundColor: mark.color, color: "#fff" }}
                            >
                              {mark.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* New Group Dialog */}
      <Dialog open={isNewGroupDialogOpen} onOpenChange={setIsNewGroupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input placeholder="Group name" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewGroupDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateGroup} disabled={!newGroupName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={isEditGroupDialogOpen} onOpenChange={setIsEditGroupDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="tags">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="tags">Tags</TabsTrigger>
              <TabsTrigger value="searches">Searches</TabsTrigger>
            </TabsList>
            <TabsContent value="tags" className="mt-4">
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {availableMarks
                    .filter((mark) => mark.type === "Tag")
                    .map((mark) => (
                      <div key={mark.id} className="flex items-center space-x-2 p-2 rounded hover:bg-accent">
                        <Checkbox
                          id={`tag-${mark.id}`}
                          checked={selectedMarks.includes(mark.id)}
                          onCheckedChange={() => toggleMarkSelection(mark.id)}
                        />
                        <label
                          htmlFor={`tag-${mark.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                        >
                          {mark.name}
                        </label>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="searches" className="mt-4">
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {availableMarks
                    .filter((mark) => mark.type === "Search")
                    .map((mark) => (
                      <div key={mark.id} className="flex items-center space-x-2 p-2 rounded hover:bg-accent">
                        <Checkbox
                          id={`search-${mark.id}`}
                          checked={selectedMarks.includes(mark.id)}
                          onCheckedChange={() => toggleMarkSelection(mark.id)}
                        />
                        <label
                          htmlFor={`search-${mark.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                        >
                          {mark.name}
                        </label>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditGroupDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateGroup}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Save Group as Tag Dialog */}
      <Dialog open={isSaveTagDialogOpen} onOpenChange={setIsSaveTagDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Save Group as Tag</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Tag name"
              value={saveTagName}
              onChange={(e) => { setSaveTagName(e.target.value); if (saveTagError) setSaveTagError(""); }}
            />
            {saveTagError && <p className="text-destructive text-sm mt-1">{saveTagError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveTagDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmSaveTag} disabled={!saveTagName.trim()}>
              Save Tag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
