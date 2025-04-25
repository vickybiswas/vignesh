"use-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChevronRight, Hash } from "lucide-react"
import { TextOccurrence } from "./text-occurrence"
import type { Marking, Position } from "@/types"

interface TagAnalysisProps {
  tags: Marking[]
  onTagClick: (label: string) => void
  onOccurrenceClick: (position: Position) => void
  highlightedTag: string | null
}

export function TagAnalysis({ tags, onTagClick, onOccurrenceClick, highlightedTag }: TagAnalysisProps) {
  return (
    <Card className="w-full h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hash className="h-5 w-5" />
          Tag Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-4">
            {tags?.map((tag) => (
              <Collapsible key={tag.id}>
                <CollapsibleTrigger
                  className={`flex w-full items-center gap-2 rounded-lg border bg-card p-4 text-left hover:bg-accent ${
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
                    {tag.positions ? Object.values(tag.positions).flat().length : 0} occurrences
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  {tag.positions &&
                    Object.entries(tag.positions)?.map(([fileId, positions]) =>
                      positions?.map((position, index) => (
                        <TextOccurrence
                          key={`${fileId}-${index}`}
                          text={position.text}
                          start={position.start}
                          stop={position.stop}
                          isHighlighted={highlightedTag === tag.text}
                          onClick={() => onOccurrenceClick(position)}
                        />
                      )),
                    )}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
