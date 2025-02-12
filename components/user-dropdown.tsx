"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { User, Moon, Sun, Key } from "lucide-react"
import { useTheme } from "next-themes"

export function UserDropdown() {
  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false)
  const [apiKey, setApiKey] = useState("")
  const { setTheme, theme } = useTheme()

  useEffect(() => {
    const storedApiKey = localStorage.getItem("openai_api_key")
    if (storedApiKey) {
      setApiKey(storedApiKey)
    }
  }, [])

  const handleSaveApiKey = () => {
    localStorage.setItem("openai_api_key", apiKey)
    setIsApiKeyDialogOpen(false)
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="w-8 h-8 rounded-full">
            <User className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Vicky Biswas</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={toggleTheme}>
            {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
            Toggle theme
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsApiKeyDialogOpen(true)}>
            <Key className="mr-2 h-4 w-4" />
            Set OpenAI API Key
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isApiKeyDialogOpen} onOpenChange={setIsApiKeyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set OpenAI API Key</DialogTitle>
            <DialogDescription>Enter your OpenAI API key to enable AI-powered features.</DialogDescription>
          </DialogHeader>
          <Input
            type="password"
            placeholder="Enter your API key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <Button onClick={handleSaveApiKey}>Save</Button>
        </DialogContent>
      </Dialog>
    </>
  )
}

