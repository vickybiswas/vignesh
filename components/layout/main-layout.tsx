"use client"

import type { ReactNode } from "react"
import React, { useContext, useState } from "react"
import { Header } from "./header"
import { FilesSidebar } from "./files-sidebar"
import { ContentArea } from "./content-area"
import { AnalysisSidebar } from "./analysis-sidebar"
import { ApiKeyDialog } from "@/components/api-key-dialog"
import { ProjectContext } from "@/contexts/project-context"

interface MainLayoutProps {
  children?: ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const { currentProject } = useContext(ProjectContext)
  const [leftWidth, setLeftWidth] = useState<number>(300)
  const [rightWidth, setRightWidth] = useState<number>(400)
  const startDragLeft = (e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = leftWidth
    const onMouseMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX
      setLeftWidth(Math.max(150, startWidth + delta))
    }
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }
  const startDragRight = (e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = rightWidth
    const onMouseMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX
      setRightWidth(Math.max(150, startWidth - delta))
    }
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  // Make sure we have a valid project before rendering the layout
  if (!currentProject) {
    return <div>Loading...</div>
  }

  return (
    <div className="flex flex-col h-screen max-w-full">
      <Header />
        <ApiKeyDialog />
      <div className="flex flex-1 overflow-hidden">
        <div style={{ width: leftWidth }} className="flex-shrink-0 overflow-auto min-h-0">
          <FilesSidebar />
        </div>
        <div
          className="w-1 bg-gray-200 cursor-col-resize hover:bg-gray-300"
          onMouseDown={startDragLeft}
        />
        <div className="flex-1 min-w-0 overflow-auto">
          <ContentArea />
        </div>
        <div
          className="w-1 bg-gray-200 cursor-col-resize hover:bg-gray-300"
          onMouseDown={startDragRight}
        />
        <div style={{ width: rightWidth }} className="flex-shrink-0 overflow-auto">
          <AnalysisSidebar />
        </div>
      </div>
      {children}
    </div>
  )
}
