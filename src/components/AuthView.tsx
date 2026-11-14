import { useState, type FormEvent } from 'react'
import { Activity, AlertCircle, ArrowLeft, ArrowRight, BookOpen, Check, Code2, Lock, Mail, User as UserIcon } from 'lucide-react'
import { supabase } from '../services/supabase.ts'
import type { User } from '@supabase/supabase-js'

export type AuthMode = 'signin' | 'signup' | 'forgot' | 'recovery'

interface AuthViewProps {
  initialMode?: AuthMode
  onSuccess: (user: User) => void
}

export function AuthView({ initialMode = 'signin', onSuccess }: AuthViewProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [startingMode, setStartingMode] = useState<'student' | 'developer'>('student')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [infoMsg, setInfoMsg] = useState('')

  function switchMode(newMode: AuthMode) {
    setMode(newMode)
    setErrorMsg('')
    setInfoMsg('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMsg('')
    setInfoMsg('')

    // Client-side validations
    if (mode === 'recovery') {
      if (password.length < 6) {
        setErrorMsg('New password must be at least 6 characters long.')
        return
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match. Please re-enter.')
        return
      }
    } else if (mode === 'signup') {
      if (password.length < 6) {
        setErrorMsg('Password must be at least 6 characters long.')
        return
      }
    }

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
        }
      } else if (mode === 'signup') {
        const trimmedName = fullName.trim()
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: trimmedName || undefined,
              name: trimmedName || undefined,
              default_mode: startingMode,
            },
          },
        })

        if (error) {
          setErrorMsg(error.message)
          return
        }

        if (data.session && data.user) {
          onSuccess(data.user)
        } else if (data.user) {
          setInfoMsg('Account created successfully! Check your email inbox to confirm your address, then sign in.')
          setMode('signin')
        }
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin,
        })

        if (error) {
          setErrorMsg(error.message)
          return
        }

        setInfoMsg(`Password recovery instructions sent to ${email.trim()}. Please check your email inbox.`)
      } else if (mode === 'recovery') {
        const { data, error } = await supabase.auth.updateUser({
          password,
        })

        if (error) {
          setErrorMsg(error.message)
          return
        }

        if (data.user) {
          setInfoMsg('Your password has been successfully updated! Welcome back.')
          onSuccess(data.user)
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred during authentication.'
      setErrorMsg(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-page-container">
      <div className="auth-card-wrapper">
        <header className="auth-brand-header">
          <div className="brand-lockup">
            <span className="brand-mark">
              <Activity size={24} strokeWidth={2.4} />
            </span>
            <span className="brand-copy">
              <strong>radarr</strong>
              <small>your balance, in focus</small>
            </span>
          </div>
        </header>

        <section className="auth-card">
          <div className="auth-header-copy">
            <h2>
              {mode === 'signin' && 'Welcome back'}
              {mode === 'signup' && 'Create your account'}
              {mode === 'forgot' && 'Reset your password'}
              {mode === 'recovery' && 'Set a new password'}
            </h2>
            <p>
              {mode === 'signin' && 'Sign in to access your personal study space or developer command centre.'}
              {mode === 'signup' && 'Join Burnout Radarr to track cognitive fatigue and protect your focus rhythm.'}
              {mode === 'forgot' && 'Enter your registered email and we will send you a password recovery link.'}
              {mode === 'recovery' && 'Enter your new password below to secure your account.'}
            </p>
          </div>

          {(mode === 'signin' || mode === 'signup') && (
            <div className="auth-tab-switch" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'signin'}
                className={`auth-tab-btn${mode === 'signin' ? ' active' : ''}`}
                onClick={() => switchMode('signin')}
              >
                Sign in
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'signup'}
                className={`auth-tab-btn${mode === 'signup' ? ' active' : ''}`}
                onClick={() => switchMode('signup')}
              >
                Create account
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="auth-alert error-alert" role="alert">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {infoMsg && (
            <div className="auth-alert info-alert" role="status">
              <Check size={16} />
              <span>{infoMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form" noValidate={false}>
            {mode === 'signup' && (
              <label className="field-label">
                <span>Full name</span>
                <div className="input-with-icon">
                  <UserIcon size={16} className="input-icon" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Taylor Chen"
                    maxLength={60}
                    autoFocus
                  />
                </div>
              </label>
            )}

            {mode !== 'recovery' && (
              <label className="field-label">
                <span>Email address</span>
                <div className="input-with-icon">
                  <Mail size={16} className="input-icon" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    autoFocus={mode === 'signin' || mode === 'forgot'}
                  />
                </div>
              </label>
            )}

            {(mode === 'signin' || mode === 'signup' || mode === 'recovery') && (
              <label className="field-label">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{mode === 'recovery' ? 'New password' : 'Password'}</span>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      className="text-link-quiet"
                      onClick={() => switchMode('forgot')}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="input-with-icon">
                  <Lock size={16} className="input-icon" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    autoFocus={mode === 'recovery'}
                  />
                </div>
              </label>
            )}

            {mode === 'recovery' && (
              <label className="field-label">
                <span>Confirm new password</span>
                <div className="input-with-icon">
                  <Lock size={16} className="input-icon" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                  />
                </div>
              </label>
            )}

            {mode === 'signup' && (
              <div className="signup-mode-picker">
                <span className="field-label-text">Starting workspace mode</span>
                <div className="mode-option-grid">
                  <button
                    type="button"
                    className={`mode-option-card${startingMode === 'student' ? ' selected' : ''}`}
                    onClick={() => setStartingMode('student')}
                  >
                    <BookOpen size={16} />
                    <strong>Study space</strong>
                    <small>Coursework, problem sets &amp; academic pacing</small>
                  </button>
                  <button
                    type="button"
                    className={`mode-option-card${startingMode === 'developer' ? ' selected' : ''}`}
                    onClick={() => setStartingMode('developer')}
                  >
                    <Code2 size={16} />
                    <strong>Dev command</strong>
                    <small>Projects, debugging, architecture &amp; sprint rhythm</small>
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`button-primary auth-submit-btn ${startingMode === 'developer' && mode === 'signup' ? 'developer-primary' : 'student-primary'}`}
            >
              {isLoading
                ? 'Please wait…'
                : mode === 'signin'
                  ? 'Sign in to workspace'
                  : mode === 'signup'
                    ? 'Create your account'
                    : mode === 'forgot'
                      ? 'Send reset instructions'
                      : 'Update password'}
              {!isLoading && <ArrowRight size={16} />}
            </button>
          </form>

          {mode === 'forgot' && (
            <div className="auth-back-row">
              <button
                type="button"
                className="button-ghost-link"
                onClick={() => switchMode('signin')}
              >
                <ArrowLeft size={14} /> Back to sign in
              </button>
            </div>
          )}

          <footer className="auth-footer-notice">
            <span>🔒 Isolated user sessions &amp; Row Level Security enabled.</span>
            <span>Your personal check-ins and CFI logs are private to your account.</span>
          </footer>
        </section>
      </div>
    </div>
  )
}
