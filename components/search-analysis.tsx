"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChevronRight, Search, History, X } from "lucide-react"
import { TextOccurrence } from "./text-occurrence"
import { Button } from "@/components/ui/button"

interface SearchAnalysisProps {
  content: string
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
  highlightedSearch: string
  activeFile: string
}

export function SearchAnalysis({
  content,
  currentSearchResults,
  savedSearches,
  onSelectSearch,
  onSelectSpecificSearch,
  onRemoveSearch,
  highlightedSearch,
  activeFile,
}: SearchAnalysisProps) {
  const [expandedSavedSearch, setExpandedSavedSearch] = useState<string | null>(null)

  return (
    <Card className="w-full p-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-1>
          <Search className="h-5 w-5" />
          Search Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="!px-2 pt-0">
        <ScrollArea className="h-[300px] pr-2">
          <div className="space-y-2">
            <Collapsible>
              <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg border bg-card p-2 text-left hover:bg-accent">
                <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                <Search className="h-4 w-4" />
                <span className="font-semibold">Current Search</span>
                <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-sm text-muted-foreground">
                  {currentSearchResults.length} {currentSearchResults.length === 1 ? "result" : "results"}
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1 space-y-1">
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
              <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg border bg-card p-2 text-left hover:bg-accent">
                <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                <History className="h-4 w-4" />
                <span className="font-semibold">Saved Searches</span>
                <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-sm text-muted-foreground">
                  {savedSearches.length} {savedSearches.length === 1 ? "search" : "searches"}
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1 space-y-1">
                {savedSearches.map((search, index) => (
                  <Collapsible key={index}>
                    <CollapsibleTrigger
                      className={`flex w-full items-center gap-2 rounded-lg border bg-card p-2 text-left hover:bg-accent ${
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
                    <CollapsibleContent className="mt-1 space-y-1">
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
  )
}
