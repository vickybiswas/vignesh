"use client"

import { useMemo, useCallback, useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MultiSelect } from "./multi-select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { X, Download } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { TextOccurrence } from "./text-occurrence"

interface Tag {
  id: number
  text: string
  start: number
  end: number
  label: string
  color: string
}

interface FileData {
  content: string
  tags: Tag[]
}

interface TabulationViewProps {
  files: Record<string, FileData>
  onClose: () => void
  rowSelections: string[]
  columnSelections: string[]
  setRowSelections: (selections: string[]) => void
  setColumnSelections: (selections: string[]) => void
  savedSearches: string[]
  onSelectOccurrence: (occurrence: { text: string; start: number; end: number; file: string }) => void
}

type ExpansionType = "no-expand" | "sentence-expand" | "paragraph-expand"

interface Occurrence {
  file: string
  text: string
  start: number
  end: number
}

export function TabulationView({
  files,
  onClose,
  rowSelections,
  columnSelections,
  setRowSelections,
  setColumnSelections,
  savedSearches,
  onSelectOccurrence,
}: TabulationViewProps) {
  const [options, setOptions] = useState<string[]>([])
  const [expansionType, setExpansionType] = useState<ExpansionType>(() => {
    const stored = localStorage.getItem("expansionType")
    return (stored as ExpansionType) || "no-expand"
  })
  const [selectedCell, setSelectedCell] = useState<{ row: string; col: string } | null>(null)
  const [highlightedOccurrence, setHighlightedOccurrence] = useState<Occurrence | null>(null)

  useEffect(() => {
    localStorage.setItem("expansionType", expansionType)
  }, [expansionType])

  useEffect(() => {
    const allOptions = new Set<string>()
    Object.values(files).forEach((file) => {
      file.tags.forEach((tag) => allOptions.add(tag.label))
    })
    savedSearches.forEach((search) => allOptions.add(search))
    setOptions(Array.from(allOptions))
  }, [files, savedSearches])

  const allTags = useMemo(() => {
    return Object.values(files).flatMap((file) => file.tags)
  }, [files])

  const uniqueTagLabels = useMemo(() => Array.from(new Set(allTags.map((tag) => tag.label))), [allTags])

  const getOccurrences = useCallback(
    (term: string, isTag: boolean): Occurrence[] => {
      let occurrences: Occurrence[] = []

      Object.entries(files).forEach(([fileName, fileData]) => {
        if (isTag) {
          const tagOccurrences = fileData.tags
            .filter((tag) => tag.label === term)
            .map((tag) => ({
              file: fileName,
              text: tag.text,
              start: tag.start,
              end: tag.end,
            }))
          occurrences = occurrences.concat(tagOccurrences)
        } else {
          let index = fileData.content.toLowerCase().indexOf(term.toLowerCase())
          while (index !== -1) {
            let start = index
            let end = index + term.length

            if (expansionType === "sentence-expand") {
              start = fileData.content.lastIndexOf(".", index) + 1
              if (start === 0) start = 0 // If no period found before, start from the beginning
              end = fileData.content.indexOf(".", index + 1)
              if (end === -1) end = fileData.content.length
              // Trim leading and trailing whitespace
              while (fileData.content[start] === " " && start < index) start++
              while (fileData.content[end - 1] === " " && end > index + term.length) end--
            } else if (expansionType === "paragraph-expand") {
              start = fileData.content.lastIndexOf("\n\n", index) + 2
              if (start === 1) start = 0 // If no double newline found before, start from the beginning
              end = fileData.content.indexOf("\n\n", index)
              if (end === -1) end = fileData.content.length
            }

            occurrences.push({
              file: fileName,
              text: fileData.content.slice(start, end),
              start,
              end,
            })
            console.log("start", start, "end", end, "file", fileName, "text", fileData.content.slice(start, end))
            index = fileData.content.toLowerCase().indexOf(term.toLowerCase(), index + 1)
          }
        }
      })

      console.log("occurrences", occurrences)

      return occurrences
    },
    [files, expansionType],
  )

  const tabulationData = useMemo(() => {
    if (rowSelections.length === 0 || columnSelections.length === 0) return null

    const data: { [key: string]: { [key: string]: { count: number; occurrences: Occurrence[] } } } = {}

    rowSelections.forEach((row) => {
      data[row] = {}
      const rowOccurrences = getOccurrences(row, uniqueTagLabels.includes(row))

      let rowTotal = 0
      columnSelections.forEach((col) => {
        console.log("row", row, "col", col)
        const colOccurrences = getOccurrences(col, uniqueTagLabels.includes(col))

        // Find intersections based on the expansion type
        const intersectionOccurrences = rowOccurrences.filter((rowOcc) =>
          colOccurrences.some((colOcc) => {
            if (expansionType === "no-expand") {
              // Direct text overlap
              return (
                colOcc.file === rowOcc.file && Math.max(rowOcc.start, colOcc.start) < Math.min(rowOcc.end, colOcc.end)
              )
            } else {
              console.log("rowOcc", rowOcc, "colOcc", colOcc, "file", rowOcc.file)
              // Same sentence/paragraph
              return colOcc.file === rowOcc.file && colOcc.start === rowOcc.start && colOcc.end === rowOcc.end
            }
          }),
        )

        data[row][col] = {
          count: intersectionOccurrences.length,
          occurrences: intersectionOccurrences,
        }
        rowTotal += intersectionOccurrences.length
      })

      data[row]["Total"] = { count: rowTotal, occurrences: [] }
    })

    // Add totals for columns
    data["Total"] = {}
    columnSelections.forEach((col) => {
      const colTotal = rowSelections.reduce((total, row) => total + data[row][col].count, 0)
      data["Total"][col] = { count: colTotal, occurrences: [] }
    })

    // Calculate grand total
    data["Total"]["Total"] = {
      count: columnSelections.reduce((total, col) => total + data["Total"][col].count, 0),
      occurrences: [],
    }

    return data
  }, [rowSelections, columnSelections, uniqueTagLabels, getOccurrences, expansionType])

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
    (occurrence: Occurrence) => {
      setHighlightedOccurrence(occurrence)
      onSelectOccurrence(occurrence)
    },
    [onSelectOccurrence],
  )

  if (!files || Object.keys(files).length === 0) {
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
              options={options}
              selected={rowSelections}
              onChange={setRowSelections}
              placeholder="Select row items"
            />
            <MultiSelect
              options={options}
              selected={columnSelections}
              onChange={setColumnSelections}
              placeholder="Select column items"
            />
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">Extend Search Type</span>
            <Select value={expansionType} onValueChange={(value: ExpansionType) => setExpansionType(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select expansion type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no-expand">No Expand</SelectItem>
                <SelectItem value="sentence-expand">Sentence Expand</SelectItem>
                <SelectItem value="paragraph-expand">Paragraph Expand</SelectItem>
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
                    end={occurrence.end}
                    isHighlighted={
                      highlightedOccurrence?.start === occurrence.start && highlightedOccurrence?.end === occurrence.end
                    }
                    onClick={() => handleOccurrenceClick(occurrence)}
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

