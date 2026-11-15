import { useState, type FormEvent } from 'react'
import { ClipboardCheck, FolderKanban, FileText, X } from 'lucide-react'
import type { ProjectItem, StudyTask, WorkLogItem } from '../services/app-state'

export type EntryKind = 'task' | 'project' | 'worklog'
export type EntryRecord = StudyTask | ProjectItem | WorkLogItem
export type EntryValues = {
  id?: string
  title?: string
  subject?: string
  minutes?: number
  completed?: boolean
  name?: string
  detail?: string
  color?: string
  archived?: boolean
  project?: string
  category?: string
  description?: string
  date?: string
}

interface EntryDialogProps {
  kind: EntryKind
  projects: ProjectItem[]
  item?: EntryRecord
  onClose: () => void
  onSave: (values: EntryValues) => void
}

const colors = ['lilac', 'sage', 'peach', 'blue']

export function EntryDialog({ kind, projects, item, onClose, onSave }: EntryDialogProps) {
  const task = kind === 'task' && item ? item as StudyTask : undefined
  const projectItem = kind === 'project' && item ? item as ProjectItem : undefined
  const log = kind === 'worklog' && item ? item as WorkLogItem : undefined
  const [title, setTitle] = useState(task?.title ?? '')
  const [subject, setSubject] = useState(task?.subject ?? '')
  const [minutes, setMinutes] = useState(task?.minutes ?? 45)
  const [name, setName] = useState(projectItem?.name ?? '')
  const [detail, setDetail] = useState(projectItem?.detail ?? '')
  const [color, setColor] = useState(projectItem?.color ?? 'lilac')
  const [project, setProject] = useState(log?.project ?? '')
  const [category, setCategory] = useState(log?.category ?? 'Work')
  const [description, setDescription] = useState(log?.description ?? '')
  const isEdit = Boolean(item)
  const Icon = kind === 'task' ? ClipboardCheck : kind === 'project' ? FolderKanban : FileText

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (kind === 'task') onSave({ id: task?.id, title: title.trim(), subject, minutes })
    if (kind === 'project') onSave({ id: projectItem?.id, name: name.trim(), detail: detail.trim(), color, archived: projectItem?.archived ?? false })
    if (kind === 'worklog') onSave({ id: log?.id, project: project.trim(), category, description: description.trim(), date: log?.date ?? new Date().toISOString() })
  }

  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="dialog-card entry-dialog" role="dialog" aria-modal="true" aria-labelledby="entry-title">
      <div className="dialog-topline"><span className="dialog-icon"><Icon size={17} /></span><span className="eyebrow">{kind === 'task' ? 'PERSONAL PLAN' : kind === 'project' ? 'PROJECT TRACKER' : 'ACTIVITY NOTE'}</span><button type="button" className="icon-button dialog-close" onClick={onClose} aria-label="Close form"><X size={18} /></button></div>
      <h2 id="entry-title">{isEdit ? 'Make an edit.' : kind === 'task' ? 'Add a task.' : kind === 'project' ? 'Add a project.' : 'Log an activity note.'}</h2>
      <p className="dialog-intro">{kind === 'task' ? 'Keep it small and specific.' : kind === 'project' ? 'Give your work a home.' : 'A short note helps you remember the progress.'}</p>
      <form onSubmit={submit} className="entry-form">
        {kind === 'task' && <><label className="field-label">Task<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="One small next step" required maxLength={100} autoFocus /></label><label className="field-label">Focus area<input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Optional" list="task-focus-areas" /><datalist id="task-focus-areas">{['Work', 'Study', 'Care', 'Home', 'Creative', 'Personal'].map((entry) => <option key={entry} value={entry} />)}</datalist></label><label className="field-label">Estimated time<select value={minutes} onChange={(event) => setMinutes(Number(event.target.value))}>{[15, 25, 35, 45, 50, 60, 90].map((entry) => <option key={entry} value={entry}>{entry} minutes</option>)}</select></label></>}
        {kind === 'project' && <><label className="field-label">Project or goal<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Give it a name" required maxLength={60} autoFocus /></label><label className="field-label">A short description<input value={detail} onChange={(event) => setDetail(event.target.value)} placeholder="What would you like to keep in view?" maxLength={120} /></label><fieldset className="color-picker"><legend>Color</legend>{colors.map((entry) => <label key={entry} className={`color-option ${entry}`}><input type="radio" name="project-color" value={entry} checked={color === entry} onChange={() => setColor(entry)} /><span /><span className="sr-only">{entry}</span></label>)}</fieldset></>}
        {kind === 'worklog' && <><label className="field-label">Related project<select value={project} onChange={(event) => setProject(event.target.value)}><option value="">None</option>{projects.filter((entry) => !entry.archived).map((entry) => <option key={entry.id}>{entry.name}</option>)}</select></label><label className="field-label">Activity type<select value={category} onChange={(event) => setCategory(event.target.value)}>{['Work', 'Study', 'Care', 'Home', 'Creative', 'Other'].map((entry) => <option key={entry}>{entry}</option>)}</select></label><label className="field-label">What would you like to remember?<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="A few words about what happened" required rows={3} maxLength={220} /></label></>}
        <button type="submit" className="button-primary entry-submit">{isEdit ? 'Save changes' : kind === 'task' ? 'Add to my plan' : kind === 'project' ? 'Create project' : 'Save activity note'}</button>
      </form>
    </section>
  </div>
}
