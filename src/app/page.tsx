export default function Home() {
  return (
    <main style={{
      display: 'flex',
      minHeight: '100vh',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
      background: '#0f0f0f',
      color: 'white',
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 500, marginBottom: '0.5rem' }}>
          Visualiseringsverktyg
        </h1>
        <p style={{ color: '#888', marginBottom: '0.25rem' }}>
          Kultur för äldre — AI-drivet workshopverktyg
        </p>
        <p style={{ color: '#555', fontSize: '0.875rem' }}>
          Under uppbyggnad
        </p>
      </div>
    </main>
  )
}
