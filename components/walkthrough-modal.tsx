"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

const WALKTHROUGH_STORAGE_KEY = "walkthroughDoNotShow"
const WALKTHROUGH_SEEN_KEY = "walkthroughSeen"

interface WalkthroughStep {
  title: string
  description: string
  selector?: string
  /** Preferred callout position relative to target */
  position?: 'top' | 'bottom' | 'left' | 'right'
}

const steps: WalkthroughStep[] = [
  {
    title: "Welcome to Vighesh QDA Tool",
    description: "This tour will walk you through the main features. Click Next to continue or Skip to exit the tour.",
  },
  {
    title: "Project Management",
    description: "Use the header to create, switch, download, or upload projects.",
    selector: "#header",
  },
  {
    title: "Files Sidebar",
    description: "In the left panel, add and manage files. Select a file to view and edit its content.",
    selector: "#files-sidebar",
    position: 'right',
  },
  {
    title: "Content Area",
    description: "View and edit your text here. Right-click to add tags or search for terms.",
    selector: "#content-area",
  },
  {
    title: "Analysis Sidebar",
    description: "Use the right panel to analyze your data by tags, searches, and groups.",
    selector: "#analysis-sidebar",
    position: 'left',
  },
  {
    title: "Tabulation and Synonyms",
    description: "Click the table icon to view tabulated reports and use the synonyms popup to manage synonyms.",
    selector: "#tabulate-button",
  },
]

export function WalkthroughModal() {
  // Walkthrough opens by default
  const [open, setOpen] = useState(true)
  const [currentStep, setCurrentStep] = useState(0)
  const prevElRef = React.useRef<HTMLElement | null>(null)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)

  // No mount logic needed: open is initially true

  // Highlight target element for each step
  useEffect(() => {
    if (!open) return
    // remove previous highlight
    if (prevElRef.current) {
      prevElRef.current.classList.remove('walkthrough-highlight')
      prevElRef.current = null
    }
    const step = steps[currentStep]
    if (step.selector) {
      const el = document.querySelector(step.selector)
      if (el instanceof HTMLElement) {
        el.classList.add('walkthrough-highlight')
        prevElRef.current = el
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setTargetRect(el.getBoundingClientRect())
      } else {
        setTargetRect(null)
      }
    }
    // cleanup on next change or unmount
    return () => {
      if (prevElRef.current) {
        prevElRef.current.classList.remove('walkthrough-highlight')
        prevElRef.current = null
      }
    }
  }, [open, currentStep])

  const handleClose = () => {
    // remove any highlight
    if (prevElRef.current) {
      prevElRef.current.classList.remove('walkthrough-highlight')
      prevElRef.current = null
    }
    setTargetRect(null)
    setOpen(false)
    window.localStorage.setItem(WALKTHROUGH_SEEN_KEY, "true")
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleClose()
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Render custom callout when a target element is specified
  const step = steps[currentStep]
  if (open && step.selector && targetRect) {
    // Build overlay segments around the target (spotlight effect)
    const overlays = [
      { top: 0, left: 0, width: '100%', height: targetRect.top },
      { top: targetRect.top, left: 0, width: targetRect.left, height: targetRect.height },
      { top: targetRect.top, left: targetRect.right, width: window.innerWidth - targetRect.right, height: targetRect.height },
      { top: targetRect.bottom, left: 0, width: '100%', height: window.innerHeight - targetRect.bottom },
    ]
    // Determine callout position and arrow position
    const calloutWidth = 220
    const margin = 8
    let style: { top?: number; left?: number } = {}
    let calloutClass = 'walkthrough-callout'
    if (step.position === 'right') {
      // bubble to the right, arrow pointing left
      // bubble to the right of target, vertically centered
      style.left = targetRect.right + margin
      style.top = targetRect.top + targetRect.height / 2
      style.transform = 'translateY(-50%)'
      calloutClass += ' arrow-left'
    } else if (step.position === 'left') {
      // bubble to the left, arrow pointing right
      // bubble to the left of target, vertically centered
      style.left = targetRect.left - calloutWidth - margin
      style.top = targetRect.top + targetRect.height / 2
      style.transform = 'translateY(-50%)'
      calloutClass += ' arrow-right'
    } else {
      // default vertical placement
      const arrowHeight = 12
      let x = targetRect.left + targetRect.width / 2 - calloutWidth / 2
      if (x < margin) x = margin
      if (x + calloutWidth + margin > window.innerWidth) x = window.innerWidth - calloutWidth - margin
      let y = targetRect.top - 160
      if (y < margin) {
        y = targetRect.bottom + margin + arrowHeight
        calloutClass += ' arrow-up'
      }
      style.left = x
      style.top = y
    }
    return (
      <>
        {/* spotlight overlay segments */}
        {overlays.map((s, i) => (
          <div
            key={i}
            style={{ position: 'fixed', background: 'rgba(0,0,0,0.5)', zIndex: 900, ...s }}
          />
        ))}
        {/* Callout bubble */}
        <div className={calloutClass} style={style}>
          <div className="font-bold mb-1">{step.title}</div>
          <div className="text-sm mb-2">{step.description}</div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={handleBack} disabled={currentStep === 0}>
              Back
            </Button>
            <Button variant="outline" onClick={handleClose} className="mx-2">
              Skip
            </Button>
            <Button onClick={handleNext}>
              {currentStep < steps.length - 1 ? "Next" : "Finish"}
            </Button>
          </div>
        </div>
      </>
    )
  }
  // Fallback centered dialog for Steps without selector (e.g., Welcome)
  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{step.title}</DialogTitle>
          <DialogDescription>{step.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="justify-between">
          <Button variant="outline" onClick={handleBack} disabled={currentStep === 0}>
            Back
          </Button>
          <div>
            <Button variant="outline" onClick={handleClose} className="mr-2">
              Skip
            </Button>
            <Button onClick={handleNext}>
              {currentStep < steps.length - 1 ? "Next" : "Finish"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}