'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  MessageSquare, Plus, Send, Loader2, PanelLeftClose, PanelLeft,
} from 'lucide-react'
import { type Conversation, type ConversationMessage, type Project } from '@/store/plan365'
import { useAppStore } from '@/store/plan365'
import { EmptyState, LoadingSpinner, Avatar } from './shared'

// ---------- Time Ago ----------

function timeAgo(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
  } catch {
    return ''
  }
}

// ---------- Conversation List Skeleton ----------

function ConversationListSkeleton() {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-lg border p-3 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  )
}

// ---------- Message Thread Skeleton ----------

function MessageThreadSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className={`flex gap-3 ${i % 2 === 1 ? 'flex-row-reverse' : ''}`}>
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <div className={`space-y-1 ${i % 2 === 1 ? 'items-end' : ''}`}>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-16 w-60 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------- New Conversation Dialog State ----------

interface NewConvState {
  open: boolean
  title: string
  projectId: string
}

// ---------- Main Component ----------

export function ConversationsView() {
  const { projects, user } = useAppStore()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [sending, setSending] = useState(false)
  const [creatingConv, setCreatingConv] = useState(false)
  const [panelOpen, setPanelOpen] = useState(true)
  const [newConv, setNewConv] = useState<NewConvState>({ open: false, title: '', projectId: '' })

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Fetch conversations
  useEffect(() => {
    async function fetchConversations() {
      setLoadingList(true)
      try {
        const res = await fetch('/api/conversations')
        if (!res.ok) throw new Error('Failed to fetch conversations')
        const data = await res.json()
        setConversations(data.conversations || [])
        // Auto-select first conversation
        if (data.conversations?.length > 0 && !activeId) {
          setActiveId(data.conversations[0].id)
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Unknown error')
      } finally {
        setLoadingList(false)
      }
    }
    fetchConversations()
  }, [])

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (!activeId) return
    async function fetchMessages() {
      setLoadingMessages(true)
      try {
        const res = await fetch(`/api/conversations/${activeId}/messages`)
        if (!res.ok) throw new Error('Failed to fetch messages')
        const data = await res.json()
        setMessages(data.messages || [])
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Unknown error')
      } finally {
        setLoadingMessages(false)
      }
    }
    fetchMessages()
    setInputValue('')
    // Focus input
    setTimeout(() => inputRef.current?.focus(), 200)
  }, [activeId])

  // Refresh conversation list after sending
  async function refreshConversations() {
    try {
      const res = await fetch('/api/conversations')
      if (res.ok) {
        const data = await res.json()
        setConversations(data.conversations || [])
      }
    } catch {
      // silent
    }
  }

  // Create new conversation
  async function handleCreateConversation() {
    if (!newConv.title.trim()) return
    setCreatingConv(true)
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newConv.title.trim(),
          projectId: newConv.projectId ? parseInt(newConv.projectId) : null,
        }),
      })
      if (!res.ok) throw new Error('Failed to create conversation')
      const data = await res.json()
      setConversations(prev => [data.conversation, ...prev])
      setActiveId(data.conversation.id)
      setNewConv({ open: false, title: '', projectId: '' })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create')
    } finally {
      setCreatingConv(false)
    }
  }

  // Send message
  async function handleSend() {
    if (!activeId || !inputValue.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/conversations/${activeId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: inputValue.trim() }),
      })
      if (!res.ok) throw new Error('Failed to send message')
      const data = await res.json()
      setMessages(prev => [...prev, data.message])
      setInputValue('')
      await refreshConversations()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  const activeConv = conversations.find(c => c.id === activeId)

  // Group conversations by project for badge
  function getProjectBadge(conv: Conversation) {
    if (!conv.project) return null
    return (
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
        <span className="inline-block h-1.5 w-1.5 rounded-full mr-1" style={{ backgroundColor: conv.project.color }} />
        {conv.project.name}
      </Badge>
    )
  }

  return (
    <div className="flex gap-0 h-[calc(100vh-120px)]">
      {/* Left Panel - Conversation List */}
      <div className={`flex flex-col border-r bg-muted/30 ${panelOpen ? 'w-80' : 'hidden'} md:block shrink-0 transition-all`}>
        {/* List Header */}
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <h3 className="text-sm font-semibold">Conversations</h3>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setPanelOpen(false)}
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-emerald-600"
              onClick={() => setNewConv(prev => ({ ...prev, open: !prev.open }))}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* New Conversation Form */}
        {newConv.open && (
          <div className="border-b p-3 space-y-2 bg-emerald-50/50 dark:bg-emerald-950/20">
            <Input
              placeholder="Conversation title..."
              value={newConv.title}
              onChange={(e) => setNewConv(prev => ({ ...prev, title: e.target.value }))}
              className="h-8 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateConversation()
              }}
            />
            <select
              value={newConv.projectId}
              onChange={(e) => setNewConv(prev => ({ ...prev, projectId: e.target.value }))}
              className="w-full h-8 rounded-md border bg-background px-2 text-sm"
            >
              <option value="">No Project</option>
              {projects.map(p => (
                <option key={p.id} value={p.id.toString()}>{p.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 h-7 text-xs" onClick={handleCreateConversation} disabled={!newConv.title.trim() || creatingConv}>
                {creatingConv ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Create
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setNewConv({ open: false, title: '', projectId: '' })}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Conversation List */}
        <ScrollArea className="flex-1">
          {loadingList ? (
            <ConversationListSkeleton />
          ) : conversations.length === 0 ? (
            <div className="p-4">
              <EmptyState message="No conversations yet. Click + to start one." icon={MessageSquare} />
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => setActiveId(conv.id)}
                  className={`w-full text-left rounded-lg px-3 py-2.5 transition-colors ${
                    activeId === conv.id
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800'
                      : 'hover:bg-muted'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <MessageSquare className={`h-4 w-4 mt-0.5 shrink-0 ${activeId === conv.id ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium truncate">{conv.title}</span>
                        {getProjectBadge(conv)}
                      </div>
                      {conv.lastMessage && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {conv.lastMessage.content}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {conv._count && (
                          <span className="text-[10px] text-muted-foreground">
                            {conv._count.messages} msg{conv._count.messages !== 1 ? 's' : ''}
                          </span>
                        )}
                        {conv.lastMessage && (
                          <span className="text-[10px] text-muted-foreground">
                            {timeAgo(conv.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Right Panel - Messages */}
      <div className="flex-1 flex flex-col min-w-0">
        {!panelOpen && (
          <div className="border-b px-3 py-2">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setPanelOpen(true)}>
              <PanelLeft className="h-4 w-4 mr-1" />
              Show List
            </Button>
          </div>
        )}

        {activeConv ? (
          <>
            {/* Thread Header */}
            <div className="border-b px-4 py-3">
              <h3 className="font-medium">{activeConv.title}</h3>
              {activeConv.project && (
                <Badge variant="outline" className="mt-1">
                  <span className="inline-block h-2 w-2 rounded-full mr-1.5" style={{ backgroundColor: activeConv.project.color }} />
                  {activeConv.project.name}
                </Badge>
              )}
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1">
              {loadingMessages ? (
                <MessageThreadSkeleton />
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <EmptyState message="No messages yet. Start the conversation!" icon={MessageSquare} />
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  {messages.map((msg, idx) => {
                    const isCurrentUser = msg.user?.id === user?.id
                    return (
                      <div key={msg.id || idx}>
                        <div className={`flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                          {/* Avatar */}
                          <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white shrink-0 ${
                            isCurrentUser ? 'bg-emerald-600' : 'bg-zinc-500 dark:bg-zinc-700'
                          }`}>
                            {isCurrentUser ? 'U' : 'AI'}
                          </span>
                          {/* Bubble */}
                          <div className={`max-w-[75%] space-y-1`}>
                            <div className={`flex items-center gap-2 text-xs text-muted-foreground ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                              <span className="font-medium">
                                {isCurrentUser ? (msg.user?.fullName || msg.user?.username || 'You') : (msg.user?.fullName || msg.user?.username || 'AI Assistant')}
                              </span>
                              <span>{timeAgo(msg.createdAt)}</span>
                            </div>
                            <div className={`rounded-lg px-3.5 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                              isCurrentUser
                                ? 'bg-emerald-600 text-white rounded-tr-sm'
                                : 'bg-zinc-100 dark:bg-zinc-800 rounded-tl-sm'
                            }`}>
                              {msg.content}
                            </div>
                          </div>
                        </div>
                        {idx < messages.length - 1 && <Separator className="mt-4" />}
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Input */}
            <div className="border-t px-4 py-3">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  placeholder="Type a message..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  disabled={sending}
                />
                <Button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || sending}
                  size="icon"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <EmptyState message="Select a conversation or create a new one" icon={MessageSquare} />
          </div>
        )}
      </div>

      {/* Mobile Conversation List Overlay */}
      {/* On mobile, the left panel is hidden by default. Panel toggle handles visibility. */}
    </div>
  )
}
