import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Login from './Login.jsx'
import Dashboard from './Dashboard.jsx'
import SweetSchedule from './SweetSchedule.jsx'
import Customers from './Customers.jsx'
import Recipes from './Recipes.jsx'
import Projects from './Projects.jsx'
import Notes from './Notes.jsx'
import CakeBuilder from './CakeBuilder.jsx'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('home')
  const [menuOpen, setMenuOpen] = useState(false)
  const settingsLabel = (t) => {
    const labels = { home: 'Home', orders: 'Orders', customers: 'Customers', recipes: 'Recipes', cakebuilder: 'Cake Builder', projects: 'Projects', notes: 'Notes' }
    return labels[t] || ''
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return null
  if (!session) return <Login />

  return (
    <div style={{ paddingBottom: 24 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Hanken+Grotesk:wght@400;500;600;700&display=swap');
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.95); }
          60% { transform: scale(1.02); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .tab-content {
          /* animation: fadeIn 0.2s ease forwards; */
        }
        .menu-dropdown {
          animation: slideDown 0.18s ease forwards;
        }
      `}</style>

      {/* top bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 150, background: '#FBF4E9', borderBottom: '1px solid #E7D9C5', display: 'flex', alignItems: 'center', padding: '14px 16px', gap: 12 }}>
        <button
          onClick={() => setMenuOpen(s => !s)}
          style={{ background: 'transparent', border: 'none', fontSize: 22, cursor: 'pointer', color: '#33241A', padding: 4, lineHeight: 1 }}
          aria-label="Menu"
        >
          ☰
        </button>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 600, color: '#33241A' }}>
          {settingsLabel(tab)}
        </div>
      </div>

      {/* dropdown menu */}
      {menuOpen && (
        <>
          <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(51,36,26,0.4)', zIndex: 140 }} />
          <div className="menu-dropdown" style={{ position: 'fixed', top: 58, left: 12, right: 12, background: '#FFFDF8', border: '1px solid #E7D9C5', borderRadius: 16, zIndex: 145, overflow: 'hidden', boxShadow: '0 12px 32px -8px rgba(110,80,50,0.3)' }}>
            {[
              { key: 'home', label: 'Home' },
              { key: 'orders', label: 'Orders' },
              { key: 'customers', label: 'Customers' },
              { key: 'recipes', label: 'Recipes' },
              { key: 'cakebuilder', label: 'Cake Builder' },
              { key: 'projects', label: 'Projects' },
              { key: 'notes', label: 'Notes' },
            ].map(item => (
              <button
                key={item.key}
                onClick={() => { setTab(item.key); setMenuOpen(false) }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '14px 18px',
                  fontFamily: 'Hanken Grotesk, sans-serif', fontWeight: 700, fontSize: 15,
                  border: 'none', borderBottom: '1px solid #E7D9C5', cursor: 'pointer',
                  background: tab === item.key ? '#FBF4E9' : 'transparent',
                  color: tab === item.key ? '#C8643C' : '#33241A',
                }}
              >
                {item.label}
              </button>
            ))}
            <button
              onClick={() => { supabase.auth.signOut(); setMenuOpen(false) }}
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '14px 18px',
                fontFamily: 'Hanken Grotesk, sans-serif', fontWeight: 700, fontSize: 15,
                border: 'none', cursor: 'pointer', background: 'transparent', color: '#B5394F',
              }}
            >
              Sign out
            </button>
          </div>
        </>
      )}

      {tab === 'home' && <div className="tab-content"><Dashboard key={tab} onNavigate={setTab} /></div>}
      {tab === 'orders' && <div className="tab-content"><SweetSchedule /></div>}
      {tab === 'customers' && <div className="tab-content"><Customers /></div>}
      {tab === 'recipes' && <div className="tab-content"><Recipes /></div>}
      {tab === 'projects' && <div className="tab-content"><Projects /></div>}
      {tab === 'notes' && <div className="tab-content"><Notes /></div>}
      {tab === 'cakebuilder' && <div className="tab-content"><CakeBuilder /></div>}
    </div>
  )
}

export default App