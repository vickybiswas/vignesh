"use client"

import { MainLayout } from "@/components/layout/main-layout"
import { ProjectProvider } from "@/contexts/project-context"
import { SynonymsPopup } from "@/components/synonyms-popup"
import { TabulationView } from "@/components/tabulation-view"
import { SplashModal } from "@/components/splash-modal"

export default function Home() {
  return (
    <ProjectProvider>
        <SplashModal />
      <MainLayout>
        <SynonymsPopup />
        <TabulationView />
      </MainLayout>
    </ProjectProvider>
  )
}
