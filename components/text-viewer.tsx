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
import WarningPopup from "./warning-popup"
import { messages } from "@/utils/messages"

const LOCAL_STORAGE_KEY = "textViewerState"

// Updated types based on the new structure
interface Occurrence {
  text: string
  start: number
  end: number
}

interface Tag {
  type: "Search" | "Tag"
  color: string
  occurrences: Occurrence[]
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
  const [deleteFilePopup, setDeleteFilePopup] = useState<string>("")
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

      const selectedText = activeFile.content.slice(selection.start, selection.end)

      // Check if this tag already exists
      const tagId = `${type.toLowerCase()}-${label.replace(/\s+/g, "-").toLowerCase()}`
      const existingTag = activeFile.tags[tagId]

      setState((prevState) => {
        const newTags = { ...prevState.files[state.activeFile].tags }

        if (existingTag) {
          // Add a new occurrence to the existing tag
          newTags[tagId] = {
            ...existingTag,
            occurrences: [
              ...existingTag.occurrences,
              {
                text: selectedText,
                start: selection.start,
                end: selection.end,
              },
            ],
          }
        } else {
          // Create a new tag with this occurrence
          newTags[tagId] = {
            type,
            color: generatePastelColor(),
            occurrences: [
              {
                text: selectedText,
                start: selection.start,
                end: selection.end,
              },
            ],
          }
        }

        return {
          ...prevState,
          files: {
            ...prevState.files,
            [state.activeFile]: {
              ...prevState.files[state.activeFile],
              tags: newTags,
            },
          },
        }
      })

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
    const tags: Array<{ id: string; tag: Tag }> = []

    Object.entries(activeFile.tags).forEach(([id, tag]) => {
      if (tag.type === "Tag" && (selectedTagFilter === "all" || id.includes(selectedTagFilter))) {
        tags.push({ id, tag })
      }
    })

