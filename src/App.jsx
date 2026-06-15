import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Login from './Login.jsx'
import Dashboard from './Dashboard.jsx'
import SweetSchedule from './SweetSchedule.jsx'
import Customers from './Customers.jsx'
import Recipes from './Recipes.jsx'
import Projects from './Projects.jsx'
import Notes from './Notes.jsx'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('home')

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
    <div style={{ paddingBottom: 64 }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.95); }
          60% { transform: scale(1.02); }
          100% { opacity: 1; transform: scale(1); }
        }
        .tab-content {
          animation: fadeIn 0.2s ease forwards;
        }
      `}</style>
      {tab === 'home' && <div className="tab-content"><Dashboard key={tab} onNavigate={setTab} /></div>}
      {tab === 'orders' && <div className="tab-content"><SweetSchedule /></div>}
      {tab === 'customers' && <div className="tab-content"><Customers /></div>}
      {tab === 'recipes' && <div className="tab-content"><Recipes /></div>}
      {tab === 'projects' && <div className="tab-content"><Projects /></div>}
      {tab === 'notes' && <div className="tab-content"><Notes /></div>}

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#FFFDF8', borderTop: '1px solid #E7D9C5', display: 'flex', zIndex: 100 }}>
        <button onClick={() => setTab('home')} style={{ flex: 1, padding: '14px 0', fontFamily: 'Hanken Grotesk, sans-serif', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', background: 'transparent', color: tab === 'home' ? '#C8643C' : '#7A6452', borderTop: tab === 'home' ? '2px solid #C8643C' : '2px solid transparent' }}>
          Home
        </button>
        <button onClick={() => setTab('orders')} style={{ flex: 1, padding: '14px 0', fontFamily: 'Hanken Grotesk, sans-serif', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', background: 'transparent', color: tab === 'orders' ? '#C8643C' : '#7A6452', borderTop: tab === 'orders' ? '2px solid #C8643C' : '2px solid transparent' }}>
          Orders
        </button>
        <button onClick={() => setTab('customers')} style={{ flex: 1, padding: '14px 0', fontFamily: 'Hanken Grotesk, sans-serif', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', background: 'transparent', color: tab === 'customers' ? '#C8643C' : '#7A6452', borderTop: tab === 'customers' ? '2px solid #C8643C' : '2px solid transparent' }}>
          Customers
        </button>
        <button onClick={() => setTab('recipes')} style={{ flex: 1, padding: '14px 0', fontFamily: 'Hanken Grotesk, sans-serif', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', background: 'transparent', color: tab === 'recipes' ? '#C8643C' : '#7A6452', borderTop: tab === 'recipes' ? '2px solid #C8643C' : '2px solid transparent' }}>
          Recipes
        </button>
        <button onClick={() => setTab('projects')} style={{ flex: 1, padding: '14px 0', fontFamily: 'Hanken Grotesk, sans-serif', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', background: 'transparent', color: tab === 'projects' ? '#C8643C' : '#7A6452', borderTop: tab === 'projects' ? '2px solid #C8643C' : '2px solid transparent' }}>
          Projects
        </button>
        <button onClick={() => setTab('notes')} style={{ flex: 1, padding: '14px 0', fontFamily: 'Hanken Grotesk, sans-serif', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', background: 'transparent', color: tab === 'notes' ? '#C8643C' : '#7A6452', borderTop: tab === 'notes' ? '2px solid #C8643C' : '2px solid transparent' }}>
          Notes
        </button>
        <button
          onClick={() => supabase.auth.signOut()}
          style={{ padding: '14px 16px', fontFamily: 'Hanken Grotesk, sans-serif', fontWeight: 700, fontSize: 13, border: 'none', borderLeft: '1px solid #E7D9C5', cursor: 'pointer', background: 'transparent', color: '#7A6452', borderTop: '2px solid transparent' }}
        >
          Sign out
        </button>
      </div>
    </div>
  )
}

export default App