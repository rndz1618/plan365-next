'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Sparkles, Send, Loader2, Trash2, Plus, CheckCircle2,
  Bot, User as UserIcon,
} from 'lucide-react'
import { type Project, type Conversation, type ConversationMessage, TASK_TYPES, PRIORITIES, STATUSES } from '@/store/plan365'
import { useAppStore } from '@/store/plan365'
import { EmptyState, LoadingSpinner, Avatar } from './shared'

// ---------- Suggested Task Interface ----------

interface SuggestedTask {
  id: string
  title: string
  type: string
  effort: string
  priority: string
  status: string
}

// ---------- Parse AI response into tasks ----------

function parseTasksFromResponse(content: string): SuggestedTask[] {
  const tasks: SuggestedTask[] = []
  // Try to match numbered tasks like "1. Task name" or "1) Task name"
  const lines = content.split('\n')
  let currentTitle = ''
  let currentType = 'Others'
  let currentEffort = '8'
  let currentPriority = 'Medium'

  for (const line of lines) {
    const trimmed = line.trim()

    // Match numbered items: "1. ", "1) ", "- "
    const numberedMatch = trimmed.match(/^(\d+)[\.\)]\s+(.+)/)
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)/)

    if (numberedMatch || bulletMatch) {
      // Save previous task if exists
      if (currentTitle) {
        tasks.push({
          id: crypto.randomUUID(),
          title: currentTitle,
          type: currentType,
          effort: currentEffort,
          priority: currentPriority,
          status: 'Todo',
        })
      }
      const title = (numberedMatch ? numberedMatch[2] : bulletMatch![1]).replace(/\*\*/g, '').trim()
      currentTitle = title
      // Reset defaults
      currentType = 'Others'
      currentEffort = '8'
      currentPriority = 'Medium'

      // Try to extract inline metadata like "(type: CAD, effort: 16h, priority: High)"
      const metaMatch = title.match(/\((?:type:\s*([^,]+))?(?:,\s*)?(?:effort:\s*(\d+)h?)?(?:,\s*)?(?:priority:\s*([^)]+))?\)/i)
      if (metaMatch) {
        if (metaMatch[1]) currentType = metaMatch[1].trim()
        if (metaMatch[2]) currentEffort = metaMatch[2].trim()
        if (metaMatch[3]) currentPriority = metaMatch[3].trim()
        // Clean title
        currentTitle = title.replace(/\([^)]+\)/, '').trim()
      }
    } else if (currentTitle) {
      // Sub-line metadata
      const typeMatch = trimmed.match(/^type:\s*(.+)/i)
      const effortMatch = trimmed.match(/^effort:\s*(\d+)/i)
      const prioMatch = trimmed.match(/^priority:\s*(.+)/i)
      if (typeMatch) currentType = typeMatch[1].trim()
      if (effortMatch) currentEffort = effortMatch[1].trim()
      if (prioMatch) currentPriority = prioMatch[1].trim()
    }
  }

  // Push last task
  if (currentTitle) {
    tasks.push({
      id: crypto.randomUUID(),
      title: currentTitle,
      type: currentType,
      effort: currentEffort,
      priority: currentPriority,
      status: 'Todo',
    })
  }

  return tasks
}

// ---------- Main Component ----------

