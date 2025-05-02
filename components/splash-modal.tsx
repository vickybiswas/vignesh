"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"

const SPLASH_STORAGE_KEY = "splashDoNotShow"
const WALKTHROUGH_STORAGE_KEY = "walkthroughDoNotShow"
const SPLASH_VISITED_KEY = "splashVisited"

interface SplashModalProps {
  onClose?: () => void
}
export function SplashModal({ onClose }: SplashModalProps) {
  const [open, setOpen] = useState(false)
  const [doNotShow, setDoNotShow] = useState(false)
  const [skipWalkthrough, setSkipWalkthrough] = useState(false)
  const [hasVisited, setHasVisited] = useState(false)

  useEffect(() => {
    // Determine if splash should open (dev always shows, else respect skip)
    const skip = window.localStorage.getItem(SPLASH_STORAGE_KEY)
    const isDev = process.env.NODE_ENV !== 'production'
    if (isDev || !skip) {
      setOpen(true)
    } else {
      onClose?.()
    }
    // Track first-time visit
    const visited = window.localStorage.getItem(SPLASH_VISITED_KEY)
    setHasVisited(Boolean(visited))
  }, [])

  const handleClose = () => {
    setOpen(false)
    if (doNotShow) {
      window.localStorage.setItem(SPLASH_STORAGE_KEY, "true")
    }
    if (skipWalkthrough) {
      window.localStorage.setItem(WALKTHROUGH_STORAGE_KEY, "true")
    }
    // Mark that user has seen the splash at least once
    window.localStorage.setItem(SPLASH_VISITED_KEY, "true")
    onClose?.()
  }

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex justify-center">
            <Image
              src={`${process.env.NEXT_PUBLIC_BASE_PATH}/vqdalogo.png`}
              alt="Vighesh QDA Logo"
              width={100}
              height={100}
            />
          </DialogTitle>
          <DialogTitle className="text-center">Vighesh QDA Tool</DialogTitle>
          <DialogDescription className="text-center">
            A lightweight Qualitative Data Analysis (QDA) tool to help researchers analyze and manage qualitative data, such as interview transcripts, focus group discussions, and field notes. Allows organizing, coding (Search, Tag, and Group), and visualizing qualitative data, helping researchers identify patterns and themes. 
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-2">
          <p className="font-semibold">Creator:</p>
          <ul className="list-disc list-inside">
            <li>Vicky Biswas</li>
          </ul>
          <p className="font-semibold">Guidance:</p>
          <ul className="list-disc list-inside">
            <li>Professor Vignesh - IIT Delhi</li>
          </ul>
          {hasVisited && (
            <>
              <div className="flex items-center mt-4">
                <Checkbox
                  id="splash-do-not-show"
                  checked={doNotShow}
                  onCheckedChange={(checked) => setDoNotShow(!!checked)}
                  className="mr-2"
                />
                <label htmlFor="splash-do-not-show" className="select-none">
                  Do not show splash again
                </label>
              </div>
              <div className="flex items-center">
                <Checkbox
                  id="splash-walkthrough-do-not-show"
                  checked={skipWalkthrough}
                  onCheckedChange={(checked) => setSkipWalkthrough(!!checked)}
                  className="mr-2"
                />
                <label htmlFor="splash-walkthrough-do-not-show" className="select-none">
                  Do not show walkthrough again
                </label>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}