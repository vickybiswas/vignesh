"use client"

import type React from "react"

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
import type { AppState, Position } from "@/types"

interface TabulationViewProps {
  state: AppState
  onClose: () => void
  onSelectOccurrence: (occurrence: { text: string; start: number; stop: number; file: string }) => void
  setState: React.Dispatch<React.SetStateAction<AppState>>
  activeFile: string
}

type ExpansionType = 0 | 1 | 2 // 0: None, 1: Sentence, 2: Paragraph

export function TabulationView({ state, onClose, onSelectOccurrence, setState, activeFile }: TabulationViewProps) {
  const [rowSelections, setRowSelections] = useState<string[]>(() => {
    return state.tabulations[0]?.rows || []
  })
  const [columnSelections, setColumnSelections] = useState<string[]>(() => {
    return state.tabulations[0]?.columns || []
  })
  const [expansionType, setExpansionType] = useState<ExpansionType>(() => {
    return state.tabulations[0]?.extend_type || 0
  })
  const [selectedCell, setSelectedCell] = useState<{ row: string; col: string } | null>(null)
  const [highlightedOccurrence, setHighlightedOccurrence] = useState<Position | null>(null)

  useEffect(() => {
    setState((prevState) => ({
      ...prevState,
      tabulations: [
        {
          rows: rowSelections,
          columns: columnSelections,
          extend_type: expansionType,
        },
        ...prevState.tabulations.slice(1),
      ],
    }))
  }, [rowSelections, columnSelections, expansionType, setState])

  const options = useMemo(() => {
    const allOptions = new Set<string>()
    state.markings.forEach((marking) => {
      allOptions.add(marking.text)
    })
    return Array.from(allOptions)
  }, [state.markings])

  const getOccurrences = useCallback(
    (markingId: string): Position[] => {
      let occurrences: Position[] = []

      Object.entries(state.files).forEach(([fileName, fileData]) => {
        const positions = fileData.positions[markingId] || []
        occurrences = occurrences.concat(
          positions.map((position) => ({
            ...position,
            file: fileName,
          })),
        )
      })

      return occurrences
    },
    [state.files],
  )

  const tabulationData = useMemo(() => {
    if (rowSelections.length === 0 || columnSelections.length === 0) return null

    const data: { [key: string]: { [key: string]: { count: number; occurrences: Position[] } } } = {}

    rowSelections.forEach((row) => {
      data[row] = {}
      const rowMarking = state.markings.find((m) => m.text === row)
      if (!rowMarking) return

      const rowOccurrences = getOccurrences(rowMarking.id)

      let rowTotal = 0
      columnSelections.forEach((col) => {
        const colMarking = state.markings.find((m) => m.text === col)
        if (!colMarking) return

        const colOccurrences = getOccurrences(colMarking.id)

        // Find intersections based on the expansion type
        const intersectionOccurrences = rowOccurrences.filter((rowOcc) =>
          colOccurrences.some((colOcc) => {
            if (expansionType === 0) {
              // Direct text overlap
              return (
                colOcc.file === rowOcc.file && Math.max(rowOcc.start, colOcc.start) < Math.min(rowOcc.stop, colOcc.stop)
              )
            } else {
              // Same sentence/paragraph
              return colOcc.file === rowOcc.file && colOcc.start === rowOcc.start && colOcc.stop === rowOcc.stop
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
      const colTotal = rowSelections.reduce((total, row) => total + (data[row][col]?.count || 0), 0)
      data["Total"][col] = { count: colTotal, occurrences: [] }
    })

    // Calculate grand total
    data["Total"]["Total"] = {
      count: columnSelections.reduce((total, col) => total + (data["Total"][col]?.count || 0), 0),
      occurrences: [],
    }

    return data
  }, [rowSelections, columnSelections, state.markings, getOccurrences, expansionType])

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
    (occurrence: Position & { file: string }) => {
      setHighlightedOccurrence(occurrence)
      onSelectOccurrence(occurrence)
      onClose()
    },
    [onSelectOccurrence, onClose],
  )

  if (Object.keys(state.files).length === 0) {
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
                    stop={occurrence.stop}
                    isHighlighted={
                      highlightedOccurrence?.start === occurrence.start &&
                      highlightedOccurrence?.stop === occurrence.stop
                    }
                    onClick={() => handleOccurrenceClick(occurrence as Position & { file: string })}
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
