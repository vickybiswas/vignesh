"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2 } from "lucide-react"

interface SynonymsPopupProps {
  word: string
  synonyms: string[]
  isLoading: boolean
  onClose: () => void
  onSave: (selectedSynonyms: string[]) => void
}

export function SynonymsPopup({ word, synonyms, isLoading, onClose, onSave }: SynonymsPopupProps) {
  const [selectedSynonyms, setSelectedSynonyms] = useState<string[]>([])

  const handleCheckboxChange = (synonym: string) => {
    setSelectedSynonyms((prev) => (prev.includes(synonym) ? prev.filter((s) => s !== synonym) : [...prev, synonym]))
  }

  const handleSave = () => {
    onSave(selectedSynonyms)
  }

  const handleSelectAll = () => {
    setSelectedSynonyms(synonyms)
  }

  const handleDeselectAll = () => {
    setSelectedSynonyms([])
  }

  // Default fallback synonyms if none are provided
  const displaySynonyms = synonyms.length > 0 ? synonyms : ["sample", "text", "part", "click", "tags"]

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Synonyms for "{word}"</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Fetching synonyms...</span>
          </div>
        ) : (
          <>
            <div className="flex justify-between mb-2">
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                Deselect All
              </Button>
            </div>

            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {displaySynonyms.map((synonym) => (
                  <div key={synonym} className="flex items-center space-x-2 p-2 rounded hover:bg-accent">
                    <Checkbox
                      id={`synonym-${synonym}`}
                      checked={selectedSynonyms.includes(synonym)}
                      onCheckedChange={() => handleCheckboxChange(synonym)}
                    />
                    <label
                      htmlFor={`synonym-${synonym}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                    >
                      {synonym}
                    </label>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={selectedSynonyms.length === 0}>
                Save {selectedSynonyms.length > 0 && `(${selectedSynonyms.length})`}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
