"use client"

import { useContext } from "react"
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

  return (
    <div className="w-60 md:w-80 border-l p-2 md:p-4 h-full overflow-auto">
      <Tabs defaultValue="analysis">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="analysis" className="flex-1">
            Analysis
          </TabsTrigger>
          <TabsTrigger value="groups" className="flex-1">
            Groups
          </TabsTrigger>
        </TabsList>
        <TabsContent value="analysis" className="space-y-6">
          <TagAnalysisPanel
            tags={tags}
            onTagClick={handleTagClick}
            onOccurrenceClick={handleSpecificSearchClick}
            onRemoveTag={handleRemoveTag}
            onRemoveOccurrence={handleRemoveOccurrence}
            highlightedTag={selectedTagFilter}
            activeFile={activeFile}
          />
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
        </TabsContent>
        <TabsContent value="groups">
          <GroupManagement />
        </TabsContent>
      </Tabs>
    </div>
  )
}
