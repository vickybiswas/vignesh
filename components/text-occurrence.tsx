"use client"

import { ArrowRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface TextOccurrenceProps {
  text: string
  start: number
  stop: number
  isHighlighted?: boolean
  onClick: () => void
  fileId?: string
}

export function TextOccurrence({ text, start, stop, isHighlighted, onClick, fileId }: TextOccurrenceProps) {
  return (
    <Card className={`cursor-pointer hover:bg-accent ${isHighlighted ? "bg-green-200" : ""}`} onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-start gap-2">
          <div className="mt-1.5 shrink-0">
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="font-mono text-sm">
              Position: {start} → {stop}
              {fileId && <span className="ml-2 text-muted-foreground">({fileId})</span>}
            </p>
            <div className="rounded border bg-muted p-2">
              <p className="text-sm">&ldquo;{text}&rdquo;</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
