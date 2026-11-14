import { useState, type FormEvent } from 'react'
import { AlertCircle, Check, Cloud, X } from 'lucide-react'
import { supabase } from '../services/supabase.ts'
import type { User } from '@supabase/supabase-js'

interface AuthDialogProps {
  onClose: () => void
  onSuccess: (user: User) => void
}

export function AuthDialog({ onClose, onSuccess }: AuthDialogProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [infoMsg, setInfoMsg] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMsg('')
    setInfoMsg('')
    setIsLoading(true)

    try {
      if (mode === 'signin') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })

        if (error) {
          setErrorMsg(error.message)
          return
        }

        if (data.user) {
          onSuccess(data.user)
          onClose()
        }
      } else {
        const trimmedName = fullName.trim()
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: trimmedName || undefined,
              name: trimmedName || undefined,
            },
          },
        })

        if (error) {
          setErrorMsg(error.message)
          return
        }

        // If automatic session is returned (email confirmation disabled in Supabase)
        if (data.session && data.user) {
          onSuccess(data.user)
          onClose()
        } else if (data.user) {
          // If confirmation email is required
          setInfoMsg('Account created successfully! Please check your email to confirm, then sign in.')
          setMode('signin')
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed'
      setErrorMsg(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="dialog-card auth-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        style={{ maxWidth: '440px' }}
      >
        <div className="dialog-topline">
          <span className="dialog-mode-icon">
            <Cloud size={17} />
          </span>
          <span className="eyebrow">SUPABASE CLOUD AUTH</span>
          <button
            type="button"
            className="icon-button dialog-close"
            onClick={onClose}
            aria-label="Close authentication dialog"
          >
            <X size={18} />
          </button>
        </div>

        <h2 id="auth-title">
          {mode === 'signin' ? 'Welcome back.' : 'Create your cloud account.'}
        </h2>
        <p className="dialog-intro">
          {mode === 'signin'
            ? 'Sign in to access your sessions and CFI trends securely from any device.'
            : 'Protect your focus logs, timer history, and Cognitive Fatigue Index scores across devices.'}
        </p>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
          <button
            type="button"
            className={`button-secondary ${mode === 'signin' ? 'button-primary' : ''}`}
            onClick={() => {
              setMode('signin')
              setErrorMsg('')
              setInfoMsg('')
            }}
            style={{ flex: 1, minHeight: '34px' }}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`button-secondary ${mode === 'signup' ? 'button-primary' : ''}`}
            onClick={() => {
              setMode('signup')
              setErrorMsg('')
              setInfoMsg('')
            }}
            style={{ flex: 1, minHeight: '34px' }}
          >
            Create account
          </button>
        </div>

        {errorMsg && (
          <div
            style={{
              padding: '9px 12px',
              marginBottom: '14px',
              borderRadius: '10px',
              background: 'rgba(224, 82, 82, 0.1)',
              border: '1px solid rgba(224, 82, 82, 0.3)',
              color: '#d94343',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {infoMsg && (
          <div
            style={{
              padding: '9px 12px',
              marginBottom: '14px',
              borderRadius: '10px',
              background: 'rgba(103, 165, 122, 0.12)',
              border: '1px solid rgba(103, 165, 122, 0.35)',
              color: '#447a54',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Check size={15} style={{ flexShrink: 0 }} />
            <span>{infoMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '14px' }}>
          {mode === 'signup' && (
            <label className="field-label">
              Your name
              <input
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="e.g. Taylor"
                maxLength={60}
                autoFocus
              />
            </label>
          )}

          <label className="field-label">
            Email address
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@domain.com"
              autoFocus={mode === 'signin'}
            />
          </label>

          <label className="field-label">
            Password
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
            />
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="button-primary student-primary"
            style={{ width: '100%', minHeight: '39px', marginTop: '6px' }}
          >
            {isLoading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p
          style={{
            marginTop: '16px',
            fontSize: '10px',
            color: 'var(--muted)',
            textAlign: 'center',
            lineHeight: 1.45,
          }}
        >
          Row Level Security prevents other users from accessing your records.
          <br />
          Local storage serves as an automatic offline backup.
        </p>
      </section>
    </div>
  )
}
