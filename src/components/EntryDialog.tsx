import { useState, type FormEvent } from 'react'
import { BookOpen, BriefcaseBusiness, FileText, X } from 'lucide-react'
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
  const [subject, setSubject] = useState(task?.subject ?? 'Mathematics')
  const [minutes, setMinutes] = useState(task?.minutes ?? 45)
  const [name, setName] = useState(projectItem?.name ?? '')
  const [detail, setDetail] = useState(projectItem?.detail ?? '')
  const [color, setColor] = useState(projectItem?.color ?? 'lilac')
  const [project, setProject] = useState(log?.project ?? projects.find((entry) => !entry.archived)?.name ?? '')
  const [category, setCategory] = useState(log?.category ?? 'Coding')
  const [description, setDescription] = useState(log?.description ?? '')
  const isEdit = Boolean(item)
  const Icon = kind === 'task' ? BookOpen : kind === 'project' ? BriefcaseBusiness : FileText

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (kind === 'task') onSave({ id: task?.id, title: title.trim(), subject, minutes })
    if (kind === 'project') onSave({ id: projectItem?.id, name: name.trim(), detail: detail.trim(), color, archived: projectItem?.archived ?? false })
    if (kind === 'worklog') onSave({ id: log?.id, project: project.trim(), category, description: description.trim(), date: log?.date ?? new Date().toISOString() })
  }

  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="dialog-card entry-dialog" role="dialog" aria-modal="true" aria-labelledby="entry-title">
      <div className="dialog-topline"><span className="dialog-mode-icon"><Icon size={17} /></span><span className="eyebrow">{kind === 'task' ? 'STUDY PLANNER' : kind === 'project' ? 'PROJECT TRACKER' : 'WORK LOG'}</span><button type="button" className="icon-button dialog-close" onClick={onClose} aria-label="Close form"><X size={18} /></button></div>
      <h2 id="entry-title">{isEdit ? 'Make an edit.' : kind === 'task' ? 'Add a study task.' : kind === 'project' ? 'Add a project.' : 'Log a completed task.'}</h2>
      <p className="dialog-intro">{kind === 'task' ? 'Keep it small and specific.' : kind === 'project' ? 'Give your work a home.' : 'A short note helps you remember the progress.'}</p>
      <form onSubmit={submit} className="entry-form">
        {kind === 'task' && <><label className="field-label">Task<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Review lecture notes" required maxLength={100} autoFocus /></label><label className="field-label">Subject<select value={subject} onChange={(event) => setSubject(event.target.value)}>{['Mathematics', 'Physics', 'Chemistry', 'Computer Science', 'Biology', 'Other'].map((entry) => <option key={entry}>{entry}</option>)}</select></label><label className="field-label">Estimated time<select value={minutes} onChange={(event) => setMinutes(Number(event.target.value))}>{[15, 25, 35, 45, 50, 60, 90].map((entry) => <option key={entry} value={entry}>{entry} minutes</option>)}</select></label></>}
        {kind === 'project' && <><label className="field-label">Project name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Fieldnotes" required maxLength={60} autoFocus /></label><label className="field-label">A short description<input value={detail} onChange={(event) => setDetail(event.target.value)} placeholder="What are you building?" maxLength={120} /></label><fieldset className="color-picker"><legend>Project color</legend>{colors.map((entry) => <label key={entry} className={`color-option ${entry}`}><input type="radio" name="project-color" value={entry} checked={color === entry} onChange={() => setColor(entry)} /><span /><span className="sr-only">{entry}</span></label>)}</fieldset></>}
        {kind === 'worklog' && <><label className="field-label">Project<select value={project} onChange={(event) => setProject(event.target.value)} required><option value="" disabled>Choose a project</option>{projects.filter((entry) => !entry.archived).map((entry) => <option key={entry.id}>{entry.name}</option>)}</select></label><label className="field-label">Category<select value={category} onChange={(event) => setCategory(event.target.value)}>{['Coding', 'Debugging', 'Research', 'Documentation', 'Learning', 'Other'].map((entry) => <option key={entry}>{entry}</option>)}</select></label><label className="field-label">What did you complete?<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="A few words about what moved forward" required rows={3} maxLength={220} /></label></>}
        <button type="submit" className="button-primary student-primary entry-submit">{isEdit ? 'Save changes' : kind === 'task' ? 'Add to my plan' : kind === 'project' ? 'Create project' : 'Save work log'}</button>
      </form>
    </section>
  </div>
}
