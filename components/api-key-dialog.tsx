"use client"

import { useContext, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ProjectContext } from "@/contexts/project-context"
import { toast } from "@/hooks/use-toast"
import { X } from "lucide-react"

export function ApiKeyDialog() {
  const { apiKey, showApiKeyDialog, setShowApiKeyDialog, handleSaveApiKey } = useContext(ProjectContext)
  const [keyInput, setKeyInput] = useState(apiKey || "")

  const onSave = () => {
    if (!keyInput.trim()) {
      toast({ title: "Invalid Key", description: "Please enter a non-empty API key.", variant: "destructive" })
      return
    }
    handleSaveApiKey(keyInput.trim())
  }

  return (
    <>
      <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter OpenAI API Key</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col space-y-2">
            <Input
              type="password"
              placeholder="sk-..."
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
            />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowApiKeyDialog(false)}>
                Cancel
              </Button>
              <Button onClick={onSave}>
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}