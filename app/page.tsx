"use client"

import { MainLayout } from "@/components/layout/main-layout"
import { ProjectProvider } from "@/contexts/project-context"
import { SynonymsPopup } from "@/components/synonyms-popup"
import { TabulationView } from "@/components/tabulation-view"

export default function Home() {
  return (
    <ProjectProvider>
      <MainLayout>
        <SynonymsPopup />
        <TabulationView />
      </MainLayout>
    </ProjectProvider>
  )
}
