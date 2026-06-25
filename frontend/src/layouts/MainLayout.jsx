import Header from '../components/Header'

export default function MainLayout({ children }) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#09090B', color: '#FAFAFA', fontFamily: "'Inter', 'Noto Sans JP', sans-serif" }}>
      <style>{`
        @media (max-width: 600px) {
          .main-content { padding: 20px 16px !important; }
        }
      `}</style>
      <Header />
      <main className="main-content" style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        {children}
      </main>
    </div>
  )
}
