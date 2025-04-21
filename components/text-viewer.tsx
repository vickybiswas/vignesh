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
import { Search, Save, Table, X, Download, Upload, BookOpen } from "lucide-react"
import { generatePastelColor } from "@/utils/colors"
import { SynonymsPopup } from "./synonyms-popup"

const LOCAL_STORAGE_KEY = "textViewerState"

// New types based on the updated structure
interface Tag {
  type: "Search" | "Tag"
  text: string
  color: string
  start: number
  end: number
}

interface TextFile {
  name: string
  content: string
  tags: Record<string, Tag>
  dirty: boolean
}

interface AppState {
  files: Record<string, TextFile>
  activeFile: string
  tabulations: Array<{
    rows: string[]
    columns: string[]
    extend_type: 0 | 1 | 2
  }>
}

export default function TextViewer() {
  const [state, setState] = useState<AppState>(() => {
    if (typeof window !== "undefined") {
      const savedState = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (savedState) {
        return JSON.parse(savedState)
      }
    }
    return {
      files: {
        "sample.txt": {
          name: "sample.txt",
          content:
            "This is a sample text. You can right-click on any part of this text to add tags to it, including overlapping tags.",
          tags: {},
          dirty: false,
        },
      },
      activeFile: "sample.txt",
      tabulations: [],
    }
  })

  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null)
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null)
  const [newTagLabel, setNewTagLabel] = useState<string>("")
  const [isNewTagDialogOpen, setIsNewTagDialogOpen] = useState<boolean>(false)
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [showTabulationView, setShowTabulationView] = useState<boolean>(false)
  const [showSynonymsPopup, setShowSynonymsPopup] = useState<boolean>(false)
  const [synonyms, setSynonyms] = useState<string[]>([])
  const [isFetchingSynonyms, setIsFetchingSynonyms] = useState<boolean>(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const activeFile = state.files[state.activeFile]

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state))
  }, [state])

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
    (label: string, type: "Tag" | "Search" = "Tag") => {
      if (!selection || !label.trim()) return

      const tagId = `${type.toLowerCase()}-${Date.now()}`
      const selectedText = activeFile.content.slice(selection.start, selection.end)
      const color = generatePastelColor()

      setState((prevState) => ({
        ...prevState,
        files: {
          ...prevState.files,
          [state.activeFile]: {
            ...prevState.files[state.activeFile],
            tags: {
              ...prevState.files[state.activeFile].tags,
              [tagId]: {
                type,
                text: label,
                color,
                start: selection.start,
                end: selection.end,
              },
            },
          },
        },
      }))

      setSelection(null)
      setContextMenuPosition(null)
    },
    [state.activeFile, activeFile, selection],
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
    const tags: Tag[] = []

    Object.entries(activeFile.tags).forEach(([id, tag]) => {
      if (tag.type === "Tag" && (selectedTagFilter === "all" || tag.text === selectedTagFilter)) {
        tags.push({ ...tag, id })
      }
    })

    return tags
  }, [activeFile.tags, selectedTagFilter])

  const searchResults = useMemo(() => {
    if (!searchTerm) return []

    // Check if we already have this search term saved
    const existingSearches = Object.values(activeFile.tags).filter(
      (tag) => tag.type === "Search" && tag.text === searchTerm,
    )

    if (existingSearches.length > 0) {
      return existingSearches
    }

    // Otherwise, find all occurrences in the text
    const results: Tag[] = []
    let index = activeFile.content.toLowerCase().indexOf(searchTerm.toLowerCase())
    let counter = 0

    while (index !== -1) {
      results.push({
        type: "Search",
        text: searchTerm,
        color: generatePastelColor(),
        start: index,
        end: index + searchTerm.length,
      })
      index = activeFile.content.toLowerCase().indexOf(searchTerm.toLowerCase(), index + 1)
      counter++
      if (counter > 1000) break // Safety limit
    }

    return results
  }, [activeFile.tags, activeFile.content, searchTerm])

  const renderContent = useCallback(() => {
    if (!activeFile.content) return null

    // Get all tags and search results
    const allTags = Object.values(activeFile.tags)
    const currentSearchResults = searchTerm ? searchResults : []

    // Combine all highlights
    const highlights = [...allTags, ...currentSearchResults]

    // Sort by start position
    highlights.sort((a, b) => a.start - b.start)

    // Create segments
    const segments: {
      text: string
      start: number
      end: number
      tags: Tag[]
    }[] = []

    // Find all unique positions
    const positions = new Set<number>()
    highlights.forEach((tag) => {
      positions.add(tag.start)
      positions.add(tag.end)
    })

    // Add start and end of text
    positions.add(0)
    positions.add(activeFile.content.length)

    // Convert to array and sort
    const sortedPositions = Array.from(positions).sort((a, b) => a - b)

    // Create segments
    for (let i = 0; i < sortedPositions.length - 1; i++) {
      const start = sortedPositions[i]
      const end = sortedPositions[i + 1]

      if (start === end) continue

      const text = activeFile.content.slice(start, end)
      const segmentTags = highlights.filter((tag) => tag.start <= start && tag.end >= end)

      segments.push({
        text,
        start,
        end,
        tags: segmentTags,
      })
    }

    // Render segments
    return segments.map((segment, index) => {
      if (segment.tags.length === 0) {
        return <span key={index}>{segment.text}</span>
      }

      // Determine if this segment should be highlighted (for search or tag filter)
      const isHighlighted = segment.tags.some(
        (tag) =>
          (tag.type === "Search" && tag.text === searchTerm) || (tag.type === "Tag" && tag.text === selectedTagFilter),
      )

      // For segments with multiple tags, we'll create a style with all colors
      const style: React.CSSProperties = {}

      if (segment.tags.length === 1) {
        // Single tag - use its color
        style.backgroundColor = segment.tags[0].color
        style.opacity = isHighlighted ? 1 : 0.5
      } else {
        // Multiple tags - create a gradient
        const gradient = segment.tags
          .map(
            (tag, i) =>
              `${tag.color} ${(i * 100) / segment.tags.length}%, ${tag.color} ${((i + 1) * 100) / segment.tags.length}%`,
          )
          .join(", ")

        style.background = `linear-gradient(135deg, ${gradient})`
        style.opacity = isHighlighted ? 1 : 0.5
      }

      // Create title with all tag names
      const title = segment.tags.map((tag) => `${tag.type}: ${tag.text}`).join("\n")

      return (
        <mark key={index} style={style} title={title} className="rounded-sm">
          {segment.text}
        </mark>
      )
    })
  }, [activeFile.content, activeFile.tags, searchResults, searchTerm, selectedTagFilter])

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    // The search is already performed real-time via the searchResults memo
  }, [])

  const saveSearch = useCallback(() => {
    if (!searchTerm) return

    // Check if this search already exists
    const existingSearch = Object.values(activeFile.tags).some(
      (tag) => tag.type === "Search" && tag.text === searchTerm,
    )

    if (existingSearch) return

    // Save all occurrences of the search term
    searchResults.forEach((result, index) => {
      const tagId = `search-${Date.now()}-${index}`

      setState((prevState) => ({
        ...prevState,
        files: {
          ...prevState.files,
          [state.activeFile]: {
            ...prevState.files[state.activeFile],
            tags: {
              ...prevState.files[state.activeFile].tags,
              [tagId]: {
                ...result,
              },
            },
          },
        },
      }))
    })
  }, [searchTerm, searchResults, activeFile.tags, state.activeFile])

  const uniqueTagLabels = useMemo(() => {
    const labels = new Set<string>()

    Object.values(activeFile.tags).forEach((tag) => {
      if (tag.type === "Tag") {
        labels.add(tag.text)
      }
    })

    return Array.from(labels)
  }, [activeFile.tags])

  const savedSearches = useMemo(() => {
    const searches = new Set<string>()

    Object.values(activeFile.tags).forEach((tag) => {
      if (tag.type === "Search") {
        searches.add(tag.text)
      }
    })

    return Array.from(searches)
  }, [activeFile.tags])

  const handleContentChange = useCallback(
    (newContent: string) => {
      setState((prevState) => ({
        ...prevState,
        files: {
          ...prevState.files,
          [state.activeFile]: {
            ...prevState.files[state.activeFile],
            content: newContent,
            dirty: true,
          },
        },
      }))
    },
    [state.activeFile],
  )

  const handleSelectFile = useCallback((fileName: string) => {
    setState((prevState) => ({
      ...prevState,
      activeFile: fileName,
    }))
    setSelectedTagFilter("all")
    setSearchTerm("")
  }, [])

  const handleAddFile = useCallback(
    (fileName: string, content: string) => {
      if (!state.files[fileName]) {
        setState((prevState) => ({
          ...prevState,
          files: {
            ...prevState.files,
            [fileName]: {
              name: fileName,
              content,
              tags: {},
              dirty: true,
            },
          },
          activeFile: fileName,
        }))
      }
    },
    [state.files],
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
    setSelectedTagFilter((prevFilter) => (prevFilter === label ? "all" : label))
  }, [])

  const handleSearchClick = useCallback((search: string) => {
    setSearchTerm((prevSearch) => (prevSearch === search ? "" : search))
    setSelectedTagFilter("all")
  }, [])

  const handleSpecificSearchClick = useCallback((position: { start: number; end: number }) => {
    // Scroll to the specific occurrence
    if (contentRef.current) {
      const range = document.createRange()
      const textNode = contentRef.current.firstChild
      if (textNode) {
        range.setStart(textNode, position.start)
        range.setEnd(textNode, position.end)
        const rect = range.getBoundingClientRect()
        const containerRect = contentRef.current.getBoundingClientRect()
        contentRef.current.scrollTo({
          top: rect.top - containerRect.top - 50,
          behavior: "smooth",
        })
      }
    }
  }, [])

  const handleTagFilterChange = useCallback((value: string) => {
    setSelectedTagFilter(value)
    setSearchTerm("")
  }, [])

  const handleTabulationOccurrenceSelect = useCallback(
    (occurrence: { text: string; start: number; end: number; file: string }) => {
      setState({
        ...state,
        activeFile: occurrence.file,
      })
      handleSpecificSearchClick(occurrence)
      setShowTabulationView(false)
    },
    [state, handleSpecificSearchClick],
  )

  const handleDownloadState = useCallback(() => {
    const stateToDownload = {
      ...state,
      tabulations: state.tabulations,
    }
    const stateString = JSON.stringify(stateToDownload, null, 2)
    const blob = new Blob([stateString], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "text-viewer-state.json"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [state])

  const handleUploadState = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        try {
          const uploadedState = JSON.parse(content) as AppState
          setState(uploadedState)
        } catch (error) {
          console.error("Error parsing uploaded state:", error)
          alert("Invalid state file. Please upload a valid JSON file.")
        }
      }
      reader.readAsText(file)
    }
  }, [])

  const handleRemoveSearch = useCallback((searchToRemove: string) => {
    setState((prevState) => {
      const newFile = { ...prevState.files[prevState.activeFile] }
      const newTags = { ...newFile.tags }

      // Remove all tags with this search text
      Object.entries(newTags).forEach(([id, tag]) => {
        if (tag.type === "Search" && tag.text === searchToRemove) {
          delete newTags[id]
        }
      })

      newFile.tags = newTags

      return {
        ...prevState,
        files: {
          ...prevState.files,
          [prevState.activeFile]: newFile,
        },
      }
    })
  }, [])

  const handleSaveFile = useCallback(
    (fileName: string) => {
      const fileContent = state.files[fileName].content
      const blob = new Blob([fileContent], { type: "text/plain;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    },
    [state.files],
  )

  const handleRemoveFile = useCallback((fileName: string) => {
    setState((prevState) => {
      const newFiles = { ...prevState.files }
      delete newFiles[fileName]
      const newActiveFile = fileName === prevState.activeFile ? Object.keys(newFiles)[0] : prevState.activeFile
      return {
        ...prevState,
        files: newFiles,
        activeFile: newActiveFile,
      }
    })
  }, [])

  const generateFallbackSynonyms = useCallback((term: string, text: string): string[] => {
    // Simple algorithm to find related words in the text
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((word) => word.length > 3 && word !== term.toLowerCase())

    // Deduplicate words
    const uniqueWords = Array.from(new Set(words))
      .filter((word) => word !== term.toLowerCase())
      .slice(0, 5)

    // Always ensure we have at least these fallback options
    const fallbackOptions = ["sample", "text", "right", "click", "part", "tags", "overlapping"].filter(
      (word) => word !== term.toLowerCase(),
    )

    // If we don't have enough words from the text, add some from our fallback list
    if (uniqueWords.length < 2) {
      // Add term-specific alternatives if available
      if (term.toLowerCase() === "text") return ["document", "content", "writing", "passage", "material"]
      if (term.toLowerCase() === "search") return ["find", "locate", "discover", "query", "lookup"]
      if (term.toLowerCase() === "tag") return ["label", "mark", "category", "classify", "annotate"]
      if (term.toLowerCase() === "sample") return ["example", "specimen", "instance", "case", "illustration"]

      // Otherwise use words from the fallback options
      return fallbackOptions.slice(0, 5)
    }

    return uniqueWords
  }, [])

  const fetchSynonyms = useCallback(async () => {
    if (!searchTerm) return

    setIsFetchingSynonyms(true)
    setSynonyms([])
    setShowSynonymsPopup(true)

    try {
      const response = await fetch("/api/synonyms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ word: searchTerm }),
      })

      if (!response.ok) {
        throw new Error("Failed to fetch synonyms")
      }

      const data = await response.json()
      let synonymsList = data.synonyms || []

      // If API returns no synonyms, generate fallback suggestions from the text
      if (!synonymsList || synonymsList.length === 0) {
        synonymsList = generateFallbackSynonyms(searchTerm, activeFile.content)
      }

      setSynonyms(synonymsList)
    } catch (error) {
      console.error("Error fetching synonyms:", error)
      // Use fallback synonyms
      const fallbackSynonyms = generateFallbackSynonyms(searchTerm, activeFile.content)
      setSynonyms(fallbackSynonyms)
    } finally {
      setIsFetchingSynonyms(false)
    }
  }, [searchTerm, activeFile.content, generateFallbackSynonyms])

  const handleSaveSynonyms = useCallback(
    (selectedSynonyms: string[]) => {
      selectedSynonyms.forEach((synonym) => {
        // Check if this synonym already exists as a search
        const existingSearch = Object.values(activeFile.tags).some(
          (tag) => tag.type === "Search" && tag.text === synonym,
        )

        if (!existingSearch) {
          // Find all occurrences of the synonym
          let index = activeFile.content.toLowerCase().indexOf(synonym.toLowerCase())
          let counter = 0

          while (index !== -1 && counter < 1000) {
            const tagId = `search-${Date.now()}-${synonym}-${counter}`

            setState((prevState) => ({
              ...prevState,
              files: {
                ...prevState.files,
                [state.activeFile]: {
                  ...prevState.files[state.activeFile],
                  tags: {
                    ...prevState.files[state.activeFile].tags,
                    [tagId]: {
                      type: "Search",
                      text: synonym,
                      color: generatePastelColor(),
                      start: index,
                      end: index + synonym.length,
                    },
                  },
                },
              },
            }))

            index = activeFile.content.toLowerCase().indexOf(synonym.toLowerCase(), index + 1)
            counter++
          }
        }
      })

      setShowSynonymsPopup(false)
    },
    [activeFile.tags, activeFile.content, state.activeFile],
  )

  // Convert tags to the format expected by TagAnalysis
  const convertedTags = useMemo(() => {
    const tagsByText: Record<string, Tag[]> = {}

    Object.entries(activeFile.tags).forEach(([id, tag]) => {
      if (tag.type === "Tag") {
        if (!tagsByText[tag.text]) {
          tagsByText[tag.text] = []
        }
        tagsByText[tag.text].push(tag)
      }
    })

    return Object.entries(tagsByText).map(([text, tags]) => ({
      id: text,
      text,
      color: tags[0].color,
      positions: {
        [state.activeFile]: tags.map((tag) => ({
          text: activeFile.content.slice(tag.start, tag.end),
          start: tag.start,
          stop: tag.end,
        })),
      },
    }))
  }, [activeFile.tags, activeFile.content, state.activeFile])

  return (
    <div className="container mx-auto py-6 h-screen flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Text File Viewer</h1>
        <div className="flex items-center gap-2">
          <Button onClick={handleDownloadState}>
            <Download className="h-4 w-4 mr-2" />
            Download State
          </Button>
          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Upload State
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
      <div className="flex flex-grow overflow-hidden">
        <FileList
          files={Object.keys(state.files)}
          activeFile={state.activeFile}
          onSelectFile={handleSelectFile}
          onAddFile={handleAddFile}
          onUploadFile={handleUploadFile}
          onSaveFile={handleSaveFile}
          onRemoveFile={handleRemoveFile}
        />
        <div className="flex-grow grid gap-6 md:grid-cols-2 h-full overflow-hidden">
          <div className="flex flex-col">
            <div className="mb-4 flex gap-2">
              <Select value={selectedTagFilter} onValueChange={handleTagFilterChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter tags..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tags</SelectItem>
                  {uniqueTagLabels.map((label) => (
                    <SelectItem key={label} value={label} className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded inline-block mr-2`}
                        style={{
                          backgroundColor: Object.values(activeFile.tags).find(
                            (tag) => tag.type === "Tag" && tag.text === label,
                          )?.color,
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
                <Button type="submit">
                  <Search className="h-4 w-4" />
                </Button>
                <Button type="button" onClick={saveSearch} disabled={!searchTerm || savedSearches.includes(searchTerm)}>
                  <Save className="h-4 w-4" />
                </Button>
                <Button type="button" onClick={fetchSynonyms} disabled={!searchTerm} title="Find synonyms">
                  <BookOpen className="h-4 w-4" />
                </Button>
              </form>
            </div>
            <div
              ref={contentRef}
              className="text-lg p-4 border rounded relative whitespace-pre-wrap h-full overflow-auto"
              contentEditable
              suppressContentEditableWarning
              onInput={(e) => handleContentChange(e.currentTarget.textContent || "")}
              onContextMenu={handleContextMenu}
            >
              {renderContent()}
            </div>
          </div>
          <div className="space-y-6 overflow-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Tag Analysis</h2>
              <Button onClick={() => setShowTabulationView(true)}>
                <Table className="h-4 w-4 mr-2" />
                Tabulate
              </Button>
            </div>
            <TagAnalysis
              tags={convertedTags}
              onTagClick={handleTagClick}
              onOccurrenceClick={handleSpecificSearchClick}
              highlightedTag={selectedTagFilter}
            />
            <SearchAnalysis
              content={activeFile.content}
              currentSearchResults={searchResults.map((result) => ({
                text: result.text,
                start: result.start,
                stop: result.end,
              }))}
              savedSearches={savedSearches}
              onSelectSearch={handleSearchClick}
              onSelectSpecificSearch={handleSpecificSearchClick}
              onRemoveSearch={handleRemoveSearch}
              highlightedSearch={searchTerm}
            />
          </div>
        </div>
      </div>
      {showTabulationView && (
        <TabulationView
          state={{
            markings: [
              ...Object.entries(activeFile.tags).map(([id, tag]) => ({
                id,
                type: tag.type.toLowerCase(),
                text: tag.text,
                color: tag.color,
                positions: {
                  [state.activeFile]: [
                    {
                      text: activeFile.content.slice(tag.start, tag.end),
                      start: tag.start,
                      stop: tag.end,
                    },
                  ],
                },
              })),
            ],
            files: {
              [state.activeFile]: {
                name: state.activeFile,
                content: activeFile.content,
                dirty: activeFile.dirty,
                positions: Object.entries(activeFile.tags).reduce(
                  (acc, [id, tag]) => {
                    acc[id] = [
                      {
                        text: activeFile.content.slice(tag.start, tag.end),
                        start: tag.start,
                        stop: tag.end,
                      },
                    ]
                    return acc
                  },
                  {} as Record<string, any[]>,
                ),
              },
            },
            tabulations: state.tabulations,
            activeFile: state.activeFile,
          }}
          onClose={() => setShowTabulationView(false)}
          onSelectOccurrence={handleTabulationOccurrenceSelect}
          setState={(newState) => {
            setState((prevState) => ({
              ...prevState,
              tabulations: newState.tabulations,
            }))
          }}
          activeFile={state.activeFile}
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
              <div
                className={`w-3 h-3 rounded`}
                style={{
                  backgroundColor: Object.values(activeFile.tags).find(
                    (tag) => tag.type === "Tag" && tag.text === label,
                  )?.color,
                }}
              />
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
      {showSynonymsPopup && (
        <SynonymsPopup
          word={searchTerm}
          synonyms={synonyms}
          isLoading={isFetchingSynonyms}
          onClose={() => setShowSynonymsPopup(false)}
          onSave={handleSaveSynonyms}
        />
      )}
    </div>
  )
}
