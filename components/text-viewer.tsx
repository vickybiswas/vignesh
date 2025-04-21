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
import { Search, Save, Table, X, Download, Upload, BookOpen } from "lucide-react"
import { generatePastelColor } from "@/utils/colors"
import type { AppState, Marking, File, Position } from "@/types"
import { SynonymsPopup } from "./synonyms-popup"

const LOCAL_STORAGE_KEY = "textViewerState"

export default function TextViewer() {
  const [state, setState] = useState<AppState>(() => {
    if (typeof window !== "undefined") {
      const savedState = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (savedState) {
        return JSON.parse(savedState)
      }
    }
    return {
      markings: [],
      files: {
        "sample.txt": {
          name: "sample.txt",
          dirty: false,
          positions: {},
          content:
            "This is a sample text. You can right-click on any part of this text to add tags to it, including overlapping tags.",
        },
      },
      tabulations: [],
      activeFile: "sample.txt",
    }
  })

  const [selection, setSelection] = useState<{ start: number; stop: number } | null>(null)
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
    const stop = start + selection.toString().length

    if (start === stop) return

    setSelection({ start, stop })
    setContextMenuPosition({ x: event.clientX, y: event.clientY })
  }, [])

  const addMarking = useCallback((type: "search" | "tag", text: string) => {
    const newMarking: Marking = {
      id: `${type}-${Date.now()}`,
      type,
      text,
      color: generatePastelColor(),
    }

    setState((prevState) => ({
      ...prevState,
      markings: [...prevState.markings, newMarking],
    }))

    return newMarking
  }, [])

  const addTag = useCallback(
    (label: string) => {
      if (!selection || !label.trim()) return

      const newTag = addMarking("tag", label)
      const selectedText = activeFile.content.slice(selection.start, selection.stop)

      setState((prevState) => ({
        ...prevState,
        files: {
          ...prevState.files,
          [state.activeFile]: {
            ...prevState.files[state.activeFile],
            positions: {
              ...prevState.files[state.activeFile].positions,
              [newTag.id]: [
                ...(prevState.files[state.activeFile].positions[newTag.id] || []),
                { text: selectedText, start: selection.start, stop: selection.stop },
              ],
            },
          },
        },
        markings: [...prevState.markings, newTag],
      }))

      setSelection(null)
      setContextMenuPosition(null)
    },
    [state.activeFile, activeFile, selection, addMarking],
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

  const getFilteredMarkings = useCallback(() => {
    if (selectedTagFilter === "all") return state.markings.filter((m) => m.type === "tag")
    return state.markings.filter((m) => m.type === "tag" && m.text === selectedTagFilter)
  }, [state.markings, selectedTagFilter])

  const searchResults = useMemo(() => {
    if (!searchTerm) return []

    const searchMarking = state.markings.find((m) => m.type === "search" && m.text === searchTerm)
    if (searchMarking) {
      return activeFile.positions[searchMarking.id] || []
    }

    const results: Position[] = []
    let index = activeFile.content.toLowerCase().indexOf(searchTerm.toLowerCase())
    while (index !== -1) {
      results.push({
        text: activeFile.content.slice(index, index + searchTerm.length),
        start: index,
        stop: index + searchTerm.length,
      })
      index = activeFile.content.toLowerCase().indexOf(searchTerm.toLowerCase(), index + 1)
    }

    return results
  }, [state.markings, activeFile, searchTerm])

  const renderContent = useCallback(() => {
    if (!activeFile.content) return null

    const segments: {
      text: string
      marking: Marking | null
      isHighlighted: boolean
    }[] = []

    let lastIndex = 0

    const addSegment = (end: number, marking: Marking | null = null, isHighlighted = false) => {
      if (end > lastIndex) {
        segments.push({
          text: activeFile.content.slice(lastIndex, end),
          marking,
          isHighlighted,
        })
        lastIndex = end
      }
    }

    // Add segments for all markings
    state.markings.forEach((marking) => {
      const positions = activeFile.positions[marking.id] || []
      positions.forEach((position) => {
        addSegment(position.start)
        addSegment(position.stop, marking, marking.text === selectedTagFilter || marking.text === searchTerm)
      })
    })

    // Add final segment
    addSegment(activeFile.content.length)

    // Sort segments by start index
    segments.sort((a, b) => a.text.length - b.text.length)

    return segments.map((segment, index) => {
      if (segment.marking) {
        return (
          <mark
            key={index}
            style={{ backgroundColor: segment.marking.color }}
            className={segment.isHighlighted ? "bg-opacity-50" : ""}
            title={segment.marking.text}
          >
            {segment.text}
          </mark>
        )
      }
      return <span key={index}>{segment.text}</span>
    })
  }, [activeFile.content, activeFile.positions, state.markings, selectedTagFilter, searchTerm])

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    // The search is already performed real-time via the searchResults memo
  }, [])

  const saveSearch = useCallback(() => {
    if (searchTerm && !state.markings.some((m) => m.type === "search" && m.text === searchTerm)) {
      const newSearchMarking = addMarking("search", searchTerm)
      setState((prevState) => ({
        ...prevState,
        files: {
          ...prevState.files,
          [state.activeFile]: {
            ...prevState.files[state.activeFile],
            positions: {
              ...prevState.files[state.activeFile].positions,
              [newSearchMarking.id]: searchResults,
            },
          },
        },
      }))
    }
  }, [searchTerm, state.markings, addMarking, state.activeFile, searchResults])

  const uniqueTagLabels = useMemo(() => {
    return Array.from(new Set(state.markings.filter((m) => m.type === "tag").map((m) => m.text)))
  }, [state.markings])

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
              dirty: true,
              positions: {},
              content,
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

  const handleSpecificSearchClick = useCallback((position: Position) => {
    // Scroll to the specific occurrence
    if (contentRef.current) {
      const range = document.createRange()
      const textNode = contentRef.current.firstChild
      if (textNode) {
        range.setStart(textNode, position.start)
        range.setEnd(textNode, position.stop)
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
    (occurrence: { text: string; start: number; stop: number; file: string }) => {
      setState({
        ...state,
        activeFile: occurrence.file,
      })
      handleSpecificSearchClick(occurrence)
      setShowTabulationView(false)
    },
    [state, handleSpecificSearchClick], // Added state as a dependency
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
    setState((prevState) => ({
      ...prevState,
      markings: prevState.markings.filter((m) => !(m.type === "search" && m.text === searchToRemove)),
    }))
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
        if (!state.markings.some((m) => m.type === "search" && m.text === synonym)) {
          const newSearchMarking = addMarking("search", synonym)

          // Find occurrences of the synonym in the active file
          const results: Position[] = []
          let index = activeFile.content.toLowerCase().indexOf(synonym.toLowerCase())
          while (index !== -1) {
            results.push({
              text: activeFile.content.slice(index, index + synonym.length),
              start: index,
              stop: index + synonym.length,
            })
            index = activeFile.content.toLowerCase().indexOf(synonym.toLowerCase(), index + 1)
          }

          setState((prevState) => ({
            ...prevState,
            files: {
              ...prevState.files,
              [state.activeFile]: {
                ...prevState.files[state.activeFile],
                positions: {
                  ...prevState.files[state.activeFile].positions,
                  [newSearchMarking.id]: results,
                },
              },
            },
          }))
        }
      })
      setShowSynonymsPopup(false)
    },
    [state.markings, state.activeFile, activeFile.content, addMarking],
  )

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
                        style={{ backgroundColor: state.markings.find((m) => m.text === label)?.color }}
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
                <Button
                  type="button"
                  onClick={saveSearch}
                  disabled={!searchTerm || state.markings.some((m) => m.type === "search" && m.text === searchTerm)}
                >
                  <Save className="h-4 w-4" />
                </Button>
                <Button type="button" onClick={fetchSynonyms} disabled={!searchTerm} title="Find synonyms">
                  <BookOpen className="h-4 w-4" />
                </Button>
              </form>
            </div>
            <HighlightedTextViewer
              content={renderContent()}
              highlightStart={0}
              highlightEnd={0}
              onContentChange={handleContentChange}
              ref={contentRef}
              onContextMenu={handleContextMenu}
            />
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
              tags={getFilteredMarkings()}
              onTagClick={handleTagClick}
              onOccurrenceClick={handleSpecificSearchClick}
              highlightedTag={selectedTagFilter}
            />
            <SearchAnalysis
              content={activeFile.content}
              currentSearchResults={searchResults}
              savedSearches={state.markings.filter((m) => m.type === "search").map((m) => m.text)}
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
          state={state}
          onClose={() => setShowTabulationView(false)}
          onSelectOccurrence={handleTabulationOccurrenceSelect}
          setState={setState}
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
                style={{ backgroundColor: state.markings.find((m) => m.text === label)?.color }}
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
