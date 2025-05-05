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
import { User, Moon, Sun, Key, X, Info } from "lucide-react"
import { useTheme } from "next-themes"
import { setUserId, event as gaEvent } from "@/lib/gtag"
import { SplashModal } from "@/components/splash-modal"

/**
 * UserDropdown renders a Google Sign-In button when not authenticated,
 * and shows a user menu when signed in entirely on the client.
 */
declare global {
  interface Window { google: any }
}
export function UserDropdown() {
  const [user, setUser] = useState<{ id: string; name: string; email: string; picture?: string } | null>(null)
  const [isSplashModalOpen, setIsSplashModalOpen] = useState(false)
  const [apiKey, setApiKey] = useState("")
  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false)
  const { setTheme, theme } = useTheme()

  // Load saved API key
  useEffect(() => {
    const stored = localStorage.getItem("openai_api_key")
    if (stored) setApiKey(stored)
  }, [])
  
  // Rehydrate user from localStorage
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("user")
      if (stored) {
        const parsedUser = JSON.parse(stored)
        setUser(parsedUser)
        setUserId(parsedUser.id)
      }
    } catch (e) {
      console.warn("Failed to parse user from localStorage", e)
    }
  }, [])

  // Google Identity Services init (only if not already signed in)
  useEffect(() => {
    // Skip GSI if a user is already stored
    if (window.localStorage.getItem("user")) {
        return
    }
    const clientId = "1079401176023-eaddv9q2jjkdtt37ou4ekg49lingvrb1.apps.googleusercontent.com"
    function handleCredentialResponse(response: any) {
      try {
        const payload = JSON.parse(atob(response.credential.split('.')[1]))
        const newUser = {
          id: payload.sub,
          name: payload.name,
          email: payload.email,
          picture: payload.picture,
        }
        setUser(newUser)
        window.localStorage.setItem("user", JSON.stringify(newUser))
        setUserId(newUser.id)
        gaEvent({ action: "login", category: "Auth", label: newUser.id })
      } catch (e) {
        console.error(e)
      }
    }
    const initializeGSI = () => {
      window.google.accounts.id.initialize({ client_id: clientId, callback: handleCredentialResponse })
      const container = document.getElementById('googleSignInDiv')
      if (container) {
        window.google.accounts.id.renderButton(container, { theme: 'outline', size: 'large' })
      }
      window.google.accounts.id.prompt()
    }
    if (window.google?.accounts?.id) {
      initializeGSI()
    } else {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = initializeGSI
      document.body.appendChild(script)
      return () => { document.body.removeChild(script) }
    }
  }, [])

  const handleSignOut = () => {
    // Disable Google auto sign-in if available
    window.google?.accounts?.id.disableAutoSelect?.()
    const userId = user?.id || ""
    // Clear user and analytics
    window.localStorage.removeItem("user")
    setUser(null)
    setUserId(null)
    gaEvent({ action: "logout", category: "Auth", label: userId })
    // Re-render Google Sign-In button
    const container = document.getElementById('googleSignInDiv')
    if (window.google?.accounts?.id && container) {
      window.google.accounts.id.renderButton(container, { theme: 'outline', size: 'large' })
      window.google.accounts.id.prompt()
    }
  }

  const handleSaveApiKey = () => {
    localStorage.setItem("openai_api_key", apiKey)
    setIsApiKeyDialogOpen(false)
  }
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  // Always render Google Sign-In container for authentication and allow dropdown access
  const googleSignInDiv = <div id="googleSignInDiv" className="inline-block" />

  return (
    <>
      {!user?.picture ? googleSignInDiv: ''}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="w-8 h-8 rounded-full p-0 overflow-hidden">
            {user?.picture ? (
              <img src={user.picture} alt={user.name} className="h-full w-full rounded-full object-cover" />
            ) : (
              <User className="h-6 w-6" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{user?.name ?? "Guest"}</DropdownMenuLabel>
          <DropdownMenuItem onClick={toggleTheme}>
            {theme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />} Toggle Theme
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsApiKeyDialogOpen(true)}>
            <Key className="mr-2 h-4 w-4" /> Set OpenAI API Key
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsSplashModalOpen(true)}>
            <Info className="mr-2 h-4 w-4" /> About Vignesh QDA Tool
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut}>
            <X className="mr-2 h-4 w-4" /> Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={isApiKeyDialogOpen} onOpenChange={setIsApiKeyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set OpenAI API Key</DialogTitle>
            <DialogDescription>Enter your OpenAI API key to enable AI features (It will be saved in your localstorage and never hit our servers).</DialogDescription>
          </DialogHeader>
          <Input type="password" placeholder="API key" value={apiKey} onChange={e => setApiKey(e.target.value)} />
          <Button onClick={handleSaveApiKey}>Save</Button>
        </DialogContent>
      </Dialog>
      {isSplashModalOpen && (
        <SplashModal onClose={() => setIsSplashModalOpen(false)} forceOpen />
      )}
    </>
  )
}
