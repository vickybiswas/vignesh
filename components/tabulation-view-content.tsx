"use client"
import { useMemo, useCallback, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MultiSelect } from "./multi-select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { X, Download } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { TextOccurrence } from "./text-occurrence"

// Updated interface for the new state structure
interface TabulationViewContentProps {
  data: {
    markOptions: string[]
    files: string[]
    activeFile: string
    getOccurrences: (
      markName: string,
      fileName: string,
    ) => Array<{
      text: string
      start: number
      end: number
      file: string
    }>
  }
  onClose: () => void
  onSelectOccurrence: (occurrence: { text: string; start: number; end: number; file: string }) => void
}

type ExpansionType = 0 | 1 | 2 // 0: None, 1: Sentence, 2: Paragraph

export function TabulationViewContent({ data, onClose, onSelectOccurrence }: TabulationViewContentProps) {
  // State for tabulation configuration
  const [rowSelections, setRowSelections] = useState<string[]>([])
  const [columnSelections, setColumnSelections] = useState<string[]>([])
  const [expansionType, setExpansionType] = useState<ExpansionType>(0)
  const [selectedCell, setSelectedCell] = useState<{ row: string; col: string } | null>(null)
  const [highlightedOccurrence, setHighlightedOccurrence] = useState<{
    text: string
    start: number
    end: number
  } | null>(null)

  // Generate tabulation data based on selections
  const tabulationData = useMemo(() => {
    if (rowSelections.length === 0 || columnSelections.length === 0) return null

    const result: Record<
      string,
      Record<
        string,
        {
          count: number
          occurrences: Array<{
            text: string
            start: number
            end: number
            file: string
          }>
        }
      >
    > = {}

    // Initialize rows
    rowSelections.forEach((row) => {
      result[row] = {}

      // Initialize columns for this row
      columnSelections.forEach((col) => {
        result[row][col] = { count: 0, occurrences: [] }
      })

      // Add Total column
      result[row]["Total"] = { count: 0, occurrences: [] }
    })

    // Add Total row
    result["Total"] = {}
    columnSelections.forEach((col) => {
      result["Total"][col] = { count: 0, occurrences: [] }
    })
    result["Total"]["Total"] = { count: 0, occurrences: [] }

    // Calculate intersections for each file
    data.files.forEach((fileName) => {
      rowSelections.forEach((row) => {
        const rowOccurrences = data.getOccurrences(row, fileName)

        columnSelections.forEach((col) => {
          const colOccurrences = data.getOccurrences(col, fileName)

          // Find intersections based on the expansion type
          const intersectionOccurrences = rowOccurrences.filter((rowOcc) =>
            colOccurrences.some((colOcc) => {
              if (expansionType === 0) {
                // Direct text overlap
                return Math.max(rowOcc.start, colOcc.start) < Math.min(rowOcc.end, colOcc.end)
              } else if (expansionType === 1) {
                // Same sentence - simplified for demo
                return Math.abs(colOcc.start - rowOcc.start) < 100
              } else {
                // Same paragraph - simplified for demo
                return Math.abs(colOcc.start - rowOcc.start) < 500
              }
            }),
          )

          // Add to result
          result[row][col].count += intersectionOccurrences.length
          result[row][col].occurrences.push(...intersectionOccurrences)

          // Update row total
          result[row]["Total"].count += intersectionOccurrences.length

          // Update column total
          result["Total"][col].count += intersectionOccurrences.length

          // Update grand total
          result["Total"]["Total"].count += intersectionOccurrences.length
        })
      })
    })

    return result
  }, [rowSelections, columnSelections, expansionType, data])

  const exportToCSV = useCallback(() => {
    if (!tabulationData) return

    const headers = ["Intersection", ...columnSelections, "Total"]
    const rows = [
      headers,
      ...rowSelections.map((row) => [
        row,
        ...columnSelections.map((col) => tabulationData[row][col].count),
        tabulationData[row]["Total"].count,
      ]),
      [
        "Total",
        ...columnSelections.map((col) => tabulationData["Total"][col].count),
        tabulationData["Total"]["Total"].count,
      ],
    ]

    const csvContent = rows.map((row) => row.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", "tabulation.csv")
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }, [tabulationData, rowSelections, columnSelections])

  const handleOccurrenceClick = useCallback(
    (occurrence: { text: string; start: number; end: number; file: string }) => {
      setHighlightedOccurrence(occurrence)
      onSelectOccurrence(occurrence)
    },
    [onSelectOccurrence],
  )

  if (data.files.length === 0) {
    return (
      <Card className="fixed inset-0 z-50 flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="flex justify-between items-center">
            <span>Tabulation View</span>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-grow overflow-auto">
          <div className="text-center text-muted-foreground">No files available for tabulation.</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="fixed inset-0 z-50 flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex justify-between items-center">
          <span>Tabulation View</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportToCSV} disabled={!tabulationData}>
              <Download className="h-4 w-4 mr-2" />
              Export to CSV
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow overflow-auto">
        <div className="space-y-4">
          <div className="flex gap-4">
            <MultiSelect
              options={data.markOptions}
              selected={rowSelections}
              onChange={setRowSelections}
              placeholder="Select row items"
            />
            <MultiSelect
              options={data.markOptions}
              selected={columnSelections}
              onChange={setColumnSelections}
              placeholder="Select column items"
            />
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">Extend Search Type</span>
              <Select
                value={expansionType.toString()}
                onValueChange={(value) => setExpansionType(Number.parseInt(value) as ExpansionType)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select expansion type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No Expand</SelectItem>
                  <SelectItem value="1">Sentence Expand</SelectItem>
                  <SelectItem value="2">Paragraph Expand</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {tabulationData ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Intersection</TableHead>
                  {columnSelections.map((col) => (
                    <TableHead key={col}>{col}</TableHead>
                  ))}
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rowSelections.map((row) => (
                  <TableRow key={row}>
                    <TableCell className="font-medium">{row}</TableCell>
                    {columnSelections.map((col) => (
                      <TableCell
                        key={col}
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => setSelectedCell({ row, col })}
                      >
                        {tabulationData[row][col].count}
                      </TableCell>
                    ))}
                    <TableCell>{tabulationData[row]["Total"].count}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell className="font-medium">Total</TableCell>
                  {columnSelections.map((col) => (
                    <TableCell key={col}>{tabulationData["Total"][col].count}</TableCell>
                  ))}
                  <TableCell>{tabulationData["Total"]["Total"].count}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <div className="text-center text-muted-foreground">
              Select row and column items to generate the tabulation.
            </div>
          )}
        </div>
      </CardContent>
      {selectedCell && tabulationData && (
        <Dialog open={!!selectedCell} onOpenChange={() => setSelectedCell(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Occurrences for {selectedCell.row} ∩ {selectedCell.col}
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[300px]">
              {tabulationData[selectedCell.row][selectedCell.col].occurrences.map((occurrence, index) => (
                <div key={index} className="mb-4">
                  <TextOccurrence
                    text={occurrence.text}
                    start={occurrence.start}
                    stop={occurrence.end}
                    isHighlighted={
                      highlightedOccurrence?.start === occurrence.start && highlightedOccurrence?.end === occurrence.end
                    }
                    onClick={() => handleOccurrenceClick(occurrence)}
                    fileId={occurrence.file}
                  />
                </div>
              ))}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  )
}