export function AIPlanningView() {
  const { projects } = useAppStore()
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [description, setDescription] = useState('')
  const [generating, setGenerating] = useState(false)
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [suggestedTasks, setSuggestedTasks] = useState<SuggestedTask[]>([])
  const [sending, setSending] = useState(false)
  const [creating, setCreating] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const selectedProject = projects.find(p => p.id.toString() === selectedProjectId)

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Generate plan
  async function handleGenerate() {
    if (!selectedProjectId || !description.trim() || generating) return

    setGenerating(true)
    try {
      // Step 1: Create conversation
      const convRes = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `AI Plan: ${selectedProject?.name || 'Project'}`,
          projectId: selectedProjectId,
        }),
      })
      if (!convRes.ok) throw new Error('Failed to create conversation')
      const convData = await convRes.json()
      const newConv = convData.conversation
      setConversation(newConv)

      // Step 2: Post user message
      const msgRes = await fetch(`/api/conversations/${newConv.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: description.trim() }),
      })
      if (!msgRes.ok) throw new Error('Failed to send message')
      const msgData = await msgRes.json()

      // Update messages with user message
      setMessages([msgData.message])

      // Step 3: Poll for AI response (the conversation handler should have generated one)
      let attempts = 0
      const maxAttempts = 30
      const pollInterval = setInterval(async () => {
        attempts++
        try {
          const pollRes = await fetch(`/api/conversations/${newConv.id}/messages`)
          if (pollRes.ok) {
            const pollData = await pollRes.json()
            if (pollData.messages && pollData.messages.length > 1) {
              clearInterval(pollInterval)
              setMessages(pollData.messages)
              // Parse tasks from AI response
              const aiContent = pollData.messages[pollData.messages.length - 1].content
              const parsed = parseTasksFromResponse(aiContent)
              setSuggestedTasks(parsed)
              setGenerating(false)
            }
          }
        } catch {
          // continue polling
        }
        if (attempts >= maxAttempts) {
          clearInterval(pollInterval)
          setGenerating(false)
        }
      }, 2000)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to generate plan'
      console.error(msg)
      setGenerating(false)
    }
  }

  // Send follow-up message
  async function handleSendMessage() {
    if (!conversation || !description.trim() || sending) return

    setSending(true)
    try {
      const res = await fetch(`/api/conversations/${conversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: description.trim() }),
      })
      if (!res.ok) throw new Error('Failed to send message')
      const data = await res.json()
      setMessages(prev => [...prev, data.message])
      setDescription('')

      // Poll for AI response
      let attempts = 0
      const maxAttempts = 30
      const pollInterval = setInterval(async () => {
        attempts++
        try {
          const pollRes = await fetch(`/api/conversations/${conversation.id}/messages`)
          if (pollRes.ok) {
            const pollData = await pollRes.json()
            if (pollData.messages && pollData.messages.length > messages.length + 1) {
              clearInterval(pollInterval)
              setMessages(pollData.messages)
              // Re-parse the latest AI response
              const aiMsgs = pollData.messages.filter((m: ConversationMessage) => m.user?.username !== useAppStore.getState().user?.username)
              if (aiMsgs.length > 0) {
                const latestAI = aiMsgs[aiMsgs.length - 1].content
                const parsed = parseTasksFromResponse(latestAI)
                if (parsed.length > 0) setSuggestedTasks(parsed)
              }
              setSending(false)
            }
          }
        } catch {
          // continue
        }
        if (attempts >= maxAttempts) {
          clearInterval(pollInterval)
          setSending(false)
        }
      }, 2000)
    } catch {
      setSending(false)
    }
  }

  // Update suggested task field
  function updateTask(id: string, field: keyof SuggestedTask, value: string) {
    setSuggestedTasks(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t))
  }

  // Remove suggested task
  function removeTask(id: string) {
    setSuggestedTasks(prev => prev.filter(t => t.id !== id))
  }

  // Bulk create tasks
  async function handleCreateAll() {
    if (!selectedProjectId || suggestedTasks.length === 0) return

    setCreating(true)
    try {
      const results = await Promise.allSettled(
        suggestedTasks.map(task =>
          fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: selectedProjectId,
              title: task.title,
              type: task.type,
              priority: task.priority,
              status: task.status,
              effort: parseInt(task.effort) || null,
            }),
          })
        )
      )

      const succeeded = results.filter(r => r.status === 'fulfilled').length
      const failed = results.length - succeeded

      if (succeeded > 0) {
        setSuggestedTasks([])
      }

      // Show success/failure feedback (simplified)
      if (failed > 0) {
        console.warn(`${failed} tasks failed to create`)
      }
    } catch {
      // handle error
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Project Selection + Input */}
      {!conversation ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-500" />
              AI Task Planner
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Select Project</label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a project..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      <span className="flex items-center gap-2">
                        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                        {p.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Describe Your Project Scope</label>
              <Textarea
                placeholder="Describe what you want to plan. For example: 'Design and manufacture a custom aluminum housing for an electronics enclosure. Include CAD modeling, toolpath generation, and CNC machining steps.'"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className="resize-none"
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!selectedProjectId || !description.trim() || generating}
              className="w-full"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {generating ? 'Generating Plan...' : 'Generate Plan'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Conversation Header */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-500" />
                {conversation.title}
              </CardTitle>
              {selectedProject && (
                <Badge variant="outline" className="w-fit">
                  <span className="inline-block h-2 w-2 rounded-full mr-1.5" style={{ backgroundColor: selectedProject.color }} />
                  {selectedProject.name}
                </Badge>
              )}
            </CardHeader>
          </Card>

          {/* Chat + Suggested Tasks layout */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Chat Panel */}
            <Card className="flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Chat</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 min-h-0">
                <ScrollArea className="flex-1 max-h-[400px] mb-4">
                  <div className="space-y-4 pr-3">
                    {messages.map((msg, idx) => {
                      const isCurrentUser = msg.user?.id === useAppStore.getState().user?.id
                      return (
                        <div key={msg.id || idx}>
                          <div className={`flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white shrink-0 bg-emerald-600">
                              {isCurrentUser ? 'U' : 'AI'}
                            </span>
                            <div className={`max-w-[80%] space-y-1`}>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className={isCurrentUser ? 'text-right' : ''}>
                                  {isCurrentUser ? (msg.user?.fullName || 'You') : 'AI Assistant'}
                                </span>
                                <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <div className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                                isCurrentUser
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-muted'
                              }`}>
                                {msg.content}
                              </div>
                            </div>
                          </div>
                          {idx < messages.length - 1 && <Separator className="mt-4" />}
                        </div>
                      )
                    })}
                    {generating && (
                      <div className="flex gap-3">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white shrink-0">AI</span>
                        <div className="bg-muted rounded-lg px-3 py-2">
                          <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Follow-up Input */}
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Refine the plan or ask follow-up questions..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="resize-none flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!description.trim() || sending}
                    size="icon"
                    className="shrink-0 self-end"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Suggested Tasks Panel */}
            <Card className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">
                    Suggested Tasks ({suggestedTasks.length})
                  </CardTitle>
                  {suggestedTasks.length > 0 && (
                    <Button
                      size="sm"
                      onClick={handleCreateAll}
                      disabled={creating}
                    >
                      {creating ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                      )}
                      Create All Tasks
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ScrollArea className="max-h-[420px]">
                  {suggestedTasks.length === 0 ? (
                    <EmptyState message="No tasks suggested yet. Generate a plan to see suggestions." icon={Sparkles} />
                  ) : (
                    <div className="space-y-3 pr-3">
                      {suggestedTasks.map((task, idx) => (
                        <div key={task.id} className="rounded-lg border p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-muted-foreground w-5">{idx + 1}.</span>
                            <Input
                              value={task.title}
                              onChange={(e) => updateTask(task.id, 'title', e.target.value)}
                              className="flex-1 h-8 text-sm"
                              placeholder="Task title"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-red-500"
                              onClick={() => removeTask(task.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-2 ml-7">
                            <Select value={task.type} onValueChange={(v) => updateTask(task.id, 'type', v)}>
                              <SelectTrigger className="h-7 w-[100px] text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TASK_TYPES.map(t => (
                                  <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              type="number"
                              value={task.effort}
                              onChange={(e) => updateTask(task.id, 'effort', e.target.value)}
                              className="h-7 w-[60px] text-xs"
                              placeholder="Effort"
                            />
                            <span className="text-xs text-muted-foreground">h</span>
                            <Select value={task.priority} onValueChange={(v) => updateTask(task.id, 'priority', v)}>
                              <SelectTrigger className="h-7 w-[100px] text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PRIORITIES.map(p => (
                                  <SelectItem key={p} value={p}>{p}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
