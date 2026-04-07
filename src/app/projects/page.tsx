'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function ProjectsPage() {
  const router = useRouter()
  const [showNew, setShowNew] = useState(false)
  const [projectName, setProjectName] = useState('')

  function createProject() {
    if (!projectName.trim()) return
    router.push('/projects/' + encodeURIComponent(projectName.trim()))
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: '#0f0f0f',
      fontFamily: 'system-ui, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      position: 'relative',
    }}>

      <div style={{ width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h1 style={{ color: 'white', fontSize: '1.25rem', fontWeight: 500, textAlign: 'center', marginBottom: '1rem' }}>
          Visualiseringsverktyg
        </h1>

        <button
          onClick={() => setShowNew(true)}
          style={{
            padding: '1.25rem 2rem',
            background: '#1a1a1a',
            border: '1.5px solid #2ecc71',
            borderRadius: '10px',
            color: '#2ecc71',
            fontSize: '1rem',
            fontWeight: 500,
            cursor: 'pointer',
            width: '100%',
          }}
        >
          Skapa nytt projekt
        </button>

        <button
          onClick={() => alert('Öppna befintligt projekt — kommer snart')}
          style={{
            padding: '1.25rem 2rem',
            background: '#1a1a1a',
            border: '1.5px solid #2ecc71',
            borderRadius: '10px',
            color: '#2ecc71',
            fontSize: '1rem',
            fontWeight: 500,
            cursor: 'pointer',
            width: '100%',
          }}
        >
          Öppna projekt
        </button>
      </div>

      {showNew && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
        }}>
          <div style={{
            background: '#1a1a1a', borderRadius: '12px', padding: '1.5rem',
            width: '100%', maxWidth: '360px', border: '1px solid #2a2a2a',
          }}>
            <h2 style={{ color: 'white', fontSize: '1rem', fontWeight: 500, marginBottom: '1rem' }}>
              Nytt projekt
            </h2>
            <input
              autoFocus
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createProject()}
              placeholder="Projektnamn..."
              style={{
                width: '100%', padding: '0.625rem 0.75rem',
                background: '#111', border: '1px solid #333',
                borderRadius: '8px', color: 'white', fontSize: '0.875rem',
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const DEMO_USER = 'tor@flodet.se'

export default function ProjectsPage() {
  const router = useRouter()
  const [showNew, setShowNew] = useState(false)
  const [projectName, setProjectName] = useState('')

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!projectName.trim()) return
    router.push('/projects/' + encodeURIComponent(projectName.trim()))
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: '#0f0f0f',
      fontFamily: 'system-ui, sans-serif',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        padding: '2rem',
      }}>
        <h1 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 500, marginBottom: '1rem' }}>
          Visualiseringsverktyg
        </h1>

        <button
          onClick={() => setShowNew(true)}
          style={{
            width: '260px', padding: '1rem',
            background: '#1a1a1a', border: '1.5px solid #1a56db',
            borderRadius: '10px', color: 'white', fontSize: '1rem',
            cursor: 'pointer', fontWeight: 500,
          }}
        >
          Skapa nytt projekt
        </button>

        <button
          onClick={() => router.push('/projects/stolar-och-sitsar')}
          style={{
            width: '260px', padding: '1rem',
            background: '#1a1a1a', border: '1.5px solid #1a56db',
            borderRadius: '10px', color: 'white', fontSize: '1rem',
            cursor: 'pointer', fontWeight: 500,
          }}
        >
          Öppna projekt
        </button>
      </div>

      {showNew && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem',
        }}>
          <div style={{
            background: '#1a1a1a', borderRadius: '12px',
            padding: '1.5rem', width: '100%', maxWidth: '340px',
            border: '1px solid #2a2a2a',
          }}>
            <h2 style={{ color: 'white', fontSize: '1rem', fontWeight: 500, marginBottom: '1rem' }}>
              Nytt projekt
            </h2>
            <form onSubmit={handleCreate}>
              <input
                autoFocus
                type="text"
                placeholder="Projektnamn..."
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
                style={{
                  width: '100%', padding: '0.625rem 0.75rem',
                  background: '#111', border: '1px solid #333',
                  borderRadius: '8px', color: 'white', fontSize: '0.875rem',
                  outline: 'none', boxSizing: 'border-box', marginBottom: '1rem',
                }}
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => { setShowNew(false); setProjectName('') }}
                  style={{
                    padding: '0.5rem 1rem', background: 'transparent',
                    border: '1px solid #444', borderRadius: '8px',
                    color: '#888', cursor: 'pointer', fontSize: '0.875rem',
                  }}
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.5rem 1rem', background: '#1a56db',
                    border: 'none', borderRadius: '8px',
                    color: 'white', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500,
                  }}
                >
                  Skapa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{
        padding: '1rem 1.5rem',
        display: 'flex', alignItems: 'center', gap: '1rem',
        borderTop: '1px solid #1a1a1a',
      }}>
        <span style={{ color: '#555', fontSize: '0.8rem' }}>
          Inloggad som {DEMO_USER}
        </span>
        <button
          onClick={() => router.push('/login')}
          style={{
            background: 'transparent', border: 'none',
            color: '#666', fontSize: '0.8rem', cursor: 'pointer',
            textDecoration: 'underline', padding: 0,
          }}
        >
          Logga ut
        </button>
      </div>
    </main>
  )
}
