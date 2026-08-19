'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore, type User, type TaskTemplate, TASK_TYPES, PRIORITIES, STATUSES } from '@/store/plan365'
import { Avatar, UserAvatar, LoadingSpinner, EmptyState } from './shared'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Settings, Users, LayoutTemplate, Bot, Database, Plus, Pencil, Trash2,
  Save, Download, Upload, Eye, EyeOff, ChevronDown, ChevronUp, Sparkles,
  AlertTriangle, Loader2, CheckCircle2, X, Shield,
} from 'lucide-react'
import { toast } from 'sonner'

interface AppSettings {
  appName: string
  allowRegistration: boolean
  jwtExpireHours: number
  dateFormat: string
  timezone: string
  accentColor: string
  taskTypes: string[]
  priorities: string[]
  statuses: string[]
  aiProvider: string
  aiModel: string
  aiApiKey: string
  aiTemperature: number
  aiMaxTokens: number
}

const DEFAULT_SETTINGS: AppSettings = {
  appName: 'Plan365',
  allowRegistration: true,
  jwtExpireHours: 168,
  dateFormat: 'yyyy-MM-dd',
  timezone: 'UTC',
  accentColor: 'emerald',
  taskTypes: [...TASK_TYPES],
  priorities: [...PRIORITIES],
  statuses: [...STATUSES],
  aiProvider: 'OpenAI',
  aiModel: 'gpt-4',
  aiApiKey: '',
  aiTemperature: 0.7,
  aiMaxTokens: 4096,
}

const ACCENT_COLORS = [
  { value: 'emerald', label: 'Emerald', class: 'bg-emerald-500' },
  { value: 'teal', label: 'Teal', class: 'bg-teal-500' },
  { value: 'amber', label: 'Amber', class: 'bg-amber-500' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
  { value: 'rose', label: 'Rose', class: 'bg-rose-500' },
  { value: 'violet', label: 'Violet', class: 'bg-violet-500' },
  { value: 'cyan', label: 'Cyan', class: 'bg-cyan-500' },
  { value: 'lime', label: 'Lime', class: 'bg-lime-500' },
]

const AI_PROVIDERS = ['OpenAI', 'Anthropic', 'Google', 'Local']
const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Jakarta', 'Australia/Sydney',
]
const DATE_FORMATS = ['yyyy-MM-dd', 'dd/MM/yyyy', 'MM/dd/yyyy', 'dd MMM yyyy', 'MMM dd, yyyy']

interface TemplateTask {
  title: string
  type: string
  effort: number
  priority: string
}

function isAppSettingsKey(key: string): key is keyof AppSettings {
  return key in DEFAULT_SETTINGS
}

