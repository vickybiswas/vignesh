"use client"

import type { ReactNode } from "react"
import { useContext } from "react"
import { Header } from "./header"
import { FilesSidebar } from "./files-sidebar"
import { ContentArea } from "./content-area"
import { AnalysisSidebar } from "./analysis-sidebar"
import { ProjectContext } from "@/contexts/project-context"

interface MainLayoutProps {
  children?: ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const { currentProject } = useContext(ProjectContext)

  // Make sure we have a valid project before rendering the layout
  if (!currentProject) {
    return <div>Loading...</div>
  }

  return (
    <div className="flex flex-col h-screen max-w-full">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <FilesSidebar />
        <ContentArea />
        <AnalysisSidebar />
      </div>
      {children}
    </div>
  )
}
