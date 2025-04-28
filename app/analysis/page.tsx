"use client"

import { useState, useEffect } from "react"
import { TagAnalysis } from "@/components/tag-analysis"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

// Define the project state structure
interface AppState {
  projectName: string
  files: Record<
    string,
    {
      name: string
      content: string
      dirty: boolean
    }
  >
  activeFile: string
  tags: Record<
    string,
    {
      type: "Tag" | "Search"
      text: string
      color: string
      occurrences: Array<{
        fileId: string
        text: string
        start: number
        end: number
      }>
    }
  >
  tabulations: Array<{
    rows: string[]
    columns: string[]
    extend_type: 0 | 1 | 2
  }>
}

export default function AnalysisPage() {
  const [state, setState] = useState<AppState | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load state from localStorage
    const savedState = localStorage.getItem("textViewerState")
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState)
        setState(parsedState)
      } catch (e) {
        console.error("Error parsing saved state:", e)
      }
    }
    setLoading(false)
  }, [])

  if (loading) {
    return <div className="container py-10">Loading...</div>
  }

  if (!state) {
    return (
      <div className="container py-10">
        <div className="mb-8">
          <Button variant="ghost" asChild>
            <Link href="/" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Viewer
            </Link>
          </Button>
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">No Project Data Found</h1>
          <p className="text-muted-foreground">Please create a project in the main viewer first.</p>
        </div>
      </div>
    )
  }

  // Convert tags to the format expected by TagAnalysis
  const convertedTags = Object.entries(state.tags)
    .filter(([_, tag]) => tag.type === "Tag")
    .map(([id, tag]) => {
      // Group occurrences by file
      const positions: Record<string, Array<{ text: string; start: number; stop: number }>> = {}

      tag.occurrences.forEach((occ) => {
        if (!positions[occ.fileId]) {
          positions[occ.fileId] = []
        }

        positions[occ.fileId].push({
          text: occ.text,
          start: occ.start,
          stop: occ.end,
        })
      })

      return {
        id,
        text: tag.text,
        color: tag.color,
        positions,
      }
    })

  return (
    <div className="container py-10">
      <div className="mb-8">
        <Button variant="ghost" asChild>
          <Link href="/" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Viewer
          </Link>
        </Button>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold">Tag Analysis</h1>
          <p className="text-lg text-muted-foreground">
            Analyze your document&apos;s tags in a hierarchical view. Each tag type is grouped together, showing all
            occurrences and their contexts.
          </p>
        </div>
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Project: {state.projectName}</h2>
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Files:</h3>
            <ul className="list-disc pl-5">
              {Object.values(state.files).map((file) => (
                <li key={file.name}>{file.name}</li>
              ))}
            </ul>
          </div>
          <TagAnalysis
            tags={convertedTags}
            onTagClick={() => {}}
            onOccurrenceClick={() => {}}
            highlightedTag=""
            activeFile={state.activeFile}
          />
        </div>
      </div>
    </div>
  )
}
