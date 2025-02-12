import { ArrowRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface TextOccurrenceProps {
  text: string
  start: number
  end: number
  isHighlighted?: boolean
  onClick: () => void
}

export function TextOccurrence({ text, start, end, isHighlighted, onClick }: TextOccurrenceProps) {
  return (
    <Card className={`cursor-pointer hover:bg-accent ${isHighlighted ? "bg-green-200" : ""}`} onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-start gap-2">
          <div className="mt-1.5 shrink-0">
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="font-mono text-sm">
              Position: {start} → {end}
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

