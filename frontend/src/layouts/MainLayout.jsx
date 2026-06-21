import Header from '../components/Header'

export default function MainLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="max-w-6xl mx-auto px-6 py-12">
        {children}
      </main>
    </div>
  )
}
