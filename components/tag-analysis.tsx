"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChevronRight, Hash } from "lucide-react"
import { TextOccurrence } from "./text-occurrence"

interface TagAnalysisProps {
  tags: Array<{
    id: string
    text: string
    color: string
    positions: Record<string, Array<{ text: string; start: number; stop: number }>>
  }>
  onTagClick: (label: string) => void
  onOccurrenceClick: (position: { start: number; end: number }) => void
  highlightedTag: string
  activeFile: string
}

export function TagAnalysis({ tags, onTagClick, onOccurrenceClick, highlightedTag, activeFile }: TagAnalysisProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hash className="h-5 w-5" />
          Tag Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="!px-2 pt-0">
        <ScrollArea className="h-[600px] pr-2">
          <div className="space-y-2">
            {tags.map((tag) => {
              // Count occurrences for this tag in the active file
              const fileOccurrences = tag.positions[activeFile] || []
              const totalOccurrences = fileOccurrences.length

              return (
                <Collapsible key={tag.id}>
                  <CollapsibleTrigger
                    className={`flex w-full items-center gap-2 rounded-lg border bg-card p-2 text-left hover:bg-accent ${
                      highlightedTag === tag.text ? "bg-green-200" : ""
                    }`} 
                    onClick={() => onTagClick(tag.text)}
                  >
                    <ChevronRight
                      className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                        highlightedTag === tag.text ? "rotate-90" : ""
                      }`}
                    />
                    <div className={`h-3 w-3 rounded`} style={{ backgroundColor: tag.color }} />
                    <span className="font-semibold">{tag.text}</span>
                    <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-sm text-muted-foreground">
                      {totalOccurrences} {totalOccurrences === 1 ? "occurrence" : "occurrences"}
                    </span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-1 space-y-1">
                    {fileOccurrences.map((position, index) => (
                      <TextOccurrence
                        key={index}
                        text={position.text}
                        start={position.start}
                        stop={position.stop}
                        isHighlighted={highlightedTag === tag.text}
                        onClick={() => onOccurrenceClick(position)}
                      />
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
