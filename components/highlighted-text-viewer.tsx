import type React from "react"
import { useRef, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"

interface HighlightedTextViewerProps {
  content: string
  highlightStart: number
  highlightEnd: number
  onContentChange?: (newContent: string) => void
  onContextMenu?: (React.MouseEvent) => void
}

export const HighlightedTextViewer = React.forwardRef<HTMLDivElement, HighlightedTextViewerProps>(
  ({ content, highlightStart, highlightEnd, onContentChange, onContextMenu }, ref) => {
    const contentRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
      if (contentRef.current && highlightStart !== highlightEnd) {
        const range = document.createRange()
        const textNode = contentRef.current.firstChild
        if (textNode && textNode.nodeType === Node.TEXT_NODE) {
          range.setStart(textNode, Math.min(highlightStart, textNode.textContent?.length || 0))
          range.setEnd(textNode, Math.min(highlightEnd, textNode.textContent?.length || 0))
          const selection = window.getSelection()
          selection?.removeAllRanges()
          selection?.addRange(range)

          const rect = range.getBoundingClientRect()
          contentRef.current.scrollTo({
            top: rect.top - contentRef.current.getBoundingClientRect().top - 50,
            behavior: "smooth",
          })
        }
      }
    }, [highlightStart, highlightEnd])

    const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
      if (onContentChange) {
        onContentChange(e.currentTarget.textContent || "")
      }
    }

    return (
      <Card className="w-full h-full overflow-hidden">
        <CardContent className="p-6 h-full">
          <div
            ref={(el) => {
              contentRef.current = el
              if (typeof ref === "function") {
                ref(el)
              } else if (ref) {
                ref.current = el
              }
            }}
            className="text-lg p-4 border rounded relative whitespace-pre-wrap h-full overflow-auto"
            contentEditable={!!onContentChange}
            suppressContentEditableWarning
            onInput={handleInput}
            onContextMenu={onContextMenu}
          >
            {content}
          </div>
        </CardContent>
      </Card>
    )
  },
)

HighlightedTextViewer.displayName = "HighlightedTextViewer"