export default function SettingsView() {
  const user = useAppStore((s) => s.user)
  const isAdmin = user?.role === 'admin'
  const [activeTab, setActiveTab] = useState('parameters')
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [userDialog, setUserDialog] = useState<{ open: boolean; mode: 'add' | 'edit'; user?: User }>({ open: false, mode: 'add' })
  const [deleteUserDialog, setDeleteUserDialog] = useState<User | null>(null)
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [templateDialog, setTemplateDialog] = useState<{ open: boolean; mode: 'add' | 'edit'; template?: TaskTemplate }>({ open: false, mode: 'add' })
  const [deleteTemplateDialog, setDeleteTemplateDialog] = useState<TaskTemplate | null>(null)
  const [expandedTemplate, setExpandedTemplate] = useState<number | null>(null)
  const [aiTesting, setAiTesting] = useState(false)
  const [aiTestResult, setAiTestResult] = useState<'success' | 'error' | null>(null)
  const [seedDialog, setSeedDialog] = useState(false)
  const [seeding, setSeeding] = useState(false)

  const fetchSettings = useCallback(async () => {
    try {
      setSettingsLoading(true)
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = (await res.json()) as Record<string, unknown>
        const merged: AppSettings = { ...DEFAULT_SETTINGS }
        for (const [key, val] of Object.entries(data)) {
          if (!isAppSettingsKey(key)) continue
          const def = DEFAULT_SETTINGS[key]
          if (Array.isArray(def) && !Array.isArray(val)) {
            try { merged[key] = JSON.parse(String(val)) as never } catch { /* keep */ }
          } else if (typeof def === 'boolean' && typeof val === 'string') {
            merged[key] = (val === 'true') as never
          } else if (typeof def === 'number' && typeof val === 'string') {
            merged[key] = Number(val) as never
          } else if (val !== undefined && val !== null) {
            merged[key] = val as never
          }
        }
        setSettings(merged)
      }
    } catch { /* keep defaults */ } finally {
      setSettingsLoading(false)
    }
  }, [])

  const saveSettings = async () => {
    try {
      setSettingsSaving(true)
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (res.ok) toast.success('Settings saved successfully')
      else toast.error('Failed to save settings')
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSettingsSaving(false)
    }
  }

  const fetchUsers = useCallback(async () => {
    try {
      setUsersLoading(true)
      // includeInactive so admin can see/re-enable deactivated accounts
      const res = await fetch('/api/users?includeInactive=1')
      if (res.ok) {
        const data = await res.json()
        setUsers(Array.isArray(data) ? data : data.users ?? [])
      }
    } catch { /* ignore */ } finally {
      setUsersLoading(false)
    }
  }, [])

  const fetchTemplates = useCallback(async () => {
    try {
      setTemplatesLoading(true)
      const res = await fetch('/api/templates')
      if (res.ok) setTemplates(await res.json())
    } catch { /* ignore */ } finally {
      setTemplatesLoading(false)
    }
  }, [])

  useEffect(() => { fetchSettings() }, [fetchSettings])
  useEffect(() => {
    if (activeTab === 'users') fetchUsers()
    if (activeTab === 'templates') fetchTemplates()
  }, [activeTab, fetchUsers, fetchTemplates])

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          {isAdmin && <TabsTrigger value="parameters" className="gap-1.5"><Settings className="size-4" /> Parameters</TabsTrigger>}
          {isAdmin && <TabsTrigger value="users" className="gap-1.5"><Users className="size-4" /> Users</TabsTrigger>}
          <TabsTrigger value="templates" className="gap-1.5"><LayoutTemplate className="size-4" /> Templates</TabsTrigger>
          {isAdmin && <TabsTrigger value="ai" className="gap-1.5"><Bot className="size-4" /> AI Provider</TabsTrigger>}
          {isAdmin && <TabsTrigger value="data" className="gap-1.5"><Database className="size-4" /> Data</TabsTrigger>}
        </TabsList>

        {isAdmin && (
          <TabsContent value="parameters">
            {settingsLoading ? <LoadingSpinner className="py-16" /> : (
              <div className="space-y-6 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">General Settings</CardTitle>
                    <CardDescription>Configure application-wide parameters</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="appName">App Name</Label>
                        <Input id="appName" value={settings.appName} onChange={(e) => updateSetting('appName', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dateFormat">Date Format</Label>
                        <Select value={settings.dateFormat} onValueChange={(v) => updateSetting('dateFormat', v)}>
                          <SelectTrigger id="dateFormat"><SelectValue /></SelectTrigger>
                          <SelectContent>{DATE_FORMATS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="timezone">Timezone</Label>
                        <Select value={settings.timezone} onValueChange={(v) => updateSetting('timezone', v)}>
                          <SelectTrigger id="timezone"><SelectValue /></SelectTrigger>
                          <SelectContent>{TIMEZONES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="jwtExpire">JWT Expire Hours</Label>
                        <Input id="jwtExpire" type="number" min={1} value={settings.jwtExpireHours} onChange={(e) => updateSetting('jwtExpireHours', Number(e.target.value))} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <Label htmlFor="allowReg">Allow Registration</Label>
                        <p className="text-sm text-muted-foreground">Let new users create accounts</p>
                      </div>
                      <Switch id="allowReg" checked={settings.allowRegistration} onCheckedChange={(v) => updateSetting('allowRegistration', v)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Accent Color</Label>
                      <div className="flex flex-wrap gap-2">
                        {ACCENT_COLORS.map((c) => (
                          <button key={c.value} type="button" onClick={() => updateSetting('accentColor', c.value)}
                            className={`w-8 h-8 rounded-full ${c.class} transition-all ${
                              settings.accentColor === c.value ? 'ring-2 ring-offset-2 ring-offset-background ring-emerald-500 scale-110' : 'opacity-60 hover:opacity-100'
                            }`} title={c.label} />
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {(['taskTypes', 'priorities', 'statuses'] as const).map((field) => (
                  <Card key={field}>
                    <CardHeader>
                      <CardTitle className="text-lg">{field === 'taskTypes' ? 'Task Types' : field === 'priorities' ? 'Priorities' : 'Statuses'}</CardTitle>
                      <CardDescription>Manage available options</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {settings[field].map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Input value={item} className="max-w-xs" onChange={(e) => {
                            const updated = [...settings[field]]
                            updated[i] = e.target.value
                            updateSetting(field, updated)
                          }} />
                          <Button variant="ghost" size="icon" onClick={() => updateSetting(field, settings[field].filter((_, idx) => idx !== i))}>
                            <X className="size-4 text-muted-foreground" />
                          </Button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={() => updateSetting(field, [...settings[field], ''])}>
                        <Plus className="size-4 mr-1" /> Add
                      </Button>
                    </CardContent>
                  </Card>
                ))}

                <div className="flex justify-end">
                  <Button onClick={saveSettings} disabled={settingsSaving}>
                    {settingsSaving && <Loader2 className="size-4 mr-2 animate-spin" />}
                    <Save className="size-4 mr-2" /> Save Settings
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="users">
            <div className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">User Management</h3>
                <Button onClick={() => setUserDialog({ open: true, mode: 'add' })}>
                  <Plus className="size-4 mr-2" /> Add User
                </Button>
              </div>
              {usersLoading ? <LoadingSpinner className="py-16" /> : users.length === 0 ? (
                <EmptyState message="No users found" icon={Users} />
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="pl-4">User</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead className="text-center">Capacity</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead className="pr-4 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((u) => (
                          <TableRow key={u.id} className={!u.isActive ? 'opacity-60' : ''}>
                            <TableCell className="pl-4">
                              <div className="flex items-center gap-3">
                                <Avatar name={u.fullName || u.username} size="sm" />
                                <div>
                                  <p className="font-medium text-sm">{u.fullName || u.username}</p>
                                  <p className="text-xs text-muted-foreground">@{u.username}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                            <TableCell>
                              <Badge variant={u.role === 'admin' ? 'default' : 'outline'} className={u.role === 'admin' ? 'bg-emerald-600 text-white border-0' : ''}>
                                <Shield className="size-3 mr-1" />{u.role}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center text-sm">{u.weeklyCapacity}h/wk</TableCell>
                            <TableCell className="text-center">
                              <Badge variant={u.isActive ? 'outline' : 'secondary'}>{u.isActive ? 'Active' : 'Inactive'}</Badge>
                            </TableCell>
                            <TableCell className="pr-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" onClick={() => setUserDialog({ open: true, mode: 'edit', user: u })}>
                                  <Pencil className="size-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => setDeleteUserDialog(u)}>
                                  <Trash2 className="size-4 text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>

            <UserFormDialog
              dialog={userDialog}
              onClose={() => setUserDialog({ open: false, mode: 'add' })}
              onSaved={() => { fetchUsers(); setUserDialog({ open: false, mode: 'add' }) }}
            />

            <AlertDialog open={!!deleteUserDialog} onOpenChange={(o) => !o && setDeleteUserDialog(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete User</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete <strong>{deleteUserDialog?.fullName || deleteUserDialog?.username}</strong>? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={async () => {
                    if (!deleteUserDialog) return
                    try {
                      const res = await fetch(`/api/users/${deleteUserDialog.id}`, { method: 'DELETE' })
                      if (res.ok) { toast.success('User deleted'); fetchUsers() }
                      else toast.error('Failed to delete user')
                    } catch { toast.error('Failed to delete user') }
                    setDeleteUserDialog(null)
                  }}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>
        )}

        <TabsContent value="templates">
          <div className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Task Templates</h3>
              {isAdmin && (
                <Button onClick={() => setTemplateDialog({ open: true, mode: 'add' })}>
                  <Plus className="size-4 mr-2" /> Add Template
                </Button>
              )}
            </div>
            {templatesLoading ? <LoadingSpinner className="py-16" /> : templates.length === 0 ? (
              <EmptyState message="No templates available" icon={LayoutTemplate} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((t) => {
                  const tasks: TemplateTask[] = (() => { try { return JSON.parse(t.tasksJson || '[]') } catch { return [] } })()
                  const isExpanded = expandedTemplate === t.id
                  return (
                    <Card key={t.id} className="relative">
                      {t.isDefault && <div className="absolute top-3 right-3"><Badge className="bg-emerald-600 text-white border-0">Default</Badge></div>}
                      <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpandedTemplate(isExpanded ? null : t.id)}>
                        <CardTitle className="text-base">{t.name}</CardTitle>
                        <CardDescription className="line-clamp-2">{t.description || 'No description'}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{t.category}</Badge>
                          <Badge variant="outline">{t.type}</Badge>
                          <span className="text-xs text-muted-foreground ml-auto">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setExpandedTemplate(isExpanded ? null : t.id)}>
                            {isExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                          </Button>
                        </div>
                        {isAdmin && (
                          <div className="flex items-center gap-1 pt-2 border-t">
                            <Button variant="ghost" size="sm" onClick={() => setTemplateDialog({ open: true, mode: 'edit', template: t })}>
                              <Pencil className="size-3 mr-1" /> Edit
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setDeleteTemplateDialog(t)}>
                              <Trash2 className="size-3 mr-1 text-red-500" /> Delete
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
          <TemplateFormDialog dialog={templateDialog} onClose={() => setTemplateDialog({ open: false, mode: 'add' })} onSaved={() => { fetchTemplates(); setTemplateDialog({ open: false, mode: 'add' }) }} />
          <AlertDialog open={!!deleteTemplateDialog} onOpenChange={(o) => !o && setDeleteTemplateDialog(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Template</AlertDialogTitle>
                <AlertDialogDescription>Delete <strong>{deleteTemplateDialog?.name}</strong>?</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={async () => {
                  if (!deleteTemplateDialog) return
                  try {
                    const res = await fetch(`/api/templates/${deleteTemplateDialog.id}`, { method: 'DELETE' })
                    if (res.ok) { toast.success('Template deleted'); fetchTemplates() }
                    else toast.error('Failed to delete template')
                  } catch { toast.error('Failed to delete template') }
                  setDeleteTemplateDialog(null)
                }}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="ai">
            {settingsLoading ? <LoadingSpinner className="py-16" /> : (
              <div className="space-y-6 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">AI Configuration</CardTitle>
                    <CardDescription>Configure the AI provider for plan generation</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>AI Provider</Label>
                        <Select value={settings.aiProvider} onValueChange={(v) => updateSetting('aiProvider', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{AI_PROVIDERS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="aiModel">Model Name</Label>
                        <Input id="aiModel" value={settings.aiModel} onChange={(e) => updateSetting('aiModel', e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="aiApiKey">API Key</Label>
                      <ApiKeyInput value={settings.aiApiKey} onChange={(v) => updateSetting('aiApiKey', v)} />
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Temperature</Label>
                        <span className="text-sm text-muted-foreground font-mono">{settings.aiTemperature.toFixed(1)}</span>
                      </div>
                      <Slider value={[settings.aiTemperature]} onValueChange={([v]) => updateSetting('aiTemperature', v)} min={0} max={2} step={0.1} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="aiMaxTokens">Max Tokens</Label>
                      <Input id="aiMaxTokens" type="number" min={256} value={settings.aiMaxTokens} onChange={(e) => updateSetting('aiMaxTokens', Number(e.target.value))} />
                    </div>
                  </CardContent>
                </Card>
                <div className="flex justify-end">
                  <Button onClick={saveSettings} disabled={settingsSaving}>
                    {settingsSaving && <Loader2 className="size-4 mr-2 animate-spin" />}
                    <Save className="size-4 mr-2" /> Save AI Settings
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="data">
            <div className="space-y-6 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Download className="size-5" /> CSV Export</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="outline" asChild><a href="/api/export?type=tasks" download><Download className="size-4 mr-2" /> Tasks CSV</a></Button>
                    <Button variant="outline" asChild><a href="/api/export?type=projects" download><Download className="size-4 mr-2" /> Projects CSV</a></Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

function ApiKeyInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <Input type={visible ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} placeholder="sk-..." className="pr-10" />
      <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3" onClick={() => setVisible(!visible)}>
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </Button>
    </div>
  )
}

function UserFormDialog({
  dialog, onClose, onSaved,
}: {
  dialog: { open: boolean; mode: 'add' | 'edit'; user?: User }
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = dialog.mode === 'edit'
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    username: '', email: '', password: '', fullName: '', role: 'viewer' as string,
    weeklyCapacity: 40, isActive: true, currentPassword: '', newPassword: '',
  })

  useEffect(() => {
    if (dialog.open) {
      if (isEdit && dialog.user) {
        setForm({
          username: dialog.user.username,
          email: dialog.user.email,
          password: '',
          fullName: dialog.user.fullName || '',
          role: dialog.user.role,
          weeklyCapacity: dialog.user.weeklyCapacity,
          isActive: dialog.user.isActive !== false,
          currentPassword: '',
          newPassword: '',
        })
      } else {
        setForm({
          username: '', email: '', password: '', fullName: '', role: 'viewer',
          weeklyCapacity: 40, isActive: true, currentPassword: '', newPassword: '',
        })
      }
    }
  }, [dialog.open, isEdit, dialog.user])

  const handleSubmit = async () => {
    if (!isEdit && !form.password) {
      toast.error('Password is required for new users')
      return
    }
    try {
      setSaving(true)
      const url = isEdit ? `/api/users/${dialog.user!.id}` : '/api/users'
      const body: Record<string, unknown> = {
        email: form.email,
        fullName: form.fullName,
        role: form.role,
        weeklyCapacity: form.weeklyCapacity,
        isActive: Boolean(form.isActive),
      }
      if (!isEdit) {
        body.username = form.username
        body.password = form.password
      } else if (form.newPassword) {
        body.currentPassword = form.currentPassword
        body.newPassword = form.newPassword
      }
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        toast.success(isEdit ? 'User updated' : 'User created')
        onSaved()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Failed to save user')
      }
    } catch {
      toast.error('Failed to save user')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={dialog.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit User' : 'Add User'}</DialogTitle>
          <DialogDescription>{isEdit ? 'Update user account settings' : 'Create a new user account'}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {!isEdit && (
            <div className="space-y-2">
              <Label>Username</Label>
              <Input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} placeholder="johndoe" />
            </div>
          )}
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} placeholder="John Doe" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="john@example.com" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Weekly Capacity (hrs)</Label>
              <Input type="number" min={1} max={168} value={form.weeklyCapacity} onChange={(e) => setForm((f) => ({ ...f, weeklyCapacity: Number(e.target.value) }))} />
            </div>
          </div>
          {isEdit && (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">User can log in</p>
              </div>
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
            </div>
          )}
          <Separator />
          <div className="space-y-2">
            <Label>{isEdit ? 'New Password (leave blank to keep)' : 'Password'}</Label>
            <Input type="password" value={isEdit ? form.newPassword : form.password}
              onChange={(e) => setForm((f) => isEdit ? { ...f, newPassword: e.target.value } : { ...f, password: e.target.value })}
              placeholder="••••••••" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
            {isEdit ? 'Save Changes' : 'Create User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TemplateFormDialog({
  dialog, onClose, onSaved,
}: {
  dialog: { open: boolean; mode: 'add' | 'edit'; template?: TaskTemplate }
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = dialog.mode === 'edit'
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('CAD')
  const [category, setCategory] = useState('General')
  const [isDefault, setIsDefault] = useState(false)
  const [tasks, setTasks] = useState<TemplateTask[]>([{ title: '', type: 'CAD', effort: 2, priority: 'Medium' }])

  useEffect(() => {
    if (dialog.open) {
      if (isEdit && dialog.template) {
        setName(dialog.template.name)
        setDescription(dialog.template.description || '')
        setType(dialog.template.type)
        setCategory(dialog.template.category)
        setIsDefault(dialog.template.isDefault)
        try {
          const parsed = JSON.parse(dialog.template.tasksJson || '[]')
          setTasks(parsed.length > 0 ? parsed : [{ title: '', type: 'CAD', effort: 2, priority: 'Medium' }])
        } catch {
          setTasks([{ title: '', type: 'CAD', effort: 2, priority: 'Medium' }])
        }
      } else {
        setName(''); setDescription(''); setType('CAD'); setCategory('General'); setIsDefault(false)
        setTasks([{ title: '', type: 'CAD', effort: 2, priority: 'Medium' }])
      }
    }
  }, [dialog.open, isEdit, dialog.template])

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error('Template name is required'); return }
    try {
      setSaving(true)
      const body = { name, description, type, category, isDefault, tasksJson: JSON.stringify(tasks.filter((t) => t.title.trim())) }
      const url = isEdit ? `/api/templates/${dialog.template!.id}` : '/api/templates'
      const res = await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) { toast.success(isEdit ? 'Template updated' : 'Template created'); onSaved() }
      else { const data = await res.json().catch(() => ({})); toast.error(data.error || 'Failed to save template') }
    } catch { toast.error('Failed to save template') }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={dialog.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Template' : 'New Template'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-2"><Label>Description</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="flex items-center gap-3"><Switch checked={isDefault} onCheckedChange={setIsDefault} /><Label>Default</Label></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>{isEdit ? 'Save' : 'Create'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