    return tags
  }, [activeFile.tags, selectedTagFilter])

  const searchResults = useMemo(() => {
    if (!searchTerm) return []

    // Check if we already have this search term saved
    const searchId = `search-${searchTerm.replace(/\s+/g, "-").toLowerCase()}`
    const existingSearch = activeFile.tags[searchId]

    if (existingSearch) {
      return existingSearch.occurrences
    }

    // Otherwise, find all occurrences in the text
    const results: Occurrence[] = []
    let index = activeFile.content.toLowerCase().indexOf(searchTerm.toLowerCase())
    let counter = 0

    while (index !== -1) {
      results.push({
        text: activeFile.content.slice(index, index + searchTerm.length),
        start: index,
        end: index + searchTerm.length,
      })
      index = activeFile.content.toLowerCase().indexOf(searchTerm.toLowerCase(), index + 1)
      counter++
      if (counter > 1000) break // Safety limit
    }

    return results
  }, [activeFile.tags, activeFile.content, searchTerm])

  const saveSearch = useCallback(() => {
    if (!searchTerm || searchResults.length === 0) return

    const searchId = `search-${searchTerm.replace(/\s+/g, "-").toLowerCase()}`
    const existingSearch = activeFile.tags[searchId]

    if (existingSearch) return // Already saved

    setState((prevState) => ({
      ...prevState,
      files: {
        ...prevState.files,
        [state.activeFile]: {
          ...prevState.files[state.activeFile],
          tags: {
            ...prevState.files[state.activeFile].tags,
            [searchId]: {
              type: "Search",
              color: generatePastelColor(),
              occurrences: searchResults,
            },
          },
        },
      },
    }))
  }, [searchTerm, searchResults, activeFile.tags, state.activeFile])

  const uniqueTagLabels = useMemo(() => {
    const labels: string[] = []

    Object.entries(activeFile.tags).forEach(([id, tag]) => {
      if (tag.type === "Tag") {
        // Extract the label from the ID (tag-label-format)
        const label = id.split("-").slice(1).join("-")
        if (!labels.includes(label)) {
          labels.push(label)
        }
      }
    })

    return labels
  }, [activeFile.tags])

  const savedSearches = useMemo(() => {
    const searches: string[] = []

    Object.entries(activeFile.tags).forEach(([id, tag]) => {
      if (tag.type === "Search") {
        // Extract the search term from the ID (search-term-format)
        const searchTerm = id.split("-").slice(1).join("-")
        if (!searches.includes(searchTerm)) {
          searches.push(searchTerm)
        }
      }
    })

    return searches
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
      setState((prevState) => ({
        ...prevState,
        activeFile: occurrence.file,
      }))
      handleSpecificSearchClick(occurrence)
      setShowTabulationView(false)
    },
    [handleSpecificSearchClick],
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

      // Find and remove the search tag
      const searchId = `search-${searchToRemove.replace(/\s+/g, "-").toLowerCase()}`
      if (newTags[searchId]) {
        delete newTags[searchId]
      }

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
  
  const handleRemoveFileConfirm = useCallback((fileName: string) => {
    if(!fileName){
      return
    }
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
    setDeleteFilePopup("")
  }, [])
  
  const handleRemoveFile = (e:any, fileName: string) => {
    setDeleteFilePopup(fileName)
  };



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
      // Process each selected synonym
      selectedSynonyms.forEach((synonym) => {
        const searchId = `search-${synonym.replace(/\s+/g, "-").toLowerCase()}`

        // Skip if this synonym is already saved
        if (activeFile.tags[searchId]) return

        // Find all occurrences of the synonym
        const occurrences: Occurrence[] = []
        let index = activeFile.content.toLowerCase().indexOf(synonym.toLowerCase())
        let counter = 0

        while (index !== -1 && counter < 1000) {
          occurrences.push({
            text: activeFile.content.slice(index, index + synonym.length),
            start: index,
            end: index + synonym.length,
          })

          index = activeFile.content.toLowerCase().indexOf(synonym.toLowerCase(), index + 1)
          counter++
        }

        // Only add if we found occurrences
        if (occurrences.length > 0) {
          setState((prevState) => ({
            ...prevState,
            files: {
              ...prevState.files,
              [state.activeFile]: {
                ...prevState.files[state.activeFile],
                tags: {
                  ...prevState.files[state.activeFile].tags,
                  [searchId]: {
                    type: "Search",
                    color: generatePastelColor(),
                    occurrences,
                  },
                },
              },
            },
          }))
        }
      })

      setShowSynonymsPopup(false)
    },
    [activeFile.tags, activeFile.content, state.activeFile],
  )

  const renderContent = useCallback(() => {
    if (!activeFile.content) return null

    // Collect all occurrences from all tags
    const allOccurrences: Array<{
      start: number
      end: number
      tag: string
      type: "Search" | "Tag"
      color: string
    }> = []

    Object.entries(activeFile.tags).forEach(([id, tag]) => {
      const tagName = id.split("-").slice(1).join("-")

      tag.occurrences?.forEach((occurrence) => {
        allOccurrences.push({
          start: occurrence.start,
          end: occurrence.end,
          tag: tagName,
          type: tag.type,
          color: tag.color,
        })
      })
    })

    // Add current search results if not saved
    if (searchTerm) {
      const searchId = `search-${searchTerm.replace(/\s+/g, "-").toLowerCase()}`
      if (!activeFile.tags[searchId]) {
        searchResults.forEach((result) => {
          allOccurrences.push({
            start: result.start,
            end: result.end,
            tag: searchTerm,
            type: "Search",
            color: "hsl(200, 100%, 80%)", // Temporary color for unsaved searches
          })
        })
      }
    }

    // Sort by start position
    allOccurrences.sort((a, b) => a.start - b.start)

    // Create segments
    const segments: {
      text: string
      start: number
      end: number
      occurrences: typeof allOccurrences
    }[] = []

    // Find all unique positions
    const positions = new Set<number>()
    allOccurrences.forEach((occurrence) => {
      positions.add(occurrence.start)
      positions.add(occurrence.end)
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
      const segmentOccurrences = allOccurrences.filter(
        (occurrence) => occurrence.start <= start && occurrence.end >= end,
      )

      segments.push({
        text,
        start,
        end,
        occurrences: segmentOccurrences,
      })
    }

    // Render segments
    return segments.map((segment, index) => {
      if (segment.occurrences.length === 0) {
        return <span key={index}>{segment.text}</span>
      }

      // Determine if this segment should be highlighted (for search or tag filter)
      const isHighlighted = segment.occurrences.some(
        (occurrence) =>
          (occurrence.type === "Search" && occurrence.tag === searchTerm) ||
          (occurrence.type === "Tag" && occurrence.tag === selectedTagFilter),
      )

      // For segments with multiple occurrences, we'll create a style with all colors
      const style: React.CSSProperties = {}

      if (segment.occurrences.length === 1) {
        // Single occurrence - use its color
        style.backgroundColor = segment.occurrences[0].color
        style.opacity = isHighlighted ? 1 : 0.5
      } else {
        // Multiple occurrences - create a gradient
        const gradient = segment.occurrences
          .map(
            (occurrence, i) =>
              `${occurrence.color} ${(i * 100) / segment.occurrences.length}%, ${occurrence.color} ${
                ((i + 1) * 100) / segment.occurrences.length
              }%`,
          )
          .join(", ")

        style.background = `linear-gradient(135deg, ${gradient})`
        style.opacity = isHighlighted ? 1 : 0.5
      }

      // Create title with all tag names
      const title = segment.occurrences.map((occurrence) => `${occurrence.type}: ${occurrence.tag}`).join("\n")

      return (
        <mark key={index} style={style} title={title} className="rounded-sm">
          {segment.text}
        </mark>
      )
    })
  }, [activeFile.content, activeFile.tags, searchResults, searchTerm, selectedTagFilter])

  // Convert tags to the format expected by TagAnalysis
  const convertedTags = useMemo(() => {
    const tagsByLabel: Record<
      string,
      {
        color: string
        occurrences: Occurrence[]
      }
    > = {}

    // Group tag occurrences by label
    Object.entries(activeFile.tags).forEach(([id, tag]) => {
      if (tag.type === "Tag") {
        const label = id.split("-").slice(1).join("-")

        if (!tagsByLabel[label]) {
          tagsByLabel[label] = {
            color: tag.color,
            occurrences: [],
          }
        }
        if(tag.occurrences?.length){
          tagsByLabel[label].occurrences.push(...tag.occurrences)
        }
      }
    })

    // Convert to the format expected by TagAnalysis
    return Object.entries(tagsByLabel).map(([label, data]) => ({
      id: label,
      text: label,
      color: data.color,
      positions: {
        [state.activeFile]: data.occurrences.map((occurrence) => ({
          text: occurrence.text,
          start: occurrence.start,
          stop: occurrence.end,
        })),
      },
    }))
  }, [activeFile.tags, state.activeFile])

  // Prepare search results for SearchAnalysis
  const prepareSearchResults = useCallback(
    (searchTerm: string) => {
      if (!searchTerm) return []

      const searchId = `search-${searchTerm.replace(/\s+/g, "-").toLowerCase()}`
      const existingSearch = activeFile.tags[searchId]

      if (existingSearch) {
        return existingSearch.occurrences.map((occurrence) => ({
          text: occurrence.text,
          start: occurrence.start,
          stop: occurrence.end,
        }))
      }

      return searchResults.map((result) => ({
        text: result.text,
        start: result.start,
        stop: result.end,
      }))
    },
    [activeFile.tags, searchResults],
  )

  const handleSearch = useCallback((event: React.FormEvent) => {
    event.preventDefault()
    // Search is handled by the searchResults memo
  }, [])

  // Prepare tabulation data
  const prepareTabulationData = useMemo(() => {
    // Only compute this when the tabulation view is shown
    if (!showTabulationView) return null

    const markings = Object.entries(activeFile.tags).map(([id, tag]) => {
      const label = id.split("-").slice(1).join("-")

      return {
        id,
        type: tag.type.toLowerCase(),
        text: label,
        color: tag.color,
        positions: {
          [state.activeFile]: tag.occurrences.map((occurrence) => ({
            text: occurrence.text,
            start: occurrence.start,
            stop: occurrence.end,
          })),
        },
      }
    })

    return {
      markings,
      files: {
        [state.activeFile]: {
          name: state.activeFile,
          content: activeFile.content,
          dirty: activeFile.dirty,
          positions: Object.entries(activeFile.tags).reduce(
            (acc, [id, tag]) => {
              acc[id] = tag.occurrences.map((occurrence) => ({
                text: occurrence.text,
                start: occurrence.start,
                stop: occurrence.end,
              }))
              return acc
            },
            {} as Record<string, any[]>,
          ),
        },
      },
      tabulations: state.tabulations,
      activeFile: state.activeFile,
    }
  }, [showTabulationView, activeFile, state.activeFile, state.tabulations])

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
                          backgroundColor: Object.entries(activeFile.tags).find(
                            ([id, tag]) => tag.type === "Tag" && id.includes(label),
                          )?.[1]?.color,
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
              {activeFile.content ? renderContent() : null}
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
              currentSearchResults={prepareSearchResults(searchTerm)}
              savedSearches={savedSearches}
              onSelectSearch={handleSearchClick}
              onSelectSpecificSearch={handleSpecificSearchClick}
              onRemoveSearch={handleRemoveSearch}
              highlightedSearch={searchTerm}
            />
          </div>
        </div>
      </div>
      {showTabulationView && prepareTabulationData && (
        <TabulationView
          state={prepareTabulationData}
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
                  backgroundColor: Object.entries(activeFile.tags).find(
                    ([id, tag]) => tag.type === "Tag" && id.includes(label),
                  )?.[1]?.color,
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

      <WarningPopup
        isOpen = {deleteFilePopup}
        setIsOpen = {setDeleteFilePopup}
        warningMessage = {messages.deleteFileWarningMessage}
        onConfirm = {()=>handleRemoveFileConfirm(deleteFilePopup)}
      />
    </div>
  )
}
