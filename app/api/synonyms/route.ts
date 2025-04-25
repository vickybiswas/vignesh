"use client"


// For demo purposes, this API route will always return a successful response with fallback synonyms
export async function POST(req: Request) {
  try {
    const { word } = await req.json()

    if (!word || typeof word !== "string") {
      return Response.json({ error: "A valid word is required" }, { status: 400 })
    }

    // Predefined synonyms for common words to ensure the demo works
    const synonymMap: Record<string, string[]> = {
      text: ["document", "content", "writing", "passage", "material"],
      search: ["find", "locate", "discover", "query", "lookup"],
      tag: ["label", "mark", "category", "classify", "annotate"],
      sample: ["example", "specimen", "instance", "case", "illustration"],
      part: ["section", "portion", "segment", "piece", "component"],
      click: ["select", "choose", "tap", "press", "activate"],
      right: ["correct", "proper", "appropriate", "suitable", "fitting"],
      add: ["include", "insert", "append", "attach", "incorporate"],
      file: ["document", "record", "data", "information", "archive"],
      view: ["see", "observe", "examine", "inspect", "look"],
    }

    // Get synonyms for the word or use generic fallbacks
    const wordLower = word.toLowerCase()
    const synonyms = synonymMap[wordLower] || ["alternative1", "alternative2", "option1", "option2", "suggestion"]

    return Response.json({ synonyms })
  } catch (error) {
    console.error("Error generating synonyms:", error)
    // Even in case of error, return some fallback synonyms
    return Response.json({
      synonyms: ["fallback1", "fallback2", "fallback3", "fallback4", "fallback5"],
    })
  }
}
