"use client"

import { TagAnalysis } from "@/components/tag-analysis"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from 'lucide-react'
import Link from "next/link"

// This would typically come from your application state or API
const sampleTags = {
  "person": [
    {
      text: "John Smith",
      start: 10,
      end: 20
    },
    {
      text: "Jane Doe",
      start: 45,
      end: 53
    }
  ],
  "location": [
    {
      text: "New York City",
      start: 100,
      end: 112
    }
  ],
  "date": [
    {
      text: "January 15, 2024",
      start: 150,
      end: 165
    }
  ]
}

const tagColors = {
  "person": "bg-yellow-200",
  "location": "bg-blue-200",
  "date": "bg-green-200"
}

export default function AnalysisPage() {
  return (
    <div className="container py-10">
      <div className="mb-8">
        <Button variant="ghost" asChild>
          <Link href="/" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Viewer
          </Link>
        </Button>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold">Tag Analysis</h1>
          <p className="text-lg text-muted-foreground">
            Analyze your document&apos;s tags in a hierarchical view. Each tag type is grouped
            together, showing all occurrences and their contexts.
          </p>
        </div>
        <TagAnalysis tags={sampleTags} colors={tagColors} />
      </div>
    </div>
  )
}

