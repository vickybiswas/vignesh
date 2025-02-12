"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChevronRight, Search, History } from "lucide-react"
import { TextOccurrence } from "./text-occurrence"

interface SearchResult {
  text: string
  start: number
  end: number
}

interface SearchAnalysisProps {
  content: string
  currentSearchResults: SearchResult[]
  savedSearches: string[]
  onSelectSearch: (search: string) => void
  onSelectSpecificSearch: (result: SearchResult) => void
  onOccurrenceClick: (start: number, end: number) => void
  highlightedSearch: string | null
  highlightedSpecificSearch: SearchResult | null
}

export function SearchAnalysis({
  content,
  currentSearchResults,
  savedSearches,
  onSelectSearch,
  onSelectSpecificSearch,
  onOccurrenceClick,
  highlightedSearch,
  highlightedSpecificSearch,
}: SearchAnalysisProps) {
  const [expandedSavedSearch, setExpandedSavedSearch] = useState<string | null>(null)

  const getSavedSearchResults = (searchTerm: string): SearchResult[] => {
    const results: SearchResult[] = []
    let index = content.toLowerCase().indexOf(searchTerm.toLowerCase())
    while (index !== -1) {
      results.push({
        text: content.slice(index, index + searchTerm.length),
        start: index,
        end: index + searchTerm.length,
      })
      index = content.toLowerCase().indexOf(searchTerm.toLowerCase(), index + 1)
    }
    return results
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Search Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
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
                    end={result.end}
                    isHighlighted={
                      highlightedSpecificSearch?.start === result.start && highlightedSpecificSearch?.end === result.end
                    }
                    onClick={() => onOccurrenceClick(result.start, result.end)}
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
                {savedSearches.map((search, index) => {
                  const searchResults = getSavedSearchResults(search)
                  return (
                    <Collapsible key={index}>
                      <CollapsibleTrigger
                        className={`flex w-full items-center gap-2 rounded-lg border bg-card p-4 text-left hover:bg-accent ${
                          highlightedSearch === search ? "bg-green-200" : ""
                        }`}
                        onClick={() => onSelectSearch(search)}
                      >
                        <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <span>{search}</span>
                        <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-sm text-muted-foreground">
                          {searchResults.length} {searchResults.length === 1 ? "occurrence" : "occurrences"}
                        </span>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2 space-y-2">
                        {searchResults.map((result, idx) => (
                          <TextOccurrence
                            key={idx}
                            text={result.text}
                            start={result.start}
                            end={result.end}
                            isHighlighted={
                              highlightedSpecificSearch?.start === result.start &&
                              highlightedSpecificSearch?.end === result.end
                            }
                            onClick={() => onOccurrenceClick(result.start, result.end)}
                          />
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  )
                })}
              </CollapsibleContent>
            </Collapsible>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

