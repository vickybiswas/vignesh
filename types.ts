export interface Marking {
  id: string
  type: "search" | "tag"
  text: string
  color: string
}

export interface Position {
  text: string
  start: number
  stop: number
}

export interface File {
  name: string
  dirty: boolean
  positions: Record<string, Position[]>
  content: string // We'll keep this for easier text manipulation
}

export interface Tabulation {
  rows: string[]
  columns: string[]
  extend_type: 0 | 1 | 2 // 0: None, 1: Sentence, 2: Paragraph
}

export interface AppState {
  markings: Marking[]
  files: Record<string, File>
  tabulations: Tabulation[]
  activeFile: string
}
