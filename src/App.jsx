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
import Logo from './assets/Logo.jsx'
import IconHome from './assets/icons/IconRecipes.jsx' // placeholder, see note below
import IconRecipes from './assets/icons/IconRecipes.jsx'
import IconCakeBuilder from './assets/icons/IconCakeBuilder.jsx'
import IconCustomers from './assets/icons/IconCustomers.jsx'
import IconProjects from './assets/icons/IconProjects.jsx'
import IconNotes from './assets/icons/IconNotes.jsx'

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
      <div style={{ position: 'sticky', top: 0, zIndex: 150, background: 'var(--card)', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 14, minHeight: 76 }}>
        <button
          onClick={() => setMenuOpen(s => !s)}
          style={{ background: 'transparent', border: 'none', fontSize: 24, cursor: 'pointer', color: 'var(--ink)', padding: 4, lineHeight: 1, flexShrink: 0 }}
          aria-label="Menu"
        >
          ☰
        </button>
        <Logo style={{ height: 62, width: 'auto', color: 'var(--ink)', flexShrink: 0 }} />
        <div style={{ lineHeight: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontFamily: 'Pacifico, cursive', fontSize: 17, color: 'var(--ink-soft)', lineHeight: 1, marginBottom: 2 }}>the</div>
          <div style={{ fontFamily: 'Amatic SC, sans-serif', fontWeight: 700, fontSize: 38, color: 'var(--ink)', lineHeight: 0.75 }}>BAKE BOOK</div>
        </div>
      </div>

      {/* dropdown menu */}
      {menuOpen && (
        <>
          <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(51,36,26,0.4)', zIndex: 140 }} />
          <div className="menu-dropdown" style={{ position: 'fixed', top: 58, left: 12, right: 12, background: '#FFFDF8', border: '1px solid #E7D9C5', borderRadius: 16, zIndex: 145, overflow: 'hidden', boxShadow: '0 12px 32px -8px rgba(110,80,50,0.3)' }}>
            {[
              { key: 'home', label: 'Home', icon: null },
              { key: 'orders', label: 'Orders', icon: null },
              { key: 'customers', label: 'Customers', icon: IconCustomers },
              { key: 'recipes', label: 'Recipes', icon: IconRecipes },
              { key: 'cakebuilder', label: 'Cake Builder', icon: IconCakeBuilder },
              { key: 'projects', label: 'Projects', icon: IconProjects },
              { key: 'notes', label: 'Notes', icon: IconNotes },
            ].map(item => (
              <button
                key={item.key}
                onClick={() => { setTab(item.key); setMenuOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '12px 18px',
                  fontFamily: 'Hanken Grotesk, sans-serif', fontWeight: 700, fontSize: 15,
                  border: 'none', borderBottom: '1px solid var(--line)', cursor: 'pointer',
                  background: tab === item.key ? 'var(--paper)' : 'transparent',
                  color: tab === item.key ? 'var(--terracotta)' : 'var(--ink)',
                }}
              >
                {item.icon && <item.icon style={{ width: 32, height: 32, color: 'inherit' }} />}
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
      {tab === 'customers' && <div className="tab-content"><Customers onNavigate={setTab} /></div>}
      {tab === 'recipes' && <div className="tab-content"><Recipes /></div>}
      {tab === 'projects' && <div className="tab-content"><Projects /></div>}
      {tab === 'notes' && <div className="tab-content"><Notes /></div>}
      {tab === 'cakebuilder' && <div className="tab-content"><CakeBuilder /></div>}
    </div>
  )
}

export default App