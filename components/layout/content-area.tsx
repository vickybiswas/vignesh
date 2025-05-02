"use client"

import { useContext, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Search, Save, X, BookOpen } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ProjectContext } from "@/contexts/project-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export function ContentArea() {
  const {
    currentProject,
    activeFile,
    currentFile,
    selectedTagFilter,
    searchTerm,
    setSearchTerm,
    handleTagFilterChange,
    handleContentChange,
    handleContextMenu,
    contextMenuPosition,
    setContextMenuPosition,
    uniqueTagLabels,
    addTag,
    handleNewTag,
    isNewTagDialogOpen,
    setIsNewTagDialogOpen,
    newTagLabel,
    setNewTagLabel,
    submitNewTag,
    renderContent,
    handleSearch,
    saveSearch,
    fetchSynonyms,
    searchResults,
    savedSearches,
    contentRef,
  } = useContext(ProjectContext)
  const [isEditing, setIsEditing] = useState<boolean>(false)

  // Ensure we have valid objects
  const marks = currentProject?.marks || {}
  const tagLabels = uniqueTagLabels || []

  return (
    <div id="content-area" className="flex-grow flex flex-col p-2 md:p-4 overflow-hidden">
      <div className="mb-4 flex flex-col md:flex-row gap-2">
        <Select value={selectedTagFilter} onValueChange={handleTagFilterChange}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Filter tags..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tags</SelectItem>
            {tagLabels.map((label) => (
              <SelectItem key={label} value={label} className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded inline-block mr-2`}
                  style={{
                    backgroundColor: Object.values(marks).find((mark) => mark.type === "Tag" && mark.name === label)
                      ?.color,
                  }}
                />
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-8"
            />
            {searchTerm && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={() => setSearchTerm("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        <Button type="submit" variant="ghost" size="icon">
          <Search className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={saveSearch}
          disabled={
            !searchTerm ||
            (searchResults?.length || 0) === 0 ||
            savedSearches?.some((s) => s.name.toLowerCase() === searchTerm.toLowerCase()) ||
            false
          }
        >
          <Save className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={fetchSynonyms}
          disabled={!searchTerm}
          title="Find synonyms"
        >
          <BookOpen className="h-4 w-4" />
        </Button>
        </form>
      </div>
      {isEditing ? (
        <Textarea
          className="text-lg p-4 border rounded whitespace-pre-wrap h-full w-full overflow-auto font-mono"
          value={currentFile?.content || ""}
          onChange={(e) => handleContentChange(e.target.value)}
          onBlur={() => setIsEditing(false)}
          autoFocus
        />
        ) : (
        <div
          ref={contentRef}
          className="text-lg p-4 border rounded relative whitespace-pre-wrap h-full overflow-auto"
          onClick={(e) => { if (e.detail === 3) setIsEditing(true); }}
          onContextMenu={handleContextMenu}
          tabIndex={0}
        >
          {currentFile?.content ? renderContent() : null}
        </div>
      )}

      {/* Context Menu for Adding Tags */}
      <DropdownMenu open={!!contextMenuPosition} onOpenChange={() => setContextMenuPosition(null)}>
        <DropdownMenuTrigger asChild>
          <div
            style={{
              position: "fixed",
              left: contextMenuPosition?.x ?? 0,
              top: contextMenuPosition?.y ?? 0,
            }}
            onContextMenu={handleContextMenu}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {tagLabels.map((label) => (
            <DropdownMenuItem key={label} onSelect={() => addTag(label)} className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded`}
                style={{
                  backgroundColor: Object.values(marks).find((mark) => mark.type === "Tag" && mark.name === label)
                    ?.color,
                }}
              />
              {label}
            </DropdownMenuItem>
          ))}
          {tagLabels.length > 0 && <DropdownMenuSeparator />}
          <DropdownMenuItem onSelect={handleNewTag}>New Tag...</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* New Tag Dialog */}
      <Dialog open={isNewTagDialogOpen} onOpenChange={setIsNewTagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Tag</DialogTitle>
          </DialogHeader>
          <div className="flex items-center space-x-2">
            <Input
              type="text"
              placeholder="Enter new tag label"
              value={newTagLabel}
              onChange={(e) => setNewTagLabel(e.target.value)}
            />
            <Button onClick={submitNewTag}>Add</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
