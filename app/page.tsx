"use client"
import { useState } from "react"

import { MainLayout } from "@/components/layout/main-layout"
import { ProjectProvider } from "@/contexts/project-context"
import { SynonymsPopup } from "@/components/synonyms-popup"
import { TabulationView } from "@/components/tabulation-view"
import { SplashModal } from "@/components/splash-modal"
import { WalkthroughModal } from "@/components/walkthrough-modal"

export default function Home() {
  // Control splash and walkthrough visibility
  const [showSplash, setShowSplash] = useState<boolean>(true)
  const [showWalkthrough, setShowWalkthrough] = useState<boolean>(false)
  // When splash closes, unmount it and trigger walkthrough
  const handleSplashClose = () => {
    setShowSplash(false)
    setShowWalkthrough(true)
  }
  return (
    <ProjectProvider>
      {/* Only mount splash while needed */}
      {showSplash && <SplashModal onClose={handleSplashClose} />}
      {/* After splash closed, show walkthrough if enabled */}
      {showWalkthrough && <WalkthroughModal />}
      <MainLayout>
        <SynonymsPopup />
        <TabulationView />
      </MainLayout>
    </ProjectProvider>
  )
}
