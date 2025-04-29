"use client"

import type React from "react"
import { useContext, useState, useRef, useCallback } from "react"
import { ProjectContext } from "@/contexts/project-context"
import { TagAnalysisPanel } from "../analysis/tag-analysis-panel"
import { SearchAnalysisPanel } from "../analysis/search-analysis-panel"
import { GroupManagement } from "../groups/group-management"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function AnalysisSidebar() {
  const {
    prepareTagsForAnalysis,
    prepareSearchesForAnalysis,
    handleTagClick,
    handleSpecificSearchClick,
    selectedTagFilter,
    activeFile,
    searchTerm,
    searchResults,
    handleSearchClick,
    handleRemoveSearch,
    handleRemoveTag,
    handleRemoveOccurrence,
  } = useContext(ProjectContext)

  // Ensure we have valid data
  const tags = prepareTagsForAnalysis() || []
  const searches = prepareSearchesForAnalysis() || []
  const results = searchResults || []

  // State for vertical split ratio between Tag and Search panels (0 to 1)
  const [tagSplitRatio, setTagSplitRatio] = useState<number>(0.5)
  const containerRef = useRef<HTMLDivElement>(null)
  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startY = e.clientY
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const startRatio = tagSplitRatio
    const onMouseMove = (ev: MouseEvent) => {
      const delta = ev.clientY - startY
      let newRatio = (startRatio * rect.height + delta) / rect.height
      newRatio = Math.max(0.1, Math.min(0.9, newRatio))
      setTagSplitRatio(newRatio)
    }
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [tagSplitRatio])

  return (
    <div className="border-l p-2 md:p-4 h-full flex flex-col">
      <Tabs defaultValue="analysis" className="flex flex-col h-full">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="analysis" className="flex-1">
            Analysis
          </TabsTrigger>
          <TabsTrigger value="groups" className="flex-1">
            Groups
          </TabsTrigger>
        </TabsList>
        <TabsContent value="analysis" className="p-0 flex-1 overflow-hidden">
          <div ref={containerRef} className="flex flex-col h-full">
            <div
              style={{ flexGrow: tagSplitRatio, flexShrink: 1, flexBasis: 0 }}
              className="overflow-auto min-h-0"
            >
              <TagAnalysisPanel
                tags={tags}
                onTagClick={handleTagClick}
                onOccurrenceClick={handleSpecificSearchClick}
                onRemoveTag={handleRemoveTag}
                onRemoveOccurrence={handleRemoveOccurrence}
                highlightedTag={selectedTagFilter}
                activeFile={activeFile}
              />
            </div>
            <div
              className="h-1 bg-gray-200 hover:bg-gray-300 cursor-row-resize"
              onMouseDown={startDrag}
            />
            <div
              style={{ flexGrow: 1 - tagSplitRatio, flexShrink: 1, flexBasis: 0 }}
              className="overflow-auto min-h-0"
            >
              <SearchAnalysisPanel
                currentSearchResults={results.map((r) => ({ text: r.text || "", start: r.start || 0, stop: r.end || 0 }))}
                savedSearches={searches}
                onSelectSearch={handleSearchClick}
                onSelectSpecificSearch={handleSpecificSearchClick}
                onRemoveSearch={handleRemoveSearch}
                highlightedSearch={searchTerm}
                activeFile={activeFile}
                onRefreshAllSearches={true}
              />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="groups" className="flex-1 overflow-auto">
          <GroupManagement />
        </TabsContent>
      </Tabs>
    </div>
  )
}
