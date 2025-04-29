"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { ChevronRight, Hash, Trash } from "lucide-react"
import { TextOccurrence } from "../text-occurrence"

interface TagAnalysisPanelProps {
  tags: Array<{
    id: string
    text: string
    color: string
    positions: Record<string, Array<{ text: string; start: number; stop: number }>>
  }>
  onTagClick: (label: string) => void
  onOccurrenceClick: (position: { start: number; end: number }) => void
  onRemoveTag: (tagId: string) => void
  onRemoveOccurrence: (tagId: string, position: { start: number; end: number }) => void
  highlightedTag: string
  activeFile: string
}

export function TagAnalysisPanel({
  tags,
  onTagClick,
  onOccurrenceClick,
  onRemoveTag,
  onRemoveOccurrence,
  highlightedTag,
  activeFile,
}: TagAnalysisPanelProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hash className="h-5 w-5" />
          Tag Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-4">
            {tags.map((tag) => {
              // Count occurrences for this tag in the active file
              const fileOccurrences = tag.positions[activeFile] || []
              const totalOccurrences = fileOccurrences.length

              return (
                <Collapsible key={tag.id}>
                  <CollapsibleTrigger asChild>
                    <div
                      className={`flex w-full items-center gap-2 rounded-lg border bg-card p-4 text-left hover:bg-accent ${
                        highlightedTag === tag.text ? "bg-green-200" : ""
                      }`}
                    >
                      <ChevronRight
                        className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                          highlightedTag === tag.text ? "rotate-90" : ""
                        }`}
                      />
                      <div className="h-3 w-3 rounded" style={{ backgroundColor: tag.color }} />
                      <span className="font-semibold" onClick={() => onTagClick(tag.text)}>
                        {tag.text}
                      </span>
                      <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-sm text-muted-foreground">
                        {totalOccurrences} {totalOccurrences === 1 ? "occurrence" : "occurrences"}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="ml-1 h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation()
                          onRemoveTag(tag.id)
                        }}
                      >
                        <Trash className="h-3 w-3" />
                      </Button>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-2">
                    {fileOccurrences.map((position, index) => (
                      <div key={index} className="relative">
                        <TextOccurrence
                          text={position.text}
                          start={position.start}
                          stop={position.stop}
                          isHighlighted={highlightedTag === tag.text}
                          onClick={() => onOccurrenceClick(position)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 h-6 w-6"
                          onClick={() => onRemoveOccurrence(tag.id, position)}
                        >
                          <Trash className="h-3 w-3" />
                        </Button>
                      </div>
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
