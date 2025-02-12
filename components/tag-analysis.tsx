"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChevronRight, Hash } from "lucide-react"
import { TextOccurrence } from "./text-occurrence"

interface TagData {
  text: string
  start: number
  end: number
}

interface TagAnalysisProps {
  tags: Record<string, TagData[]>
  colors: Record<string, string>
  onTagClick: (label: string) => void
  onOccurrenceClick: (start: number, end: number) => void
  highlightedTag: string | null
  highlightedOccurrence: { start: number; end: number } | null
}

export function TagAnalysis({
  tags,
  colors,
  onTagClick,
  onOccurrenceClick,
  highlightedTag,
  highlightedOccurrence,
}: TagAnalysisProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hash className="h-5 w-5" />
          Tag Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-4">
            {Object.entries(tags).map(([label, instances]) => (
              <Collapsible key={label}>
                <CollapsibleTrigger
                  className={`flex w-full items-center gap-2 rounded-lg border bg-card p-4 text-left hover:bg-accent ${
                    highlightedTag === label ? "bg-green-200" : ""
                  }`}
                  onClick={() => onTagClick(label)}
                >
                  <ChevronRight
                    className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                      highlightedTag === label ? "rotate-90" : ""
                    }`}
                  />
                  <div className={`h-3 w-3 rounded ${colors[label]}`} />
                  <span className="font-semibold">{label}</span>
                  <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-sm text-muted-foreground">
                    {instances.length} {instances.length === 1 ? "occurrence" : "occurrences"}
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  {instances.map((tag, index) => (
                    <TextOccurrence
                      key={index}
                      text={tag.text}
                      start={tag.start}
                      end={tag.end}
                      isHighlighted={
                        highlightedOccurrence?.start === tag.start && highlightedOccurrence?.end === tag.end
                      }
                      onClick={() => onOccurrenceClick(tag.start, tag.end)}
                    />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

