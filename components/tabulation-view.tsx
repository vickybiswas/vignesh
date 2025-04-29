"use client"

import { useMemo, useCallback, useState, useContext } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MultiSelect } from "./multi-select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { X, Download } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { TextOccurrence } from "./text-occurrence"
import { ProjectContext } from "@/contexts/project-context"

type ExpansionType = 0 | 1 | 2 // 0: None, 1: Sentence, 2: Paragraph

export function TabulationView() {
  const {
    showTabulationView,
    setShowTabulationView,
    currentProject,
    activeFile,
    handleSpecificSearchClick,
    getAllMarksForTabulation,
  } = useContext(ProjectContext)

  if (!showTabulationView) return null

  // Ensure we have valid objects
  const files = currentProject?.files || {}
  const marks = currentProject?.marks || {}
  const groups = currentProject?.groups || {}

  // Get all marks for tabulation (tags, searches, groups)
  const allMarks = getAllMarksForTabulation()

  // Prepare tabulation data
  const tabulationData = {
    markOptions: allMarks.map((mark) => `${mark.prefix} - ${mark.name}`),
    files: Object.keys(files),
    activeFile,
    getOccurrences: (markOption: string, fileName: string) => {
      // Parse the mark option to get prefix and name
      const [prefix, ...nameParts] = markOption.split(" - ")
      const name = nameParts.join(" - ")

      // Find the mark by prefix and name
      const mark = allMarks.find((m) => m.prefix === prefix && m.name === name)
      if (!mark) return []

      // If it's a group, get occurrences for all marks in the group
      if (prefix === "Group") {
        const groupId = mark.id
        const group = groups[groupId]
        if (!group) return []

        // Collect occurrences from all marks in the group
        const allOccurrences: Array<{
          text: string
          start: number
          end: number
          file: string
        }> = []

        // For each mark in the group
        ;(group.marks || []).forEach((markId) => {
          const markObj = marks[markId]
          if (!markObj) return

          // Get occurrences for this mark
          const file = files[fileName]
          if (!file) return

          const occurrences = (file.occurrences || [])
            .filter((occ) => occ.id === markId)
            .map((occ) => ({
              text: occ.text || "",
              start: occ.start || 0,
              end: occ.end || 0,
              file: fileName,
            }))

          allOccurrences.push(...occurrences)
        })

        return allOccurrences
      }

      // For tags and searches, find the mark ID
      const markId = mark.id

      // Get occurrences for this mark
      const file = files[fileName]
      if (!file) return []

      return (file.occurrences || [])
        .filter((occ) => occ.id === markId)
        .map((occ) => ({
          text: occ.text || "",
          start: occ.start || 0,
          end: occ.end || 0,
          file: fileName,
        }))
    },
  }

  return (
    <TabulationViewContent
      data={tabulationData}
      onClose={() => setShowTabulationView(false)}
      onSelectOccurrence={(occurrence) => {
        handleSpecificSearchClick(occurrence)
        setShowTabulationView(false)
      }}
    />
  )
}

interface TabulationViewProps {
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

export function TabulationViewContent({ data, onClose, onSelectOccurrence }: TabulationViewProps) {
  // Persistent tabulation configuration from context
  const {
    tabulationRowSelections: rowSelections,
    setTabulationRowSelections: setRowSelections,
    tabulationColumnSelections: columnSelections,
    setTabulationColumnSelections: setColumnSelections,
    tabulationExpansionType: expansionType,
    setTabulationExpansionType: setExpansionType,
  } = useContext(ProjectContext)
  const [selectedCell, setSelectedCell] = useState<{ row: string; col: string } | null>(null)
  const [highlightedOccurrence, setHighlightedOccurrence] = useState<{
    text: string
    start: number
    end: number
  } | null>(null)

  const {
    currentProject,
    setActiveFile,
    setSelectedTagFilter,
    setSearchTerm,
  } = useContext(ProjectContext)
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
              // Get content once
              const content = currentProject.files[fileName]?.content || ""
              const startPos = Math.min(rowOcc.start, colOcc.start)
              const endPos = Math.max(rowOcc.end, colOcc.end)
              if (expansionType === 0) {
                // Direct text overlap
                return Math.max(rowOcc.start, colOcc.start) < Math.min(rowOcc.end, colOcc.end)
              } else if (expansionType === 1) {
                // Same sentence: boundary at ., !, or ?
                // Find last sentence-end before startPos
                const punctuations = ['.', '!', '?']
                let lastPunc = -1
                for (const p of punctuations) {
                  lastPunc = Math.max(lastPunc, content.lastIndexOf(p, startPos))
                }
                const sentStart = lastPunc === -1 ? 0 : lastPunc + 1
                // Find next sentence-end after endPos
                let nextPunc = content.length
                for (const p of punctuations) {
                  const idx = content.indexOf(p, endPos)
                  if (idx !== -1 && idx < nextPunc) nextPunc = idx
                }
                const sentEnd = nextPunc === content.length ? content.length : nextPunc + 1
                return (
                  rowOcc.start >= sentStart && rowOcc.end <= sentEnd &&
                  colOcc.start >= sentStart && colOcc.end <= sentEnd
                )
              } else {
                // Same paragraph: boundary at blank lines or single newline
                let sep = '\n\n'
                let lastIdx = content.lastIndexOf(sep, startPos)
                if (lastIdx === -1) {
                  sep = '\n'
                  lastIdx = content.lastIndexOf(sep, startPos)
                }
                const paraStart = lastIdx === -1 ? 0 : lastIdx + sep.length
                // Find next separator after endPos
                let nextIdx = content.indexOf(sep, endPos)
                if (nextIdx === -1 && sep === '\n\n') {
                  sep = '\n'
                  nextIdx = content.indexOf(sep, endPos)
                }
                const paraEnd = nextIdx === -1 ? content.length : nextIdx
                return (
                  rowOcc.start >= paraStart && rowOcc.end <= paraEnd &&
                  colOcc.start >= paraStart && colOcc.end <= paraEnd
                )
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
      // Ensure correct file is active
      setActiveFile(occurrence.file)
      // Highlight corresponding tag or search based on selected row
      if (selectedCell) {
        const [prefix, ...nameParts] = selectedCell.row.split(" - ")
        const name = nameParts.join(" - ")
        if (prefix === "Tag") {
          setSelectedTagFilter(name)
        } else if (prefix === "Search") {
          setSearchTerm(name)
        }
      }
      onSelectOccurrence(occurrence)
    },
    [onSelectOccurrence, selectedCell, setActiveFile, setSelectedTagFilter, setSearchTerm],
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
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[250px]">
              <label className="text-sm font-medium mb-1 block">Row Items</label>
              <MultiSelect
                options={data.markOptions}
                selected={rowSelections}
                onChange={setRowSelections}
                placeholder="Select row items"
              />
            </div>
            <div className="flex-1 min-w-[250px]">
              <label className="text-sm font-medium mb-1 block">Column Items</label>
              <MultiSelect
                options={data.markOptions}
                selected={columnSelections}
                onChange={setColumnSelections}
                placeholder="Select column items"
              />
            </div>
            <div className="min-w-[180px]">
              <label className="text-sm font-medium mb-1 block">Extend Search Type</label>
              <Select
                value={expansionType.toString()}
                onValueChange={(value) => setExpansionType(Number.parseInt(value) as ExpansionType)}
              >
                <SelectTrigger>
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
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Intersection</TableHead>
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
            </div>
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
