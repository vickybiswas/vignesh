"use client"

import type React from "react"
import { useState, useCallback, useMemo, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
import { Search, Save, Table, X, Download, Upload, BookOpen, Edit } from "lucide-react"
import { generatePastelColor } from "@/utils/colors"
import { SynonymsPopup } from "./synonyms-popup"

const LOCAL_STORAGE_KEY = "textViewerState"

// New state structure
interface Occurrence {
  id: string // ID of Mark
  start: number
  end: number
  text: string // Text at position from content
}

interface TextFile {
  content: string
  occurrences: Occurrence[]
  dirty?: boolean
}

interface Mark {
  color: string
  type: "Tag" | "Search"
  name: string
}

interface Group {
  name: string
  marks: string[] // Array of mark IDs
}

interface Project {
  files: Record<string, TextFile>
  marks: Record<string, Mark>
  groups: Record<string, Group>
}

interface AppState {
  [projectName: string]: Project
}

export default function TextViewer() {
  const [projectName, setProjectName] = useState<string>("Text Analysis Project")
  const [state, setState] = useState<AppState>(() => {
    if (typeof window !== "undefined") {
      const savedState = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (savedState) {
        try {
          // Try to parse the saved state
          const parsed = JSON.parse(savedState)

          // Check if the saved state has the new structure
          if (parsed[Object.keys(parsed)[0]]?.files && parsed[Object.keys(parsed)[0]]?.marks) {
            return parsed
          }

          // If it has the old structure, convert it
          const newState: AppState = {}

          // If it's the previous version with projectName at the top level
          if (parsed.projectName && parsed.files && parsed.tags) {
            const projectName = parsed.projectName
            newState[projectName] = {
              files: {},
              marks: {},
              groups: {},
            }

            // Convert files
            Object.entries(parsed.files).forEach(([fileName, fileData]: [string, any]) => {
              newState[projectName].files[fileName] = {
                content: fileData.content,
                occurrences: [],
                dirty: fileData.dirty,
              }
            })

            // Convert tags to marks
            Object.entries(parsed.tags).forEach(([tagId, tagData]: [string, any]) => {
              const markId = tagId

              // Add mark
              newState[projectName].marks[markId] = {
                color: tagData.color,
                type: tagData.type,
                name: tagData.text,
              }

              // Add occurrences to files
              if (tagData.occurrences) {
                tagData.occurrences.forEach((occ: any) => {
                  if (newState[projectName].files[occ.fileId]) {
                    newState[projectName].files[occ.fileId].occurrences.push({
                      id: markId,
                      start: occ.start,
                      end: occ.end,
                      text: occ.text,
                    })
                  }
                })
              }
            })

            return newState
          }

          // Default state if conversion fails
          return {
            "Text Analysis Project": {
              files: {
                "sample.txt": {
                  content:
                    "This is a sample text. You can right-click on any part of this text to add tags to it, including overlapping tags.",
                  occurrences: [],
                },
              },
              marks: {},
              groups: {},
            },
          }
        } catch (e) {
          console.error("Error parsing saved state:", e)
        }
      }
    }

    // Default state
    return {
      "Text Analysis Project": {
        files: {
          "sample.txt": {
            content:
              "This is a sample text. You can right-click on any part of this text to add tags to it, including overlapping tags.",
            occurrences: [],
          },
        },
        marks: {},
        groups: {},
      },
    }
  })

  const [activeFile, setActiveFile] = useState<string>(() => {
    // Initialize with the first file in the project
    const project = state[projectName]
    if (project && project.files) {
      return Object.keys(project.files)[0] || ""
    }
    return ""
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
  const [isProjectNameDialogOpen, setIsProjectNameDialogOpen] = useState<boolean>(false)
  const [editedProjectName, setEditedProjectName] = useState<string>(projectName)
  const contentRef = useRef<HTMLDivElement>(null)
  const [isEditingContent, setIsEditingContent] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Get current project
  const currentProject = useMemo(() => state[projectName] || { files: {}, marks: {}, groups: {} }, [state, projectName])

  // Get current file
  const currentFile = useMemo(
    () => currentProject.files[activeFile] || { content: "", occurrences: [] },
    [currentProject, activeFile],
  )

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state))
  }, [state])

  // Calculate search occurrences when activeFile or searchTerm changes
  useEffect(() => {
    if (!searchTerm || !activeFile || !currentProject.files[activeFile]) return

    // Check if we already have this search term as a mark
    const existingSearchMark = Object.entries(currentProject.marks).find(
      ([_, mark]) => mark.type === "Search" && mark.name.toLowerCase() === searchTerm.toLowerCase(),
    )

    if (existingSearchMark) return // Don't recalculate if already exists

    // Find all occurrences in the text
    const content = currentProject.files[activeFile].content
    const results: Occurrence[] = []
    let index = content.toLowerCase().indexOf(searchTerm.toLowerCase())
    let counter = 0

    // Generate a temporary ID for this search
    const tempSearchId = `temp-search-${searchTerm.replace(/\s+/g, "-").toLowerCase()}`

    while (index !== -1) {
      results.push({
        id: tempSearchId,
        text: content.slice(index, index + searchTerm.length),
        start: index,
        end: index + searchTerm.length,
      })
      index = content.toLowerCase().indexOf(searchTerm.toLowerCase(), index + 1)
      counter++
      if (counter > 1000) break // Safety limit
    }

    // Update state with temporary search occurrences
    if (results.length > 0) {
      setState((prevState) => {
        const newState = { ...prevState }
        const newProject = { ...newState[projectName] }
        const newFile = {
          ...newProject.files[activeFile],
          occurrences: [
            ...newProject.files[activeFile].occurrences.filter((occ) => !occ.id.startsWith("temp-")),
            ...results,
          ],
        }

        newProject.files = { ...newProject.files, [activeFile]: newFile }
        newState[projectName] = newProject

        return newState
      })
    }
  }, [activeFile, searchTerm, currentProject, projectName])

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
      if (!selection || !label.trim() || !activeFile) return

      const selectedText = currentFile.content.slice(selection.start, selection.end)

      // Generate a unique ID for this mark
      const markId = `${type.toLowerCase()}-${label.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}`

      // Check if a similar mark already exists
      const existingMarkId = Object.entries(currentProject.marks).find(
        ([_, mark]) => mark.type === type && mark.name.toLowerCase() === label.toLowerCase(),
      )?.[0]

      setState((prevState) => {
        const newState = { ...prevState }
        const newProject = { ...newState[projectName] }

        // If mark doesn't exist, create it
        if (!existingMarkId) {
          newProject.marks = {
            ...newProject.marks,
            [markId]: {
              color: generatePastelColor(),
              type,
              name: label,
            },
          }
        }

        // Add occurrence to the file
        const newFile = {
          ...newProject.files[activeFile],
          occurrences: [
            ...newProject.files[activeFile].occurrences,
            {
              id: existingMarkId || markId,
              start: selection.start,
              end: selection.end,
              text: selectedText,
            },
          ],
        }

        newProject.files = { ...newProject.files, [activeFile]: newFile }
        newState[projectName] = newProject

        return newState
      })

      setSelection(null)
      setContextMenuPosition(null)
    },
    [activeFile, currentFile, currentProject.marks, projectName, selection],
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
    const tags: Array<{ id: string; name: string; color: string }> = []

    Object.entries(currentProject.marks).forEach(([id, mark]) => {
      if (mark.type === "Tag" && (selectedTagFilter === "all" || mark.name === selectedTagFilter)) {
        tags.push({ id, name: mark.name, color: mark.color })
      }
    })

    return tags
  }, [currentProject.marks, selectedTagFilter])

  // Get search results for the current search term
  const searchResults = useMemo(() => {
    if (!searchTerm || !activeFile) return []

    return currentFile.occurrences.filter((occ) => {
      // Check if this occurrence is for the current search term
      const mark = currentProject.marks[occ.id]
      return (
        (mark?.type === "Search" && mark.name.toLowerCase() === searchTerm.toLowerCase()) ||
        (occ.id.startsWith("temp-") && occ.id.includes(searchTerm.toLowerCase()))
      )
    })
  }, [activeFile, currentFile.occurrences, currentProject.marks, searchTerm])

  const saveSearch = useCallback(() => {
    if (!searchTerm || searchResults.length === 0) return

    // Generate a unique ID for this search mark
    const searchId = `search-${searchTerm.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}`

    // Check if a similar search mark already exists
    const existingSearchId = Object.entries(currentProject.marks).find(
      ([_, mark]) => mark.type === "Search" && mark.name.toLowerCase() === searchTerm.toLowerCase(),
    )?.[0]

    if (existingSearchId) return // Search already exists

    setState((prevState) => {
      const newState = { ...prevState }
      const newProject = { ...newState[projectName] }

      // Create the search mark
      newProject.marks = {
        ...newProject.marks,
        [searchId]: {
          color: generatePastelColor(),
          type: "Search",
          name: searchTerm,
        },
      }

      // Update temporary occurrences to use the new mark ID
      const newFile = {
        ...newProject.files[activeFile],
        occurrences: newProject.files[activeFile].occurrences.map((occ) => {
          if (occ.id.startsWith("temp-") && occ.id.includes(searchTerm.toLowerCase())) {
            return { ...occ, id: searchId }
          }
          return occ
        }),
      }

      newProject.files = { ...newProject.files, [activeFile]: newFile }
      newState[projectName] = newProject

      return newState
    })
  }, [activeFile, currentProject.marks, projectName, searchResults.length, searchTerm])

  // Get unique tag names
  const uniqueTagLabels = useMemo(() => {
    const labels: string[] = []

    Object.values(currentProject.marks).forEach((mark) => {
      if (mark.type === "Tag" && !labels.includes(mark.name)) {
        labels.push(mark.name)
      }
    })

    return labels
  }, [currentProject.marks])

  // Get saved searches
  const savedSearches = useMemo(() => {
    const searches: Array<{ id: string; name: string; color: string }> = []

    Object.entries(currentProject.marks).forEach(([id, mark]) => {
      if (mark.type === "Search") {
        searches.push({ id, name: mark.name, color: mark.color })
      }
    })

    return searches
  }, [currentProject.marks])

  const handleContentChange = useCallback(
    (newContent: string) => {
      setState((prevState) => {
        const newState = { ...prevState }
        const newProject = { ...newState[projectName] }
        const newFile = {
          ...newProject.files[activeFile],
          content: newContent,
          dirty: true,
        }

        newProject.files = { ...newProject.files, [activeFile]: newFile }
        newState[projectName] = newProject

        return newState
      })
    },
    [activeFile, projectName],
  )

  const handleSelectFile = useCallback((fileName: string) => {
    setActiveFile(fileName)
    setSelectedTagFilter("all")
    setSearchTerm("")
  }, [])

  const handleAddFile = useCallback(
    (fileName: string, content: string) => {
      if (!currentProject.files[fileName]) {
        setState((prevState) => {
          const newState = { ...prevState }
          const newProject = { ...newState[projectName] }

          newProject.files = {
            ...newProject.files,
            [fileName]: {
              content,
              occurrences: [],
              dirty: true,
            },
          }

          newState[projectName] = newProject
          return newState
        })

        setActiveFile(fileName)
      }
    },
    [currentProject.files, projectName],
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
      setActiveFile(occurrence.file)
      handleSpecificSearchClick(occurrence)
      setShowTabulationView(false)
    },
    [handleSpecificSearchClick],
  )

  const handleDownloadState = useCallback(() => {
    const stateString = JSON.stringify(state, null, 2)
    const blob = new Blob([stateString], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${projectName.replace(/\s+/g, "-").toLowerCase()}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [state, projectName])

  const handleUploadState = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        try {
          const uploadedState = JSON.parse(content) as AppState
          setState(uploadedState)

          // Set project name to the first project in the uploaded state
          const firstProjectName = Object.keys(uploadedState)[0]
          if (firstProjectName) {
            setProjectName(firstProjectName)

            // Set active file to the first file in the project
            const firstFileName = Object.keys(uploadedState[firstProjectName].files)[0]
            if (firstFileName) {
              setActiveFile(firstFileName)
            }
          }
        } catch (error) {
          console.error("Error parsing uploaded state:", error)
          alert("Invalid state file. Please upload a valid JSON file.")
        }
      }
      reader.readAsText(file)
    }
  }, [])

  const handleRemoveSearch = useCallback(
    (searchId: string) => {
      setState((prevState) => {
        const newState = { ...prevState }
        const newProject = { ...newState[projectName] }

        // Remove the mark
        const { [searchId]: _, ...remainingMarks } = newProject.marks
        newProject.marks = remainingMarks

        // Remove occurrences from all files
        Object.keys(newProject.files).forEach((fileName) => {
          newProject.files[fileName] = {
            ...newProject.files[fileName],
            occurrences: newProject.files[fileName].occurrences.filter((occ) => occ.id !== searchId),
          }
        })

        // Remove from groups
        Object.keys(newProject.groups).forEach((groupId) => {
          if (newProject.groups[groupId].marks.includes(searchId)) {
            newProject.groups[groupId] = {
              ...newProject.groups[groupId],
              marks: newProject.groups[groupId].marks.filter((id) => id !== searchId),
            }
          }
        })

        newState[projectName] = newProject
        return newState
      })
    },
    [projectName],
  )

  const handleSaveFile = useCallback(
    (fileName: string) => {
      const fileContent = currentProject.files[fileName].content
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
    [currentProject.files],
  )

  const handleRemoveFile = useCallback(
    (fileName: string) => {
      setState((prevState) => {
        const newState = { ...prevState }
        const newProject = { ...newState[projectName] }

        // Remove the file
        const { [fileName]: _, ...remainingFiles } = newProject.files
        newProject.files = remainingFiles

        newState[projectName] = newProject

        // Set new active file if needed
        if (fileName === activeFile) {
          const newActiveFile = Object.keys(remainingFiles)[0] || ""
          setActiveFile(newActiveFile)
        }

        return newState
      })
    },
    [activeFile, projectName],
  )

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
    if (!searchTerm || !activeFile) return

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
        synonymsList = generateFallbackSynonyms(searchTerm, currentFile.content)
      }

      setSynonyms(synonymsList)
    } catch (error) {
      console.error("Error fetching synonyms:", error)
      // Use fallback synonyms
      const fallbackSynonyms = generateFallbackSynonyms(searchTerm, currentFile.content)
      setSynonyms(fallbackSynonyms)
    } finally {
      setIsFetchingSynonyms(false)
    }
  }, [searchTerm, activeFile, generateFallbackSynonyms, currentFile.content])

  const handleSaveSynonyms = useCallback(
    (selectedSynonyms: string[]) => {
      if (!activeFile) return

      // Process each selected synonym
      selectedSynonyms.forEach((synonym) => {
        // Generate a unique ID for this search mark
        const searchId = `search-${synonym.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}`

        // Find all occurrences of the synonym in the current file
        const content = currentFile.content
        const occurrences: Occurrence[] = []
        let index = content.toLowerCase().indexOf(synonym.toLowerCase())
        let counter = 0

        while (index !== -1 && counter < 1000) {
          occurrences.push({
            id: searchId,
            text: content.slice(index, index + synonym.length),
            start: index,
            end: index + synonym.length,
          })

          index = content.toLowerCase().indexOf(synonym.toLowerCase(), index + 1)
          counter++
        }

        // Only update if we found occurrences
        if (occurrences.length > 0) {
          setState((prevState) => {
            const newState = { ...prevState }
            const newProject = { ...newState[projectName] }

            // Create the search mark
            newProject.marks = {
              ...newProject.marks,
              [searchId]: {
                color: generatePastelColor(),
                type: "Search",
                name: synonym,
              },
            }

            // Add occurrences to the file
            const newFile = {
              ...newProject.files[activeFile],
              occurrences: [...newProject.files[activeFile].occurrences, ...occurrences],
            }

            newProject.files = { ...newProject.files, [activeFile]: newFile }
            newState[projectName] = newProject

            return newState
          })
        }
      })

      setShowSynonymsPopup(false)
    },
    [activeFile, currentFile.content, projectName],
  )

  const renderContent = useCallback(() => {
    if (!activeFile || !currentFile.content) return null

    // Collect all occurrences for the current file
    const allOccurrences: Array<{
      start: number
      end: number
      markId: string
      type: "Search" | "Tag"
      name: string
      color: string
    }> = []

    currentFile.occurrences.forEach((occurrence) => {
      const mark = currentProject.marks[occurrence.id]

      // Skip if mark doesn't exist (could be temporary search)
      if (!mark && !occurrence.id.startsWith("temp-")) return

      allOccurrences.push({
        start: occurrence.start,
        end: occurrence.end,
        markId: occurrence.id,
        type: mark?.type || "Search",
        name: mark?.name || (occurrence.id.startsWith("temp-") ? searchTerm : "Unknown"),
        color: mark?.color || "hsl(200, 100%, 80%)", // Default color for temp searches
      })
    })

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
    positions.add(currentFile.content.length)

    // Convert to array and sort
    const sortedPositions = Array.from(positions).sort((a, b) => a - b)

    // Create segments
    for (let i = 0; i < sortedPositions.length - 1; i++) {
      const start = sortedPositions[i]
      const end = sortedPositions[i + 1]

      if (start === end) continue

      const text = currentFile.content.slice(start, end)
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
          (occurrence.type === "Search" && occurrence.name === searchTerm) ||
          (occurrence.type === "Tag" && occurrence.name === selectedTagFilter),
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
      const title = segment.occurrences.map((occurrence) => `${occurrence.type}: ${occurrence.name}`).join("\n")

      return (
        <mark key={index} style={style} title={title} className="rounded-sm">
          {segment.text}
        </mark>
      )
    })
  }, [activeFile, currentFile, currentProject.marks, searchTerm, selectedTagFilter])

  // Prepare tag data for TagAnalysis
  const prepareTagsForAnalysis = useCallback(() => {
    if (!activeFile) return []

    const tagData: Array<{
      id: string
      text: string
      color: string
      positions: Record<string, Array<{ text: string; start: number; stop: number }>>
    }> = []

    // Group occurrences by tag name
    const tagsByName: Record<
      string,
      {
        id: string
        color: string
        positions: Record<string, Array<{ text: string; start: number; stop: number }>>
      }
    > = {}

    // Find all tag occurrences in the current file
    currentFile.occurrences.forEach((occurrence) => {
      const mark = currentProject.marks[occurrence.id]
      if (!mark || mark.type !== "Tag") return

      if (!tagsByName[mark.name]) {
        tagsByName[mark.name] = {
          id: occurrence.id,
          color: mark.color,
          positions: {
            [activeFile]: [],
          },
        }
      }

      tagsByName[mark.name].positions[activeFile].push({
        text: occurrence.text,
        start: occurrence.start,
        stop: occurrence.end,
      })
    })

    // Convert to array format
    Object.entries(tagsByName).forEach(([name, data]) => {
      tagData.push({
        id: data.id,
        text: name,
        color: data.color,
        positions: data.positions,
      })
    })

    return tagData
  }, [activeFile, currentFile.occurrences, currentProject.marks])

  // Prepare search data for SearchAnalysis
  const prepareSearchesForAnalysis = useCallback(() => {
    if (!activeFile) return []

    const searches: Array<{
      id: string
      text: string
      color: string
      occurrences: Array<{ text: string; start: number; stop: number }>
    }> = []

    // Group by search name
    const searchesByName: Record<
      string,
      {
        id: string
        color: string
        occurrences: Array<{ text: string; start: number; stop: number }>
      }
    > = {}

    // Find all search occurrences in the current file
    currentFile.occurrences.forEach((occurrence) => {
      const mark = currentProject.marks[occurrence.id]

      // Handle both saved searches and temporary searches
      if ((mark && mark.type === "Search") || occurrence.id.startsWith("temp-")) {
        const searchName = mark?.name || searchTerm

        if (!searchesByName[searchName]) {
          searchesByName[searchName] = {
            id: occurrence.id,
            color: mark?.color || "hsl(200, 100%, 80%)",
            occurrences: [],
          }
        }

        searchesByName[searchName].occurrences.push({
          text: occurrence.text,
          start: occurrence.start,
          stop: occurrence.end,
        })
      }
    })

    // Convert to array format
    Object.entries(searchesByName).forEach(([name, data]) => {
      searches.push({
        id: data.id,
        text: name,
        color: data.color,
        occurrences: data.occurrences,
      })
    })

    return searches
  }, [activeFile, currentFile.occurrences, currentProject.marks, searchTerm])

  const handleSearch = useCallback((event: React.FormEvent) => {
    event.preventDefault()
    // Search is handled by the useEffect
  }, [])

  // Prepare tabulation data
  const prepareTabulationData = useMemo(() => {
    if (!showTabulationView) return null

    // Get all mark names for tabulation options
    const markOptions = Object.values(currentProject.marks).map((mark) => mark.name)

    // Prepare data for TabulationView
    return {
      markOptions,
      files: Object.keys(currentProject.files),
      activeFile,
      getOccurrences: (markName: string, fileName: string) => {
        // Find all occurrences of this mark in the file
        const file = currentProject.files[fileName]
        if (!file) return []

        // Find mark IDs that match this name
        const markIds = Object.entries(currentProject.marks)
          .filter(([_, mark]) => mark.name === markName)
          .map(([id]) => id)

        // Get occurrences
        return file.occurrences
          .filter((occ) => markIds.includes(occ.id))
          .map((occ) => ({
            text: occ.text,
            start: occ.start,
            end: occ.end,
            file: fileName,
          }))
      },
    }
  }, [showTabulationView, currentProject.marks, currentProject.files, activeFile])

  const handleProjectNameChange = useCallback(() => {
    if (editedProjectName === projectName) return

    setState((prevState) => {
      const newState = { ...prevState }

      // Rename the project
      newState[editedProjectName] = newState[projectName]
      delete newState[projectName]

      return newState
    })

    setProjectName(editedProjectName)
    setIsProjectNameDialogOpen(false)
  }, [editedProjectName, projectName])

  return (
    <div className="container mx-auto py-6 h-screen flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{projectName}</h1>
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
        </div>
        <div className="flex items-center gap-2">
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
      <div className="flex flex-grow overflow-hidden">
        <FileList
          files={Object.keys(currentProject.files)}
          activeFile={activeFile}
          onSelectFile={handleSelectFile}
          onAddFile={handleAddFile}
          onUploadFile={handleUploadFile}
          onSaveFile={handleSaveFile}
          onRemoveFile={handleRemoveFile}
        />
        <div className="flex-grow grid gap-6 md:grid-cols-[1fr_400px] h-full overflow-hidden">
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
                          backgroundColor: Object.values(currentProject.marks).find(
                            (mark) => mark.type === "Tag" && mark.name === label,
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
                    searchResults.length === 0 ||
                    savedSearches.some((s) => s.name.toLowerCase() === searchTerm.toLowerCase())
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
            {isEditingContent ? (
              <Textarea
                className="text-lg p-4 border rounded whitespace-pre-wrap h-full w-full overflow-auto font-mono"
                value={currentFile?.content || ""}
                onChange={(e) => handleContentChange(e.target.value)}
                onBlur={() => setIsEditingContent(false)}
                autoFocus
              />
            ) : (
              <div
                ref={contentRef}
                className="text-lg p-4 border rounded relative whitespace-pre-wrap h-full overflow-auto"
                onClick={() => setIsEditingContent(true)}
                onContextMenu={handleContextMenu}
                tabIndex={0}
              >
                {currentFile?.content ? renderContent() : null}
              </div>
            )}
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
              tags={prepareTagsForAnalysis()}
              onTagClick={handleTagClick}
              onOccurrenceClick={handleSpecificSearchClick}
              highlightedTag={selectedTagFilter}
              activeFile={activeFile}
            />
            <SearchAnalysis
              content={currentFile?.content || ""}
              currentSearchResults={searchResults.map((r) => ({ text: r.text, start: r.start, stop: r.end }))}
              savedSearches={prepareSearchesForAnalysis()}
              onSelectSearch={handleSearchClick}
              onSelectSpecificSearch={handleSpecificSearchClick}
              onRemoveSearch={(searchName) => {
                const searchId = Object.entries(currentProject.marks).find(
                  ([_, mark]) => mark.type === "Search" && mark.name === searchName,
                )?.[0]
                if (searchId) handleRemoveSearch(searchId)
              }}
              highlightedSearch={searchTerm}
              activeFile={activeFile}
            />
          </div>
        </div>
      </div>
      {showTabulationView && prepareTabulationData && (
        <TabulationView
          data={prepareTabulationData}
          onClose={() => setShowTabulationView(false)}
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
              <div
                className={`w-3 h-3 rounded`}
                style={{
                  backgroundColor: Object.values(currentProject.marks).find(
                    (mark) => mark.type === "Tag" && mark.name === label,
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
