"use client"

import { useContext } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { ChevronRight, Search, History, X, RefreshCw } from "lucide-react"
import { TextOccurrence } from "../text-occurrence"
import { ProjectContext } from "@/contexts/project-context"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

interface SearchAnalysisPanelProps {
  currentSearchResults: Array<{ text: string; start: number; stop: number }>
  savedSearches: Array<{
    id: string
    text: string
    color: string
    occurrences: Array<{ text: string; start: number; stop: number }>
  }>
  onSelectSearch: (search: string) => void
  onSelectSpecificSearch: (result: { start: number; stop: number }) => void
  onRemoveSearch: (search: string) => void
  onRefreshAllSearches?: boolean
  highlightedSearch: string
  activeFile: string
}

export function SearchAnalysisPanel({
  currentSearchResults,
  savedSearches,
  onSelectSearch,
  onSelectSpecificSearch,
  onRemoveSearch,
  onRefreshAllSearches,
  highlightedSearch,
  activeFile,
}: SearchAnalysisPanelProps) {
  const { refreshAllSearches, isRefreshingSearch, setIsRefreshingSearch } = useContext(ProjectContext)

  const handleRefreshAllSearches = () => {
    setIsRefreshingSearch(true)
    refreshAllSearches()
  }

  return (
    <>
      <Card className="w-full h-full flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Analysis
            </div>
            {onRefreshAllSearches && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshAllSearches}
                title="Refresh searches for all files"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh All
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          <ScrollArea className="h-full pr-4">
            <div className="space-y-4">
              <Collapsible>
                <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg border bg-card p-4 text-left hover:bg-accent">
                  <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                  <Search className="h-4 w-4" />
                  <span className="font-semibold">Current Search</span>
                  <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-sm text-muted-foreground">
                    {currentSearchResults.length} {currentSearchResults.length === 1 ? "result" : "results"}
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  {currentSearchResults.map((result, index) => (
                    <TextOccurrence
                      key={index}
                      text={result.text}
                      start={result.start}
                      stop={result.stop}
                      isHighlighted={highlightedSearch === result.text}
                      onClick={() => onSelectSpecificSearch(result)}
                    />
                  ))}
                </CollapsibleContent>
              </Collapsible>
              <Collapsible>
                <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg border bg-card p-4 text-left hover:bg-accent">
                  <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                  <History className="h-4 w-4" />
                  <span className="font-semibold">Saved Searches</span>
                  <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-sm text-muted-foreground">
                    {savedSearches.length} {savedSearches.length === 1 ? "search" : "searches"}
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  {savedSearches.map((search, index) => (
                    <Collapsible key={index}>
                      <CollapsibleTrigger
                        className={`flex w-full items-center gap-2 rounded-lg border bg-card p-4 text-left hover:bg-accent ${
                          highlightedSearch === search.text ? "bg-green-200" : ""
                        }`}
                        onClick={() => onSelectSearch(search.text)}
                      >
                        <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <span>{search.text}</span>
                        <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-sm text-muted-foreground">
                          {search.occurrences.length} {search.occurrences.length === 1 ? "occurrence" : "occurrences"}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="ml-2 h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation()
                            onRemoveSearch(search.text)
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2 space-y-2">
                        {search.occurrences.map((occurrence, idx) => (
                          <TextOccurrence
                            key={idx}
                            text={occurrence.text}
                            start={occurrence.start}
                            stop={occurrence.stop}
                            isHighlighted={highlightedSearch === search.text}
                            onClick={() => onSelectSpecificSearch(occurrence)}
                          />
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Refreshing Search Dialog */}
      <Dialog open={isRefreshingSearch} onOpenChange={setIsRefreshingSearch}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refreshing Searches</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Refreshing all searches across all files...</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsRefreshingSearch(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
