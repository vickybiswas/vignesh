"use client"

import type React from "react"

import { createContext, useState, useRef, useCallback, useMemo, useEffect, type ReactNode } from "react"
import { useToast } from "@/hooks/use-toast"
import { generatePastelColor } from "@/utils/colors"
import * as gtag from "@/lib/gtag"
// Sample initial state
import sampleState from './sample.json'

const LOCAL_STORAGE_KEY = "textViewerState"

// Types
interface Occurrence {
  id: string
  start: number
  end: number
  text: string
}

// Deduplicate occurrences by (id, start, end)
const dedupeOccurrences = (occs: Occurrence[]): Occurrence[] => {
  const seen = new Set<string>()
  return occs.filter((o) => {
    const key = `${o.id}-${o.start}-${o.end}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
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
  marks: string[]
  color: string
}

interface Project {
  files: Record<string, TextFile>
  marks: Record<string, Mark>
  groups: Record<string, Group>
}

interface AppState {
  [projectName: string]: Project
}

interface ProjectContextType {
  state: AppState
  projectName: string
  setProjectName: (name: string) => void
  projectNames: string[]
  currentProject: Project
  activeFile: string
  setActiveFile: (file: string) => void
  currentFile: TextFile
  selectedTagFilter: string
  setSelectedTagFilter: (filter: string) => void
  searchTerm: string
  setSearchTerm: (term: string) => void
  showTabulationView: boolean
  setShowTabulationView: (show: boolean) => void
  // Tabulation view persistent configuration
  tabulationRowSelections: string[]
  setTabulationRowSelections: (rows: string[]) => void
  tabulationColumnSelections: string[]
  setTabulationColumnSelections: (cols: string[]) => void
  tabulationExpansionType: number
  setTabulationExpansionType: (type: number) => void
  showSynonymsPopup: boolean
  setShowSynonymsPopup: (show: boolean) => void
  synonyms: string[]
  setSynonyms: (synonyms: string[]) => void
  isFetchingSynonyms: boolean
  setIsFetchingSynonyms: (isFetching: boolean) => void
  isNewTagDialogOpen: boolean
  setIsNewTagDialogOpen: (isOpen: boolean) => void
  isNewGroupDialogOpen: boolean
  setIsNewGroupDialogOpen: (isOpen: boolean) => void
  isEditGroupDialogOpen: boolean
  setIsEditGroupDialogOpen: (isOpen: boolean) => void
  isRefreshingSearch: boolean
  setIsRefreshingSearch: (isRefreshing: boolean) => void
  newTagLabel: string
  setNewTagLabel: (label: string) => void
  newGroupName: string
  setNewGroupName: (name: string) => void
  selectedGroupForEdit: string | null
  setSelectedGroupForEdit: (groupId: string | null) => void
  contentRef: React.RefObject<HTMLDivElement>
  fileInputRef: React.RefObject<HTMLInputElement>
  selection: { start: number; end: number } | null
  setSelection: (selection: { start: number; end: number } | null) => void
  contextMenuPosition: { x: number; y: number } | null
  setContextMenuPosition: (position: { x: number; y: number } | null) => void
  searchResults: Occurrence[]
  uniqueTagLabels: string[]
  savedSearches: Array<{ id: string; name: string; color: string }>
  groups: Array<{ id: string; name: string; color: string; marks: string[] }>

  // Functions
  handleSelectFile: (fileName: string) => void
  handleAddFile: (fileName: string, content: string) => void
  handleUploadFile: (file: File) => void
  handleSaveFile: (fileName: string) => void
  handleRemoveFile: (fileName: string) => void
  handleTagClick: (label: string) => void
  handleSearchClick: (search: string) => void
  handleSpecificSearchClick: (position: { start: number; end: number }) => void
  handleTagFilterChange: (value: string) => void
  handleContentChange: (newContent: string) => void
  handleContextMenu: (event: React.MouseEvent) => void
  addTag: (label: string, type?: "Tag" | "Search") => void
  handleNewTag: () => void
  submitNewTag: () => void
  saveSearch: () => void
  fetchSynonyms: () => Promise<void>
  handleSaveSynonyms: (selectedSynonyms: string[]) => void
  handleDownloadState: () => void
  handleUploadState: (event: React.ChangeEvent<HTMLInputElement>) => void
  handleRemoveSearch: (searchName: string) => void
  handleRemoveTag: (tagId: string) => void
  handleRemoveOccurrence: (tagId: string, position: { start: number; end: number }) => void
  renderContent: () => React.ReactNode
  prepareTagsForAnalysis: () => Array<{
    id: string
    text: string
    color: string
    positions: Record<string, Array<{ text: string; start: number; stop: number }>>
  }>
  prepareSearchesForAnalysis: () => Array<{
    id: string
    text: string
    color: string
    occurrences: Array<{ text: string; start: number; stop: number }>
  }>
  handleSearch: (event: React.FormEvent) => void
  createNewProject: (name: string) => void
  switchProject: (name: string) => void
  deleteProject: (name: string) => void
  updateProjectName: (oldName: string, newName: string) => void
  createGroup: (name: string) => void
  addMarkToGroup: (groupId: string, markId: string) => void
  removeMarkFromGroup: (groupId: string, markId: string) => void
  deleteGroup: (groupId: string) => void
  updateGroupMarks: (groupId: string, markIds: string[]) => void
  /**
   * Save all occurrences in a group as a new tag
   */
  saveGroupAsTag: (groupId: string, tagName: string) => void
  refreshAllSearches: () => void
  getMarksByGroup: (groupId: string) => Array<{ id: string; name: string; type: "Tag" | "Search"; color: string }>
  getAllMarksForTabulation: () => Array<{ id: string; name: string; prefix: string; color: string }>
}

export const ProjectContext = createContext<ProjectContextType>({} as ProjectContextType)

interface ProjectProviderProps {
  children: ReactNode
}

export function ProjectProvider({ children }: ProjectProviderProps) {
  const [projectName, setProjectName] = useState<string>("Sample Research Project")
  const [state, setState] = useState<AppState>(() => {
    if (typeof window !== "undefined") {
      try {
        const savedState = localStorage.getItem(LOCAL_STORAGE_KEY)
        if (savedState) {
          const parsed = JSON.parse(savedState)

          // Check if the saved state has the new structure
          if (
            parsed &&
            typeof parsed === "object" &&
            Object.keys(parsed).length > 0 &&
            parsed[Object.keys(parsed)[0]]?.files &&
            parsed[Object.keys(parsed)[0]]?.marks
          ) {
            // Ensure groups have color property
            Object.keys(parsed).forEach((projectKey) => {
              if (parsed[projectKey].groups) {
                Object.keys(parsed[projectKey].groups).forEach((groupId) => {
                  if (!parsed[projectKey].groups[groupId].color) {
                    parsed[projectKey].groups[groupId].color = generatePastelColor()
                  }
                })
              }
            })
            return parsed
          }

          // If it has the old structure, convert it
          if (parsed && typeof parsed === "object") {
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
              if (parsed.files && typeof parsed.files === "object") {
                Object.entries(parsed.files).forEach(([fileName, fileData]: [string, any]) => {
                  if (fileData) {
                    newState[projectName].files[fileName] = {
                      content: fileData.content || "",
                      occurrences: [],
                      dirty: !!fileData.dirty,
                    }
                  }
                })
              }

              // Convert tags to marks
              if (parsed.tags && typeof parsed.tags === "object") {
                Object.entries(parsed.tags).forEach(([tagId, tagData]: [string, any]) => {
                  if (tagData) {
                    const markId = tagId

                    // Add mark
                    newState[projectName].marks[markId] = {
                      color: tagData.color || generatePastelColor(),
                      type: tagData.type || "Tag",
                      name: tagData.text || "Unnamed Tag",
                    }

                    // Add occurrences to files
                    if (tagData.occurrences && Array.isArray(tagData.occurrences)) {
                      tagData.occurrences.forEach((occ: any) => {
                        if (occ && occ.fileId && newState[projectName].files[occ.fileId]) {
                          newState[projectName].files[occ.fileId].occurrences.push({
                            id: markId,
                            start: occ.start || 0,
                            end: occ.end || 0,
                            text: occ.text || "",
                          })
                        }
                      })
                    }
                  }
                })
              }

              return newState
            }
          }
        }
      } catch (e) {
        console.error("Error parsing saved state:", e)
      }
    }

    // Default state: use sampleState
    return sampleState as AppState
  })

  const [activeFile, setActiveFile] = useState<string>(() => {
    // Initialize with the first file in the project
    const project = state[projectName]
    if (project && project.files && Object.keys(project.files).length > 0) {
      return Object.keys(project.files)[0]
    }
    return ""
  })

  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null)
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null)
  const [newTagLabel, setNewTagLabel] = useState<string>("")
  const [newGroupName, setNewGroupName] = useState<string>("")
  const [selectedGroupForEdit, setSelectedGroupForEdit] = useState<string | null>(null)
  const [isNewTagDialogOpen, setIsNewTagDialogOpen] = useState<boolean>(false)
  const [isNewGroupDialogOpen, setIsNewGroupDialogOpen] = useState<boolean>(false)
  const [isEditGroupDialogOpen, setIsEditGroupDialogOpen] = useState<boolean>(false)
  const [isRefreshingSearch, setIsRefreshingSearch] = useState<boolean>(false)
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [showTabulationView, setShowTabulationView] = useState<boolean>(false)
  // Tabulation view persistent configuration
  const [tabulationRowSelections, setTabulationRowSelections] = useState<string[]>([])
  const [tabulationColumnSelections, setTabulationColumnSelections] = useState<string[]>([])
  const [tabulationExpansionType, setTabulationExpansionType] = useState<number>(0)
  // Toast notifications
  const { toast } = useToast()
  // OpenAI API key and UI state
  const [apiKey, setApiKey] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('OPENAI_API_KEY') || ''
    }
    return ''
  })
  const [showApiKeyDialog, setShowApiKeyDialog] = useState<boolean>(false)
  // Function to save OpenAI API key
  const handleSaveApiKey = useCallback((key: string) => {
    setApiKey(key)
    localStorage.setItem('OPENAI_API_KEY', key)
    setShowApiKeyDialog(false)
    toast({ title: 'API Key Saved', description: 'Your OpenAI API key was saved successfully.' })
  }, [toast])
  // Synonyms state
  const [showSynonymsPopup, setShowSynonymsPopup] = useState<boolean>(false)
  const [synonyms, setSynonyms] = useState<string[]>([])
  const [isFetchingSynonyms, setIsFetchingSynonyms] = useState<boolean>(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Get list of project names
  const projectNames = useMemo(() => {
    return Object.keys(state)
  }, [state])

  // Get current project
  const currentProject = useMemo(() => {
    const project = state[projectName]
    return project || { files: {}, marks: {}, groups: {} }
  }, [state, projectName])

  // Get current file
  const currentFile = useMemo(() => {
    if (!currentProject || !currentProject.files || !activeFile) {
      return { content: "", occurrences: [] }
    }
    return currentProject.files[activeFile] || { content: "", occurrences: [] }
  }, [currentProject, activeFile])

  // Get groups
  const groups = useMemo(() => {
    const groupsArray: Array<{ id: string; name: string; color: string; marks: string[] }> = []

    if (currentProject && currentProject.groups) {
      Object.entries(currentProject.groups).forEach(([id, group]) => {
        groupsArray.push({
          id,
          name: group.name,
          color: group.color || generatePastelColor(),
          marks: group.marks || [],
        })
      })
    }

    return groupsArray
  }, [currentProject])

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state))
  }, [state])


  // Function to perform search
  const performSearch = useCallback(
    (term: string) => {
      if (!term || !activeFile || !currentProject.files[activeFile]) return

      // Check if we already have this search term as a mark
      const existingSearchMark = Object.entries(currentProject.marks || {}).find(
        ([_, mark]) => mark.type === "Search" && mark.name.toLowerCase() === term.toLowerCase(),
      )

      if (existingSearchMark) return // Don't recalculate if already exists

      // Find all occurrences in the text
      const content = currentProject.files[activeFile].content
      const results: Occurrence[] = []
      let index = content.toLowerCase().indexOf(term.toLowerCase())
      let counter = 0

      // Generate a temporary ID for this search
      const tempSearchId = `temp-search-${term.replace(/\s+/g, "-").toLowerCase()}`

      while (index !== -1) {
        results.push({
          id: tempSearchId,
          text: content.slice(index, index + term.length),
          start: index,
          end: index + term.length,
        })
        index = content.toLowerCase().indexOf(term.toLowerCase(), index + 1)
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
              ...(newProject.files[activeFile].occurrences || []).filter((occ) => !occ.id.startsWith("temp-")),
              ...results,
            ],
          }

          newProject.files = { ...newProject.files, [activeFile]: newFile }
          newState[projectName] = newProject

          return newState
        })
      }
    },
    [activeFile, currentProject, projectName],
  )

  // Handle search term change
  const handleSearchTermChange = useCallback(
    (term: string) => {
      setSearchTerm(term)
      if (term) {
        performSearch(term)
      } else {
        // Clear temporary search results
        setState((prevState) => {
          const newState = { ...prevState }
          const newProject = { ...newState[projectName] }

          if (activeFile && newProject.files[activeFile]) {
            const newFile = {
              ...newProject.files[activeFile],
              occurrences: (newProject.files[activeFile].occurrences || []).filter(
                (occ) => !occ.id.startsWith("temp-"),
              ),
            }

            newProject.files = { ...newProject.files, [activeFile]: newFile }
            newState[projectName] = newProject
          }

          return newState
        })
      }
    },
    [activeFile, performSearch, projectName],
  )

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
      const existingMarkId = Object.entries(currentProject.marks || {}).find(
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
        // Append new occurrence and dedupe
        const existingOccs = newProject.files[activeFile].occurrences || []
        const newOccurrence: Occurrence = {
          id: existingMarkId || markId,
          start: selection.start,
          end: selection.end,
          text: selectedText,
        }
        const combined = [...existingOccs, newOccurrence]
        const unique = dedupeOccurrences(combined)
        const newFile = {
          ...newProject.files[activeFile],
          occurrences: unique,
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

  // Get search results for the current search term
  const searchResults = useMemo(() => {
    if (!searchTerm || !activeFile || !currentFile) return []

    return (currentFile.occurrences || []).filter((occ) => {
      // Check if this occurrence is for the current search term
      const mark = currentProject.marks?.[occ.id]
      return (
        (mark?.type === "Search" && mark.name.toLowerCase() === searchTerm.toLowerCase()) ||
        (occ.id.startsWith("temp-") && occ.id.includes(searchTerm.toLowerCase()))
      )
    })
  }, [activeFile, currentFile, currentProject.marks, searchTerm])

  const saveSearch = useCallback(() => {
    if (!searchTerm || searchResults.length === 0) return

    // Generate a unique ID for this search mark
    const searchId = `search-${searchTerm.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}`

    // Check if a similar search mark already exists
    const existingSearchId = Object.entries(currentProject.marks || {}).find(
      ([_, mark]) => mark.type === "Search" && mark.name.toLowerCase() === searchTerm.toLowerCase(),
    )?.[0]

    if (existingSearchId) return // Search already exists

    setState((prevState) => {
      const newState = { ...prevState }
      const newProject = { ...newState[projectName] }
      // Create the search mark
      newProject.marks = {
        ...newProject.marks,
        [searchId]: { color: generatePastelColor(), type: "Search", name: searchTerm },
      }
      // Prepare normalized term for temp ID cleanup
      const norm = searchTerm.trim().toLowerCase().replace(/\s+/g, "-")
      const tempPrefix = `temp-search-${norm}`
      // Scan all files for the new search term
      Object.entries(newProject.files).forEach(([fileName, file]) => {
        const content = file.content || ""
        // Remove any temp occurrences for this term
        const baseOcc = (file.occurrences || []).filter(
          (occ) => !occ.id.startsWith(tempPrefix)
        )
        // Find all occurrences in this file
        const results: Occurrence[] = []
        let idx = content.toLowerCase().indexOf(searchTerm.toLowerCase())
        let counter = 0
        while (idx !== -1 && counter < 10000) {
          results.push({ id: searchId, text: content.slice(idx, idx + searchTerm.length), start: idx, end: idx + searchTerm.length })
          idx = content.toLowerCase().indexOf(searchTerm.toLowerCase(), idx + 1)
          counter++
        }
        // Update file occurrences
        // Merge occurrences and dedupe
        newProject.files[fileName] = {
          ...file,
          occurrences: dedupeOccurrences([...baseOcc, ...results]),
        }
      })
      newState[projectName] = newProject
      return newState
    })
  }, [currentProject.marks, projectName, searchTerm])

  // Get unique tag names
  const uniqueTagLabels = useMemo(() => {
    const labels: string[] = []

    Object.values(currentProject.marks || {}).forEach((mark) => {
      if (mark.type === "Tag" && !labels.includes(mark.name)) {
        labels.push(mark.name)
      }
    })

    return labels
  }, [currentProject.marks])

  // Get saved searches
  const savedSearches = useMemo(() => {
    const searches: Array<{ id: string; name: string; color: string }> = []

    Object.entries(currentProject.marks || {}).forEach(([id, mark]) => {
      if (mark.type === "Search") {
        searches.push({ id, name: mark.name, color: mark.color })
      }
    })

    return searches
  }, [currentProject.marks])

  const handleContentChange = useCallback(
    (newContent: string) => {
      if (!activeFile) return

      // Analytics: record search saved
      gtag.event({ action: 'save_search', category: 'Search', label: searchTerm })
      setState((prevState) => {
        const newState = { ...prevState }
        const newProject = { ...newState[projectName] }

        // Only update the active file
        if (newProject.files[activeFile]) {
          const newFile = {
            ...newProject.files[activeFile],
            content: newContent,
            dirty: true,
          }

          newProject.files = { ...newProject.files, [activeFile]: newFile }
          newState[projectName] = newProject
        }

        return newState
      })
    },
    [activeFile, projectName],
  )

  const handleSelectFile = useCallback((fileName: string) => {
    setActiveFile(fileName)
    // Analytics: record file selection
    gtag.event({ action: 'select_file', category: 'Files', label: fileName })
    setSelectedTagFilter("all")
    setSearchTerm("")
  }, [])

  const handleAddFile = useCallback(
    (fileName: string, content: string) => {
      console.log(fileName,'fileName')
      console.log(content,'content')
      if (!currentProject.files?.[fileName]) {
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
        // Analytics: record file addition
        gtag.event({
          action: 'add_file',
          category: 'Files',
          label: fileName,
        })
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
        // Analytics: record file upload
        gtag.event({ action: 'upload_file', category: 'Files', label: file.name })
      }
      reader.readAsText(file)
    },
    [handleAddFile],
  )

  const handleTagClick = useCallback((label: string) => {
  setSelectedTagFilter((prevFilter) => (prevFilter === label ? "all" : label))
  // Analytics: record tag filter change
  gtag.event({ action: 'filter_tag', category: 'Tag', label })
  }, [])

  const handleSearchClick = useCallback((search: string) => {
    setSearchTerm((prevSearch) => (prevSearch === search ? "" : search))
    // Analytics: record search selection
    gtag.event({ action: 'select_search', category: 'Search', label: search })
    setSelectedTagFilter("all")
  }, [])

  const handleSpecificSearchClick = useCallback((position: { start: number; end: number }) => {
  // Analytics: record occurrence click
  gtag.event({ action: 'click_occurrence', category: 'Navigation', label: `${position.start}-${position.end}` })
  // Scroll to the specific occurrence
    if (contentRef.current) {
      const root = contentRef.current
      const range = document.createRange()
      let startNode: Node | null = null
      let startOffset = 0
      let endNode: Node | null = null
      let endOffset = 0
      // Find start and end text nodes by offset
      let remaining = position.start
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null)
      while (walker.nextNode()) {
        const node = walker.currentNode
        const len = node.textContent?.length || 0
        if (remaining <= len) {
          startNode = node
          startOffset = remaining
          break
        }
        remaining -= len
      }
      remaining = position.end
      const walker2 = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null)
      while (walker2.nextNode()) {
        const node = walker2.currentNode
        const len = node.textContent?.length || 0
        if (remaining <= len) {
          endNode = node
          endOffset = remaining
          break
        }
        remaining -= len
      }
      if (startNode && endNode) {
        try {
          range.setStart(startNode, startOffset)
          range.setEnd(endNode, endOffset)
          const rect = range.getBoundingClientRect()
          const containerRect = root.getBoundingClientRect()
          root.scrollTo({
            top: rect.top - containerRect.top - 50,
            behavior: "smooth",
          })
        } catch (e) {
          console.error("Failed to scroll to occurrence:", e)
        }
      }
    }
  }, [])

  const handleTagFilterChange = useCallback((value: string) => {
    setSelectedTagFilter(value)
    setSearchTerm("")
  }, [])

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
    // Analytics: record project state download
    gtag.event({ action: 'download_state', category: 'Project', label: projectName })
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
            const firstFileName = Object.keys(uploadedState[firstProjectName].files || {})[0]
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
        // Analytics: record project state upload
        gtag.event({ action: 'upload_state', category: 'Project', label: file.name })
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const uploadUrl = params.get('upload')
    if (uploadUrl) {
      fetch(uploadUrl)
        .then(response => {
          if (!response.ok) throw new Error('Failed to fetch upload file')
          return response.text()
        })
        .then(text => {
          try {
            const uploadedState = JSON.parse(text) as AppState
            setState(uploadedState)
  
            const firstProjectName = Object.keys(uploadedState)[0]
            if (firstProjectName) {
              setProjectName(firstProjectName)
  
              const firstFileName = Object.keys(uploadedState[firstProjectName].files || {})[0]
              if (firstFileName) {
                setActiveFile(firstFileName)
              }
            }
  
            // Analytics: record project state upload from URL
            gtag.event({ action: 'upload_state_url', category: 'Project', label: uploadUrl })
          } catch (error) {
            console.error("Error parsing uploaded state from URL:", error)
            alert("Invalid JSON file at provided URL.")
          }
        })
        .catch(error => {
          console.error("Upload fetch error:", error)
          alert("Failed to load file from URL.")
        })
    }
  }, [])

  const handleRemoveSearch = useCallback(
    (searchName: string) => {
      // Find the search ID by name
      const searchId = Object.entries(currentProject.marks || {}).find(
        ([_, mark]) => mark.type === "Search" && mark.name === searchName,
      )?.[0]

      if (!searchId) return

      setState((prevState) => {
        const newState = { ...prevState }
        const newProject = { ...newState[projectName] }

        // Remove the mark
        const { [searchId]: _, ...remainingMarks } = newProject.marks || {}
        newProject.marks = remainingMarks

        // Remove occurrences from all files
        Object.keys(newProject.files || {}).forEach((fileName) => {
          newProject.files[fileName] = {
            ...newProject.files[fileName],
            occurrences: (newProject.files[fileName].occurrences || []).filter((occ) => occ.id !== searchId),
          }
        })

        // Remove from groups
        Object.keys(newProject.groups || {}).forEach((groupId) => {
          if ((newProject.groups[groupId].marks || []).includes(searchId)) {
            newProject.groups[groupId] = {
              ...newProject.groups[groupId],
              marks: (newProject.groups[groupId].marks || []).filter((id) => id !== searchId),
            }
          }
        })

        newState[projectName] = newProject
        return newState
      })
    },
    [currentProject.marks, projectName],
  )

  const handleRemoveTag = useCallback(
    (tagId: string) => {
      setState((prevState) => {
        const newState = { ...prevState }
        const newProject = { ...newState[projectName] }

        // Remove the mark
        const { [tagId]: _, ...remainingMarks } = newProject.marks || {}
        newProject.marks = remainingMarks

        // Remove occurrences from all files
        Object.keys(newProject.files || {}).forEach((fileName) => {
          newProject.files[fileName] = {
            ...newProject.files[fileName],
            occurrences: (newProject.files[fileName].occurrences || []).filter((occ) => occ.id !== tagId),
          }
        })

        // Remove from groups
        Object.keys(newProject.groups || {}).forEach((groupId) => {
          if ((newProject.groups[groupId].marks || []).includes(tagId)) {
            newProject.groups[groupId] = {
              ...newProject.groups[groupId],
              marks: (newProject.groups[groupId].marks || []).filter((id) => id !== tagId),
            }
          }
        })

        newState[projectName] = newProject
        return newState
      })

      // Analytics: record tag removal
      gtag.event({
        action: 'remove_tag',
        category: 'Tagging',
        label: tagId,
      })
      // Reset tag filter if it was the removed tag
      const removedTag = currentProject.marks?.[tagId]
      if (removedTag && selectedTagFilter === removedTag.name) {
        setSelectedTagFilter("all")
      }
    },
    [currentProject.marks, projectName, selectedTagFilter],
  )

  const handleRemoveOccurrence = useCallback(
    (tagId: string, position: { start: number; end: number }) => {
      if (!activeFile) return

      setState((prevState) => {
        const newState = { ...prevState }
        const newProject = { ...newState[projectName] }
        const newFile = {
          ...newProject.files[activeFile],
          occurrences: (newProject.files[activeFile].occurrences || []).filter(
            (occ) => !(occ.id === tagId && occ.start === position.start && occ.end === position.end),
          ),
        }

        newProject.files = { ...newProject.files, [activeFile]: newFile }
        newState[projectName] = newProject

        // Analytics: record occurrence removal
        gtag.event({
          action: 'remove_occurrence',
          category: 'Tagging',
          label: tagId,
        })
        return newState
      })
    },
    [activeFile, projectName],
  )

  const handleSaveFile = useCallback(
    (fileName: string) => {
      const fileContent = currentProject.files?.[fileName]?.content || ""
      const blob = new Blob([fileContent], { type: "text/plain;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      // Analytics: record file save
      gtag.event({ action: 'save_file', category: 'Files', label: fileName })
    },
    [currentProject.files],
  )

  const handleRemoveFile = useCallback(
    (fileName: string) => {
      setState((prevState) => {
        const newState = { ...prevState }
        const newProject = { ...newState[projectName] }

        // Remove the file
        const { [fileName]: _, ...remainingFiles } = newProject.files || {}
        newProject.files = remainingFiles

        newState[projectName] = newProject

        // Set new active file if needed
        if (fileName === activeFile) {
          const newActiveFile = Object.keys(remainingFiles)[0] || ""
          setActiveFile(newActiveFile)
        }

        return newState
      })
      // Analytics: record file removal
      gtag.event({
        action: 'remove_file',
        category: 'Files',
        label: fileName,
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
    // Ensure API key is configured
    if (!apiKey) {
      setShowApiKeyDialog(true)
      return
    }
    if (!searchTerm || !activeFile) return
    // Analytics: record synonyms fetch request
    gtag.event({ action: 'fetch_synonyms', category: 'Search', label: searchTerm })
    setIsFetchingSynonyms(true)
    setSynonyms([])
    setShowSynonymsPopup(true)

    try {
      // Call OpenAI Chat API for synonyms
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: "You are a helpful assistant that returns a JSON array of synonyms for a given word." },
            { role: "user", content: `List  up to 10 synonyms for the word \"${searchTerm}\" as a JSON array.` },
          ],
          temperature: 0.7,
          max_tokens: 200,
        }),
      })
      if (!res.ok) {
        throw new Error(`OpenAI error ${res.status}`)
      }
      const json = await res.json()
      const content = json.choices?.[0]?.message?.content || ""
      // Extract synonyms array from response
      let list: string[] = []
      try {
        const parsed = JSON.parse(content)
        if (Array.isArray(parsed)) {
          list = parsed
        } else if (parsed && Array.isArray(parsed.synonyms)) {
          list = parsed.synonyms
        } else {
          throw new Error('No array found')
        }
      } catch (e) {
        // Fallback: strip brackets/quotes and split on commas
        const stripped = content.replace(/[\[\]"\']+/g, '')
        list = stripped.split(/,\s*/).map((w) => w.trim()).filter((w) => w)
      }
      // Normalize: remove the original term, dedupe, limit to 10
      const lowerTerm = searchTerm.toLowerCase()
      list = Array.from(new Set(list.map((w) => w.trim())))
        .filter((w) => w.toLowerCase() !== lowerTerm)
        .slice(0, 10)
      if (list.length === 0) {
        list = generateFallbackSynonyms(searchTerm, currentFile.content)
      }
      setSynonyms(list)
    } catch (err: any) {
      console.error("Synonyms error", err)
      // Show error toast
      toast({ title: "Synonyms failed", description: err.message || "Error fetching synonyms", variant: "destructive" })
      setSynonyms(generateFallbackSynonyms(searchTerm, currentFile.content))
    } finally {
      setIsFetchingSynonyms(false)
    }
  }, [apiKey, searchTerm, activeFile, currentFile.content, generateFallbackSynonyms])

  const handleSaveSynonyms = useCallback(
    (selectedSynonyms: string[]) => {
      // Analytics: record saved synonyms
      if (selectedSynonyms.length > 0) {
        gtag.event({ action: 'save_synonyms', category: 'Search', label: selectedSynonyms.join(',') })
      }
      if (selectedSynonyms.length === 0) {
        setShowSynonymsPopup(false)
        return
      }
      setShowSynonymsPopup(false)
      setState((prevState) => {
        const newState = { ...prevState }
        const newProject = { ...newState[projectName] }
        // For each synonym, reuse or create a search mark, then scan all files
        selectedSynonyms.forEach((synonym) => {
          const lower = synonym.toLowerCase()
          const existing = Object.entries(newProject.marks || {}).find(
            ([, m]) => m.type === "Search" && m.name.toLowerCase() === lower
          )
          const searchId = existing
            ? existing[0]
            : `search-${lower.replace(/\s+/g, "-")}-${Date.now()}`
          if (!existing) {
            newProject.marks = {
              ...newProject.marks,
              [searchId]: { color: generatePastelColor(), type: "Search", name: synonym },
            }
          }
          Object.entries(newProject.files || {}).forEach(([fileName, file]) => {
            const text = file.content || ""
            const hits: Occurrence[] = []
            const term = lower
            let idx = text.toLowerCase().indexOf(term)
            let cnt = 0
            while (idx !== -1 && cnt < 10000) {
              hits.push({ id: searchId, text: text.slice(idx, idx + synonym.length), start: idx, end: idx + synonym.length })
              idx = text.toLowerCase().indexOf(term, idx + 1)
              cnt++
            }
            newProject.files[fileName] = {
              ...file,
              occurrences: dedupeOccurrences([...(file.occurrences || []), ...hits]),
            }
          })
        })
        newState[projectName] = newProject
        return newState
      })
    },
    [projectName],
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
    ;(currentFile.occurrences || []).forEach((occurrence) => {
      const mark = currentProject.marks?.[occurrence.id]

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
    ;(currentFile.occurrences || []).forEach((occurrence) => {
      const mark = currentProject.marks?.[occurrence.id]
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

    // Ensure all tags exist, even with zero occurrences in this file
    Object.entries(currentProject.marks || {}).forEach(([markId, mark]) => {
      if (mark.type !== "Tag") return
      const name = mark.name
      if (!tagsByName[name]) {
        tagsByName[name] = {
          id: markId,
          color: mark.color,
          positions: { [activeFile]: [] },
        }
      } else if (!tagsByName[name].positions[activeFile]) {
        tagsByName[name].positions[activeFile] = []
      }
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

    // Build a map for all saved searches (marks of type Search)
    const searchesByName: Record<
      string,
      { id: string; color: string; occurrences: Array<{ text: string; start: number; stop: number }> }
    > = {}
    Object.entries(currentProject.marks || {}).forEach(([id, mark]) => {
      if (mark.type === "Search") {
        // Initialize with zero occurrences
        searchesByName[mark.name] = { id, color: mark.color, occurrences: [] }
      }
    })

    // Populate occurrences from the current file
    ;(currentFile.occurrences || []).forEach((occurrence) => {
      const mark = currentProject.marks?.[occurrence.id]
      if (!mark || mark.type !== "Search") return
      const name = mark.name
      // Ensure entry exists (should always)
      if (!searchesByName[name]) {
        searchesByName[name] = { id: occurrence.id, color: mark.color, occurrences: [] }
      }
      searchesByName[name].occurrences.push({
        text: occurrence.text,
        start: occurrence.start,
        stop: occurrence.end,
      })
    })

    // Convert to array format
    return Object.entries(searchesByName).map(([text, data]) => ({
      id: data.id,
      text,
      color: data.color,
      occurrences: data.occurrences,
    }))
  }, [activeFile, currentFile.occurrences, currentProject.marks])

  const handleSearch = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault()
      // Analytics: record search submission
      gtag.event({ action: 'submit_search', category: 'Search', label: searchTerm })
      // Perform search with current search term
      performSearch(searchTerm)
    },
    [performSearch, searchTerm],
  )

  // Project management functions
  const createNewProject = useCallback(
    (name: string) => {
      if (!name.trim() || state[name]) return

      setState((prevState) => {
        const newState = { ...prevState }
        // Use sampleState template for new project
        const templateKey = Object.keys(sampleState)[0]
        const templateProject = sampleState[templateKey]
        // Deep clone to avoid mutation
        const newProject = JSON.parse(JSON.stringify(templateProject))
        newState[name] = newProject
        return newState
      })

      setProjectName(name)
      // Initialize active file to first file in the template
      const templateKey = Object.keys(sampleState)[0]
      const fileNames = Object.keys(sampleState[templateKey].files)
      setActiveFile(fileNames[0] || "")
      // Analytics: record project creation
      gtag.event({ action: 'create_project', category: 'Project', label: name })
    },
    [state],
  )

  const switchProject = useCallback(
    (name: string) => {
      if (state[name]) {
        setProjectName(name)
        // Analytics: record project switch
        gtag.event({ action: 'switch_project', category: 'Project', label: name })

        // Set active file to the first file in the project
        const firstFileName = Object.keys(state[name].files || {})[0] || ""
        setActiveFile(firstFileName)

        // Reset filters and search
        setSelectedTagFilter("all")
        setSearchTerm("")
      }
  },
  [state],
  )
  // Rename an existing project
  const updateProjectName = useCallback(
    (oldName: string, newName: string) => {
      if (!oldName.trim() || !newName.trim() || oldName === newName || state[newName]) return
      // Analytics: record project rename
      gtag.event({ action: 'rename_project', category: 'Project', label: `${oldName}->${newName}` })
      const newState = { ...state }
      const projectData = newState[oldName]
      if (!projectData) return
      delete newState[oldName]
      newState[newName] = projectData
      setState(newState)
      if (projectName === oldName) {
        setProjectName(newName)
      }
    },
    [state, projectName],
  )

  // Delete an existing project
  const deleteProject = useCallback(
    (name: string) => {
      if (!state[name]) return
      // Analytics: record project deletion
      gtag.event({ action: 'delete_project', category: 'Project', label: name })
      const newState = { ...state }
      delete newState[name]
      setState(newState)

      if (projectName === name) {
        const names = Object.keys(newState)
        const next = names[0] || ''
        setProjectName(next)
        if (next) {
          const files = newState[next].files
          const firstFile = files && Object.keys(files)[0] ? Object.keys(files)[0] : ''
          setActiveFile(firstFile)
        } else {
          setActiveFile('')
        }
      }
    },
    [state, projectName],
  )

  // Group management functions
  const createGroup = useCallback(
    (name: string) => {
      if (!name.trim()) return

      const groupId = `group-${name.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}`

      setState((prevState) => {
        const newState = { ...prevState }
        const newProject = { ...newState[projectName] }

        newProject.groups = {
          ...newProject.groups,
          [groupId]: {
            name,
            marks: [],
            color: generatePastelColor(),
          },
        }

        newState[projectName] = newProject
        return newState
      })

      return groupId
    },
    [projectName],
  )

  const addMarkToGroup = useCallback(
    (groupId: string, markId: string) => {
      setState((prevState) => {
        const newState = { ...prevState }
        const newProject = { ...newState[projectName] }

        if (newProject.groups?.[groupId] && newProject.marks?.[markId]) {
          // Only add if not already in the group
          if (!(newProject.groups[groupId].marks || []).includes(markId)) {
            newProject.groups[groupId] = {
              ...newProject.groups[groupId],
              marks: [...(newProject.groups[groupId].marks || []), markId],
            }
          }
        }

        newState[projectName] = newProject
        return newState
      })
    },
    [projectName],
  )

  const removeMarkFromGroup = useCallback(
    (groupId: string, markId: string) => {
      setState((prevState) => {
        const newState = { ...prevState }
        const newProject = { ...newState[projectName] }

        if (newProject.groups?.[groupId]) {
          newProject.groups[groupId] = {
            ...newProject.groups[groupId],
            marks: (newProject.groups[groupId].marks || []).filter((id) => id !== markId),
          }
        }

        newState[projectName] = newProject
        return newState
      })
    },
    [projectName],
  )

  const deleteGroup = useCallback(
    (groupId: string) => {
      setState((prevState) => {
        const newState = { ...prevState }
        const newProject = { ...newState[projectName] }

        if (newProject.groups) {
          const { [groupId]: _, ...remainingGroups } = newProject.groups
          newProject.groups = remainingGroups
        }

        newState[projectName] = newProject
        return newState
      })
    },
    [projectName],
  )

  const updateGroupMarks = useCallback(
    (groupId: string, markIds: string[]) => {
      setState((prevState) => {
        const newState = { ...prevState }
        const newProject = { ...newState[projectName] }

        if (newProject.groups?.[groupId]) {
          newProject.groups[groupId] = {
            ...newProject.groups[groupId],
            marks: markIds,
          }
        }

        newState[projectName] = newProject
        return newState
      })
    },
    [projectName],
  )

  const saveGroupAsTag = useCallback(
    (groupId: string, tagName: string) => {
      setState((prevState) => {
        const newState = { ...prevState }
        const newProject = { ...newState[projectName] }
        const group = newProject.groups?.[groupId]
        if (!group || !tagName.trim()) return prevState

        const label = tagName.trim()
        // Prevent duplicate tag names
        if (
          Object.values(newProject.marks || {}).some(
            (mark) => mark.type === "Tag" && mark.name.toLowerCase() === label.toLowerCase()
          )
        ) {
          return prevState
        }

        const type = "Tag"
        const markId = `${type.toLowerCase()}-${label.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}`

        // Create new tag mark
        newProject.marks = {
          ...newProject.marks,
          [markId]: { color: generatePastelColor(), type, name: label },
        }

        // Add occurrences for this new tag based on group occurrences
        Object.entries(newProject.files).forEach(([fileName, file]) => {
          const occs = file.occurrences || []
          const newOccs = [...occs]
          occs.forEach((occ) => {
            if (group.marks.includes(occ.id)) {
              newOccs.push({ id: markId, start: occ.start, end: occ.end, text: occ.text })
            }
          })
          newProject.files[fileName] = { ...file, occurrences: dedupeOccurrences(newOccs) }
        })

        newState[projectName] = newProject
        return newState
      })
    },
    [projectName],
  )

  const getMarksByGroup = useCallback(
    (groupId: string) => {
      const group = currentProject.groups?.[groupId]
      if (!group) return []

      return (group.marks || [])
        .map((markId) => {
          const mark = currentProject.marks?.[markId]
          if (!mark) return null

          return {
            id: markId,
            name: mark.name,
            type: mark.type,
            color: mark.color,
          }
        })
        .filter(Boolean) as Array<{ id: string; name: string; type: "Tag" | "Search"; color: string }>
    },
    [currentProject.groups, currentProject.marks],
  )

  // Function to get all marks (tags, searches, groups) for tabulation
  const getAllMarksForTabulation = useCallback(() => {
    const allMarks: Array<{ id: string; name: string; prefix: string; color: string }> = []

    // Add tags
    Object.entries(currentProject.marks || {}).forEach(([id, mark]) => {
      if (mark.type === "Tag") {
        allMarks.push({
          id,
          name: mark.name,
          prefix: "Tag",
          color: mark.color,
        })
      }
    })

    // Add searches
    Object.entries(currentProject.marks || {}).forEach(([id, mark]) => {
      if (mark.type === "Search") {
        allMarks.push({
          id,
          name: mark.name,
          prefix: "Search",
          color: mark.color,
        })
      }
    })

    // Add groups
    Object.entries(currentProject.groups || {}).forEach(([id, group]) => {
      allMarks.push({
        id,
        name: group.name,
        prefix: "Group",
        color: group.color || generatePastelColor(),
      })
    })

    return allMarks
  }, [currentProject.marks, currentProject.groups])

  // Function to refresh all saved searches across all files
  const refreshAllSearches = useCallback(() => {
    // Show loader dialog
    setIsRefreshingSearch(true)
    // Delay actual search refresh slightly to allow spinner/modal to render
    setTimeout(() => {
      setState((prevState) => {
        const newState = { ...prevState }
        const newProject = { ...newState[projectName] }
        const marks = newProject.marks || {}
        // Identify saved searches (marks of type Search)
        const searchMarks = Object.entries(marks).filter(([, mark]) => mark.type === "Search")
        // Update each file
        Object.entries(newProject.files || {}).forEach(([fileName, file]) => {
          const content = file.content || ""
          // Keep only non-search occurrences
          const baseOcc = (file.occurrences || []).filter((occ) => {
            const m = marks[occ.id]
            return !m || m.type !== "Search"
          })
          const newOccurrences = [...baseOcc]
          // Re-run each saved search term
          searchMarks.forEach(([id, mark]) => {
            const term = mark.name
            let idx = content.toLowerCase().indexOf(term.toLowerCase())
            let count = 0
            while (idx !== -1 && count < 1000) {
              newOccurrences.push({
                id,
                text: content.slice(idx, idx + term.length),
                start: idx,
                end: idx + term.length,
              })
              idx = content.toLowerCase().indexOf(term.toLowerCase(), idx + 1)
              count++
            }
          })
        // Dedupe final occurrences
        newProject.files[fileName] = { ...file, occurrences: dedupeOccurrences(newOccurrences) }
        })
        newState[projectName] = newProject
        return newState
      })
      // Hide loader
      setIsRefreshingSearch(false)
    }, 200)
  }, [projectName])

  const value = {
    state,
    projectName,
    setProjectName,
    projectNames,
    currentProject,
    activeFile,
    setActiveFile,
    currentFile,
    selectedTagFilter,
    setSelectedTagFilter,
    searchTerm,
    setSearchTerm: handleSearchTermChange,
    showTabulationView,
    setShowTabulationView,
    // Tabulation view persistent configuration
    tabulationRowSelections,
    setTabulationRowSelections,
    tabulationColumnSelections,
    setTabulationColumnSelections,
    tabulationExpansionType,
    setTabulationExpansionType,
    showSynonymsPopup,
    setShowSynonymsPopup,
    synonyms,
    setSynonyms,
    isFetchingSynonyms,
    setIsFetchingSynonyms,
    isNewTagDialogOpen,
    setIsNewTagDialogOpen,
    isNewGroupDialogOpen,
    setIsNewGroupDialogOpen,
    isEditGroupDialogOpen,
    setIsEditGroupDialogOpen,
    isRefreshingSearch,
    setIsRefreshingSearch,
    newTagLabel,
    setNewTagLabel,
    newGroupName,
    setNewGroupName,
    selectedGroupForEdit,
    setSelectedGroupForEdit,
    contentRef,
    fileInputRef,
    selection,
    setSelection,
    contextMenuPosition,
    setContextMenuPosition,
    searchResults,
    uniqueTagLabels,
    savedSearches,
    groups,

    // Functions
    handleSelectFile,
    handleAddFile,
    handleUploadFile,
    handleSaveFile,
    handleRemoveFile,
    handleTagClick,
    handleSearchClick,
    handleSpecificSearchClick,
    handleTagFilterChange,
    handleContentChange,
    handleContextMenu,
    addTag,
    handleNewTag,
    submitNewTag,
    saveSearch,
    fetchSynonyms,
    handleSaveSynonyms,
    handleDownloadState,
    handleUploadState,
    handleRemoveSearch,
    handleRemoveTag,
    handleRemoveOccurrence,
    renderContent,
    prepareTagsForAnalysis,
    prepareSearchesForAnalysis,
    handleSearch,
    createNewProject,
    switchProject,
    updateProjectName,
    deleteProject,
    createGroup,
    addMarkToGroup,
    removeMarkFromGroup,
    deleteGroup,
    updateGroupMarks,
    saveGroupAsTag,
    refreshAllSearches,
    getMarksByGroup,
    getAllMarksForTabulation,
    // API key for OpenAI
    apiKey,
    showApiKeyDialog,
    setShowApiKeyDialog,
    handleSaveApiKey,
  }

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}
