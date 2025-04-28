"use client"

import type React from "react"

import { createContext, useState, useRef, useCallback, useMemo, useEffect, type ReactNode } from "react"
import { generatePastelColor } from "@/utils/colors"

const LOCAL_STORAGE_KEY = "textViewerState"

// Types
interface Occurrence {
  id: string
  start: number
  end: number
  text: string
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
  createGroup: (name: string) => void
  addMarkToGroup: (groupId: string, markId: string) => void
  removeMarkFromGroup: (groupId: string, markId: string) => void
  deleteGroup: (groupId: string) => void
  updateGroupMarks: (groupId: string, markIds: string[]) => void
  refreshAllSearches: () => void
  getMarksByGroup: (groupId: string) => Array<{ id: string; name: string; type: "Tag" | "Search"; color: string }>
  getAllMarksForTabulation: () => Array<{ id: string; name: string; prefix: string; color: string }>
}

export const ProjectContext = createContext<ProjectContextType>({} as ProjectContextType)

interface ProjectProviderProps {
  children: ReactNode
}

export function ProjectProvider({ children }: ProjectProviderProps) {
  const [projectName, setProjectName] = useState<string>("Text Analysis Project")
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

   // Calculate search occurrences when activeFile or searchTerm changes
   useEffect(() => {
    if (!searchTerm || !activeFile || !currentProject.files[activeFile]) return

    // Check if we already have this search term as a mark
    const existingSearchMark = Object.entries(currentProject.marks || {}).find(
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
            ...(newProject.files[activeFile].occurrences || []).filter((occ) => !occ.id.startsWith("temp-")),
            ...results,
          ],
        }

        newProject.files = { ...newProject.files, [activeFile]: newFile }
        newState[projectName] = newProject

        return newState
      })
    }
  }, [activeFile, currentProject, projectName])

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
        const newFile = {
          ...newProject.files[activeFile],
          occurrences: [
            ...(newProject.files[activeFile].occurrences || []),
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
        [searchId]: {
          color: generatePastelColor(),
          type: "Search",
          name: searchTerm,
        },
      }

      // Update temporary occurrences to use the new mark ID in all files
      Object.keys(newProject.files).forEach((fileName) => {
        if (newProject.files[fileName].occurrences) {
          newProject.files[fileName] = {
            ...newProject.files[fileName],
            occurrences: (newProject.files[fileName].occurrences || []).map((occ) => {
              if (occ.id.startsWith("temp-") && occ.id.includes(searchTerm.toLowerCase())) {
                return { ...occ, id: searchId }
              }
              return occ
            }),
          }
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
              occurrences: [...(newProject.files[activeFile].occurrences || []), ...occurrences],
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
    ;(currentFile.occurrences || []).forEach((occurrence) => {
      const mark = currentProject.marks?.[occurrence.id]

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

  const handleSearch = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault()
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
        newState[name] = {
          files: {
            "sample.txt": {
              content: "This is a sample text for your new project.",
              occurrences: [],
            },
          },
          marks: {},
          groups: {},
        }
        return newState
      })

      setProjectName(name)
      setActiveFile("sample.txt")
    },
    [state],
  )

  const switchProject = useCallback(
    (name: string) => {
      if (state[name]) {
        setProjectName(name)

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

  // Function to refresh all searches across all files
  const refreshAllSearches = useCallback(() => {
    setIsRefreshingSearch(true)

    // Get all search marks
    const searchMarks = Object.entries(currentProject.marks || {})
      .filter(([_, mark]) => mark.type === "Search")
      .map(([id, mark]) => ({ id, name: mark.name }))

    // Process each file
    setState((prevState) => {
      const newState = { ...prevState }
      const newProject = { ...newState[projectName] }

      // For each file
      Object.keys(newProject.files || {}).forEach((fileName) => {
        const file = newProject.files[fileName]
        const content = file.content

        // Remove all search occurrences
        const occurrences = (file.occurrences || []).filter((occ) => {
          const mark = newProject.marks?.[occ.id]
          return !mark || mark.type !== "Search"
        })

        // Re-add all search occurrences
        searchMarks.forEach(({ id, name }) => {
          let index = content.toLowerCase().indexOf(name.toLowerCase())
          let counter = 0

          while (index !== -1 && counter < 1000) {
            occurrences.push({
              id,
              text: content.slice(index, index + name.length),
              start: index,
              end: index + name.length,
            })

            index = content.toLowerCase().indexOf(name.toLowerCase(), index + 1)
            counter++
          }
        })

        // Update file
        newProject.files[fileName] = {
          ...file,
          occurrences,
        }
      })

      newState[projectName] = newProject
      return newState
    })

    // Set timeout to simulate processing time
    setTimeout(() => {
      setIsRefreshingSearch(false)
    }, 1000)
  }, [currentProject.marks, projectName])

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
    createGroup,
    addMarkToGroup,
    removeMarkFromGroup,
    deleteGroup,
    updateGroupMarks,
    refreshAllSearches,
    getMarksByGroup,
    getAllMarksForTabulation,
  }

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}
