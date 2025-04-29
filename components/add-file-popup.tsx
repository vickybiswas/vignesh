"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"
import { Plus } from "lucide-react";
export default function AddFilePopup({ isOpen, setIsOpen, newFileName, setNewFileName, handleAddFile, fileAddError }) {
  return (
    <Dialog open={Boolean(isOpen)} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-black-600">Add file</DialogTitle>
        </DialogHeader>
        <div className="text-center text-gray-700 py-4">
        <div className="mt-4 space-y-2">
        <div className="flex items-center space-x-2">
          <Input
            type="text"
            placeholder="New file name"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleAddFile()}
          />
          {/* <Button size="icon" onClick={handleAddFile}>
            <Plus className="h-4 w-4" />
          </Button> */}
        </div>
        {fileAddError && <div className="text-red-600">{fileAddError}</div>}
       
      </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setIsOpen("")}>
            Cancel
          </Button>
          <Button onClick={handleAddFile}>
            Add
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}