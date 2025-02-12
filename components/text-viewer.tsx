"use client"

import type React from "react"
import { useState, useCallback, useMemo, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TagAnalysis } from "./tag-analysis"
import { SearchAnalysis } from "./search-analysis"
import { TabulationView } from "./tabulation-view"
import { FileList } from "./file-list"
import { UserDropdown } from "./user-dropdown"
import { HighlightedTextViewer } from "./highlighted-text-viewer"
import { Search, Save, Table, X } from "lucide-react"

interface Tag {
  id: number
  text: string
  start: number
  end: number
  label: string
  color: string
}

interface FileData {
  content: string
  tags: Tag[]
}

interface SearchResult {
  text: string
  start: number
  end: number
}

const TAG_COLORS = [
  "bg-yellow-200",
  "bg-blue-200",
  "bg-green-200",
  "bg-pink-200",
  "bg-purple-200",
  "bg-orange-200",
  "bg-red-200",
  "bg-indigo-200",
]

export default function TextViewer() {
  const [files, setFiles] = useState<Record<string, FileData>>({
    "sample.txt": {
      content:
        "This is a sample text. You can right-click on any part of this text to add tags to it, including overlapping tags.",
      tags: [],
    },
  })
  const [activeFile, setActiveFile] = useState<string>("sample.txt")
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null)
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null)
  const [newTagLabel, setNewTagLabel] = useState<string>("")
  const [isNewTagDialogOpen, setIsNewTagDialogOpen] = useState<boolean>(false)
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [savedSearches, setSavedSearches] = useState<string[]>([])
  const [showTabulationView, setShowTabulationView] = useState<boolean>(false)
  const [rowSelections, setRowSelections] = useState<string[]>([])
  const [columnSelections, setColumnSelections] = useState<string[]>([])
  const [highlightedTag, setHighlightedTag] = useState<string | null>(null)
  const [highlightedSearch, setHighlightedSearch] = useState<string | null>(null)
  const [highlightedSpecificSearch, setHighlightedSpecificSearch] = useState<SearchResult | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const activeFileData = files[activeFile]

  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault()
    const selection = window.getSelection()
    if (!selection || selection.toString().length === 0 || !contentRef.current) return

    const range = selection.getRangeAt(0)
    const preSelectionRange = range.cloneRange()
    preSelectionRange.selectNodeContents(contentRef.current)
    preSelectionRange.setEnd(range.startContainer, range.startOffset)
    const start = preSelectionRange.toString().length
    const end = start + selection.toString().length

    if (start === end) return

    setSelection({ start, end })
    setContextMenuPosition({ x: event.clientX, y: event.clientY })
  }, [])

  const addTag = useCallback(
    (label: string) => {
      if (!selection || !label.trim()) return

      const selectedText = activeFileData.content.slice(selection.start, selection.end)
      if (!selectedText.trim()) return

      const existingLabels = new Set(Object.values(files).flatMap((file) => file.tags.map((t) => t.label)))
      const tagColor = existingLabels.has(label)
        ? Object.values(files)
            .flatMap((file) => file.tags)
            .find((t) => t.label === label)?.color
        : TAG_COLORS[existingLabels.size % TAG_COLORS.length]

      const newTag: Tag = {
        id: Date.now(),
        text: selectedText,
        start: selection.start,
        end: selection.end,
        label,
        color: tagColor || TAG_COLORS[0],
      }
      setFiles((prevFiles) => ({
        ...prevFiles,
        [activeFile]: {
          ...prevFiles[activeFile],
          tags: [...prevFiles[activeFile].tags, newTag],
        },
      }))
      setSelection(null)
      setContextMenuPosition(null)
    },
    [activeFile, files, selection, activeFileData.content],
  )

  const handleNewTag = useCallback(() => {
    setIsNewTagDialogOpen(true)
  }, [])

  const submitNewTag = useCallback(() => {
    if (newTagLabel.trim()) {
      addTag(newTagLabel)
      setNewTagLabel("")
      setIsNewTagDialogOpen(false)
    }
  }, [addTag, newTagLabel])

  const getFilteredTags = useCallback(() => {
    if (selectedTagFilter === "all") return activeFileData.tags
    return activeFileData.tags.filter((tag) => tag.label === selectedTagFilter)
  }, [activeFileData.tags, selectedTagFilter])

  const searchResults = useMemo(() => {
    if (!searchTerm) return []
    const results: SearchResult[] = []
    let index = activeFileData.content.toLowerCase().indexOf(searchTerm.toLowerCase())
    while (index !== -1) {
      results.push({
        text: activeFileData.content.slice(index, index + searchTerm.length),
        start: index,
        end: index + searchTerm.length,
      })
      index = activeFileData.content.toLowerCase().indexOf(searchTerm.toLowerCase(), index + 1)
    }
    return results
  }, [activeFileData.content, searchTerm])

  const renderContent = useCallback(() => {
    if (!activeFileData.content) return null

    const segments: {
      text: string
      isHighlighted: boolean
      isSearchResult: boolean
      tags: Tag[]
    }[] = []

    let lastIndex = 0

    const addSegment = (end: number, isHighlighted = false, isSearchResult = false, tags: Tag[] = []) => {
      if (end > lastIndex) {
        segments.push({
          text: activeFileData.content.slice(lastIndex, end),
          isHighlighted,
          isSearchResult,
          tags,
        })
        lastIndex = end
      }
    }

    // Add segments for tags
    getFilteredTags().forEach((tag) => {
      addSegment(tag.start)
      addSegment(tag.end, tag.label === highlightedTag, false, [tag])
    })

    // Add segments for search results
    searchResults.forEach((result) => {
      addSegment(result.start)
      addSegment(result.end, highlightedSearch === searchTerm || highlightedSpecificSearch === result, true)
    })

    // Add final segment
    addSegment(activeFileData.content.length)

    // Sort segments by start index
    segments.sort((a, b) => a.start - b.start)

    return segments.map((segment, index) => {
      let className = ""
      if (segment.isSearchResult) className += "bg-yellow-200 "
      if (segment.isHighlighted) className += "bg-green-200 "
      if (segment.tags.length > 0) {
        const topTag = segment.tags[segment.tags.length - 1]
        className += topTag.color + " "
      }

      return className ? (
        <mark key={index} className={className.trim()} title={segment.tags.map((t) => t.label).join(", ")}>
          {segment.text}
        </mark>
      ) : (
        <span key={index}>{segment.text}</span>
      )
    })
  }, [
    activeFileData.content,
    getFilteredTags,
    searchResults,
    highlightedTag,
    highlightedSearch,
    highlightedSpecificSearch,
    searchTerm,
  ])

  const getTagsForAnalysis = useCallback(() => {
    const tagsByLabel: Record<string, Array<{ text: string; start: number; end: number }>> = {}

    activeFileData.tags.forEach((tag) => {
      if (!tagsByLabel[tag.label]) {
        tagsByLabel[tag.label] = []
      }
      tagsByLabel[tag.label].push({
        text: tag.text,
        start: tag.start,
        end: tag.end,
      })
    })

    return tagsByLabel
  }, [activeFileData.tags])

  const getTagColors = useCallback(() => {
    const colors: Record<string, string> = {}
    Object.values(files).forEach((file) => {
      file.tags.forEach((tag) => {
        if (!colors[tag.label]) {
          colors[tag.label] = tag.color
        }
      })
    })
    return colors
  }, [files])

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    // The search is already performed real-time via the searchResults memo
  }, [])

  const saveSearch = useCallback(() => {
    if (searchTerm && !savedSearches.includes(searchTerm)) {
      setSavedSearches((prevSearches) => [...prevSearches, searchTerm])
    }
  }, [searchTerm, savedSearches])

  const uniqueTagLabels = useMemo(() => {
    const labels = new Set<string>()
    Object.values(files).forEach((file) => {
      file.tags.forEach((tag) => labels.add(tag.label))
    })
    return Array.from(labels)
  }, [files])

  const handleContentChange = useCallback(
    (newContent: string) => {
      setFiles((prevFiles) => ({
        ...prevFiles,
        [activeFile]: {
          ...prevFiles[activeFile],
          content: newContent,
          tags: prevFiles[activeFile].tags
            .map((tag) => ({
              ...tag,
              start: newContent.indexOf(tag.text),
              end: newContent.indexOf(tag.text) + tag.text.length,
            }))
            .filter((tag) => tag.start !== -1),
        },
      }))
    },
    [activeFile],
  )

  const handleSelectFile = useCallback((fileName: string) => {
    setActiveFile(fileName)
    setSelectedTagFilter("all")
    setSearchTerm("")
  }, [])

  const handleAddFile = useCallback(
    (fileName: string, content: string) => {
      if (!files[fileName]) {
        setFiles((prevFiles) => ({
          ...prevFiles,
          [fileName]: {
            content,
            tags: [],
          },
        }))
        setActiveFile(fileName)
      }
    },
    [files],
  )

  const handleUploadFile = useCallback(
    (file: File) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        handleAddFile(file.name, content)
      }
      reader.readAsText(file)
    },
    [handleAddFile],
  )

  const handleTagClick = useCallback((label: string) => {
    setHighlightedTag((prevTag) => (prevTag === label ? null : label))
    setHighlightedSearch(null)
    setHighlightedSpecificSearch(null)
  }, [])

  const handleSearchClick = useCallback((search: string) => {
    setHighlightedSearch((prevSearch) => (prevSearch === search ? null : search))
    setHighlightedTag(null)
    setHighlightedSpecificSearch(null)
  }, [])

  const handleSpecificSearchClick = useCallback((result: SearchResult) => {
    setHighlightedSpecificSearch((prevResult) =>
      prevResult?.start === result.start && prevResult?.end === result.end ? null : result,
    )
    setHighlightedTag(null)
    setHighlightedSearch(null)

    // Scroll to the specific occurrence
    if (contentRef.current) {
      const range = document.createRange()
      const textNode = contentRef.current.firstChild
      if (textNode) {
        range.setStart(textNode, result.start)
        range.setEnd(textNode, result.end)
        const rect = range.getBoundingClientRect()
        const containerRect = contentRef.current.getBoundingClientRect()
        contentRef.current.scrollTo({
          top: rect.top - containerRect.top - 50,
          behavior: "smooth",
        })
      }
    }
  }, [])

  useEffect(() => {
    const handleInput = (e: InputEvent) => {
      if (e.inputType === "insertText" && contentRef.current) {
        const selection = window.getSelection()
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0)
          const preCaretRange = range.cloneRange()
          preCaretRange.selectNodeContents(contentRef.current)
          preCaretRange.setEnd(range.endContainer, range.endOffset)
          const caretOffset = preCaretRange.toString().length

          const newContent =
            activeFileData.content.slice(0, caretOffset - 1) + e.data + activeFileData.content.slice(caretOffset - 1)

          setFiles((prevFiles) => ({
            ...prevFiles,
            [activeFile]: {
              ...prevFiles[activeFile],
              content: newContent,
            },
          }))

          // Prevent default behavior to avoid repetition
          e.preventDefault()
        }
      }
    }

    const contentElement = contentRef.current
    contentElement?.addEventListener("beforeinput", handleInput as EventListener)
    return () => {
      contentElement?.removeEventListener("beforeinput", handleInput as EventListener)
    }
  }, [activeFile, activeFileData.content])

  const handleTagFilterChange = useCallback((value: string) => {
    setSelectedTagFilter(value)
    if (value !== "all") {
      setHighlightedTag(value)
      setHighlightedSearch(null)
      setHighlightedSpecificSearch(null)
    } else {
      setHighlightedTag(null)
    }
  }, [])

  const handleTabulationOccurrenceSelect = useCallback(
    (occurrence: { text: string; start: number; end: number; file: string }) => {
      setActiveFile(occurrence.file)
      setHighlightedSpecificSearch({
        text: occurrence.text,
        start: occurrence.start,
        end: occurrence.end,
      })

      // Scroll to the specific occurrence
      if (contentRef.current) {
        const range = document.createRange()
        const textNode = contentRef.current.firstChild
        if (textNode) {
          range.setStart(textNode, occurrence.start)
          range.setEnd(textNode, occurrence.end)
          const rect = range.getBoundingClientRect()
          const containerRect = contentRef.current.getBoundingClientRect()
          contentRef.current.scrollTo({
            top: rect.top - containerRect.top - 50,
            behavior: "smooth",
          })
        }
      }
    },
    [],
  )

  return (
    <div className="container mx-auto h-screen flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Vignesh - The Research Assistant</h1>
        <UserDropdown />
      </div>
      <div className="flex flex-grow overflow-hidden">
        <FileList
          files={Object.keys(files)}
          activeFile={activeFile}
          onSelectFile={handleSelectFile}
          onAddFile={handleAddFile}
          onUploadFile={handleUploadFile}
        />
        <div className="flex-grow grid gap-6 md:grid-cols-2 h-full overflow-hidden">
          <div className="flex flex-col">
            <div className="mb-4 flex gap-2">
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
                <Button type="button" onClick={saveSearch} disabled={!searchTerm || savedSearches.includes(searchTerm)}>
                  <Save className="h-4 w-4" />
                </Button>
              </form>
            </div>
            <HighlightedTextViewer
              content={activeFileData.content}
              highlightStart={highlightedSpecificSearch?.start ?? 0}
              highlightEnd={highlightedSpecificSearch?.end ?? 0}
              onContentChange={handleContentChange}
              ref={contentRef}
              onContextMenu={handleContextMenu}
            />
          </div>
          <div className="space-y-6 overflow-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Text Coding</h2>
              <Button onClick={() => setShowTabulationView(true)}>
                <Table className="h-4 w-4 mr-2" />
                Tabulate
              </Button>
            </div>
            <TagAnalysis
              tags={getTagsForAnalysis()}
              colors={getTagColors()}
              onTagClick={handleTagClick}
              onOccurrenceClick={(start, end) => {
                handleSpecificSearchClick({ text: activeFileData.content.slice(start, end), start, end })
              }}
              highlightedTag={highlightedTag}
              highlightedOccurrence={highlightedSpecificSearch}
            />
            <SearchAnalysis
              content={activeFileData.content}
              currentSearchResults={searchResults}
              savedSearches={savedSearches}
              onSelectSearch={handleSearchClick}
              onSelectSpecificSearch={handleSpecificSearchClick}
              highlightedSearch={highlightedSearch}
              highlightedSpecificSearch={highlightedSpecificSearch}
              onOccurrenceClick={(start, end) => {
                handleSpecificSearchClick({ text: activeFileData.content.slice(start, end), start, end })
              }}
            />
          </div>
        </div>
      </div>
      {showTabulationView && (
        <TabulationView
          files={files}
          onClose={() => setShowTabulationView(false)}
          rowSelections={rowSelections}
          columnSelections={columnSelections}
          setRowSelections={setRowSelections}
          setColumnSelections={setColumnSelections}
          savedSearches={savedSearches}
          onSelectOccurrence={handleTabulationOccurrenceSelect}
        />
      )}
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
          {uniqueTagLabels.map((label) => (
            <DropdownMenuItem key={label} onSelect={() => addTag(label)} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded ${getTagColors()[label]}`} />
              {label}
            </DropdownMenuItem>
          ))}
          {uniqueTagLabels.length > 0 && <DropdownMenuSeparator />}
          <DropdownMenuItem onSelect={handleNewTag}>New Tag...</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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

