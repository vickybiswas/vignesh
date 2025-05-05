"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import { Card } from "./ui/card"

// Application base path for static assets
const isProd = process.env.NODE_ENV === 'production'
const basePath = isProd ? '/vignesh' : ''

const SPLASH_STORAGE_KEY = "splashDoNotShow"
const WALKTHROUGH_STORAGE_KEY = "walkthroughDoNotShow"
const SPLASH_VISITED_KEY = "splashVisited"

interface SplashModalProps {
  /** Called when the modal closes */
  onClose?: () => void
  /** If true, always open the modal ignoring any stored skip flags */
  forceOpen?: boolean
}
export function SplashModal({ onClose, forceOpen = false }: SplashModalProps) {
  const [open, setOpen] = useState(false)
  const [doNotShow, setDoNotShow] = useState(false)
  const [skipWalkthrough, setSkipWalkthrough] = useState(false)
  const [hasVisited, setHasVisited] = useState(false)

  useEffect(() => {
    // Initialize checkbox states from localStorage
    const storedSplashSkip = window.localStorage.getItem(SPLASH_STORAGE_KEY) == "true"
    setDoNotShow(Boolean(storedSplashSkip))
    const storedWalkthroughSkip = window.localStorage.getItem(WALKTHROUGH_STORAGE_KEY) == "true"
    setSkipWalkthrough(Boolean(storedWalkthroughSkip))
    const visited = window.localStorage.getItem(SPLASH_VISITED_KEY) == "true"
    setHasVisited(Boolean(visited))
    console.log("1 >>>", storedSplashSkip, storedWalkthroughSkip, visited, doNotShow, skipWalkthrough)

    // Determine if splash should open: forced, or if not skipped
    console.log("forceOpen", forceOpen)
    if (forceOpen || !Boolean(storedSplashSkip)) {
      setOpen(true)
    } else {
      onClose?.()
    }
  }, [])

  const handleClose = () => {
    setOpen(false)
    window.localStorage.setItem(SPLASH_STORAGE_KEY, doNotShow)
    window.localStorage.setItem(WALKTHROUGH_STORAGE_KEY, skipWalkthrough)
    window.localStorage.setItem(SPLASH_VISITED_KEY, "true")
    onClose?.()
  }

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex justify-center">
            <Image
              src={`${basePath}/vqdalogo.png`}
              alt="Vigesh QDA Logo"
              width={100}
              height={100}
            />
          </DialogTitle>
          <DialogTitle className="text-center">Vignesh QDA Tool</DialogTitle>
          <DialogDescription className="text-center">
            A lightweight Qualitative Data Analysis (QDA) tool to help researchers analyze and manage qualitative data, such as interview transcripts, focus group discussions, and field notes. Allows organizing, coding (Search, Tag, and Group), and visualizing qualitative data, helping researchers identify patterns and themes. 
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-2">
          <p className="font-semibold">Guidance:</p>
          <Card className="list-disc list-inside">
            <Link target="_blank" className="bg-blue-500 text-white hover:bg-blue-600 text-decoration-none px-4 py-2 rounded" href="https://web.iitd.ac.in/~vignes/">Professor Vignesh</Link> - IIT Delhi - The amount of patience and trust he put in a person he did not know is unsurpassed and has led to this product.
          </Card>
          <div className="text-right">
            <p className="font-semibold">Created By:</p>
            <Link target="_blank" className="bg-blue-500 text-white hover:bg-blue-600 text-decoration-none px-4 py-2 rounded" href="https://www.linkedin.com/in/vickybiswas" >Vicky Biswas</Link>
          </div>

        <DialogFooter className="float-right pt-4">
          <Button onClick={handleClose}>Close</Button>
        </DialogFooter>
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
      </DialogContent>
    </Dialog>
  )
}