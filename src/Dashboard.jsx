import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const pad = (n) => String(n).padStart(2, "0")
const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const todayStr = () => toKey(new Date())
const tomorrow = () => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return toKey(d)
}
const weekEnd = () => {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return toKey(d)
}
const fmtDate = (s) => new Date(s + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

export default function Dashboard({ onNavigate }) {
  const [orders, setOrders] = useState([])
  const [settings, setSettings] = useState({ bakerName: '', dailyCapacity: 3 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const [ordersRes, settingsRes] = await Promise.all([
        supabase.from('orders').select('*').order('due_date', { ascending: true }),
        supabase.from('settings').select('*').eq('user_id', user.id).single()
      ])
      if (ordersRes.data) setOrders(ordersRes.data)
      if (settingsRes.data) setSettings({ bakerName: settingsRes.data.baker_name || '', dailyCapacity: settingsRes.data.daily_capacity || 3 })
      setLoading(false)
    })()
  }, [])

  const today = todayStr()
  const tom = tomorrow()
  const week = weekEnd()

  const active = orders.filter(o => o.status !== 'Done')
  const todayOrders = active.filter(o => o.due_date === today)
  const tomorrowOrders = active.filter(o => o.due_date === tom)
  const weekOrders = active.filter(o => o.due_date > today && o.due_date <= week)
  const unpaid = active.filter(o => !o.paid)
  const overdue = active.filter(o => o.due_date < today)

  const statCard = (label, value, color, onClick) => (
    <div onClick={onClick} style={{ background: '#FFFDF8', border: '1px solid #E7D9C5', borderRadius: 16, padding: '16px 18px', cursor: onClick ? 'pointer' : 'default', flex: 1 }}>
      <div style={{ fontSize: 28, fontFamily: 'Fraunces, serif', fontWeight: 600, color: color || '#33241A' }}>{value}</div>
      <div style={{ fontSize: 13, color: '#7A6452', marginTop: 2 }}>{label}</div>
    </div>
  )

  const orderRow = (o) => (
    <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderTop: '1px solid #E7D9C5' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{o.qty}× {o.item}</div>
        <div style={{ fontSize: 13, color: '#7A6452' }}>{o.customer_name} · {fmtDate(o.due_date)}</div>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 50, background: o.paid ? '#EEF4E7' : '#F4E9D8', color: o.paid ? '#46612F' : '#7A6452' }}>{o.paid ? 'Paid' : 'Unpaid'}</span>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 50, background: { New: '#FBE6E6', Confirmed: '#E7EEF6', Baking: '#FCF0D9', Done: '#EEF4E7' }[o.status], color: { New: '#8E2433', Confirmed: '#2D4F77', Baking: '#8A5B12', Done: '#46612F' }[o.status] }}>{o.status}</span>
      </div>
    </div>
  )

  if (loading) return <div style={{ padding: 40, fontFamily: 'Hanken Grotesk, sans-serif', color: '#7A6452' }}>Loading...</div>

  return (
    <div style={{ fontFamily: 'Hanken Grotesk, sans-serif', padding: '22px 16px 60px', maxWidth: 760, margin: '0 auto' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Hanken+Grotesk:wght@400;500;600;700&display=swap');`}</style>

      <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 34, fontWeight: 600, margin: '0 0 4px' }}>
        {settings.bakerName ? `${settings.bakerName}'s` : 'The'} <span style={{ fontStyle: 'italic', color: '#C8643C' }}>Bake</span> Book
      </h1>
      <p style={{ color: '#7A6452', fontSize: 14, marginBottom: 22 }}>
        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>

      {/* stat cards */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        {statCard('Active orders', active.length, '#C8643C', () => onNavigate('orders'))}
        {statCard('Due today', todayOrders.length, todayOrders.length > 0 ? '#B5394F' : '#33241A', () => onNavigate('orders'))}
        {statCard('Unpaid', unpaid.length, unpaid.length > 0 ? '#D9982E' : '#33241A', () => onNavigate('orders'))}
        {statCard('Overdue', overdue.length, overdue.length > 0 ? '#B5394F' : '#6F8C57', () => onNavigate('orders'))}
      </div>

      {/* today */}
      {todayOrders.length > 0 && (
        <div style={{ background: '#FFFDF8', border: '1px solid #E7D9C5', borderRadius: 18, padding: '14px 16px', marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#C8643C', marginBottom: 4 }}>Due today</div>
          {todayOrders.map(orderRow)}
        </div>
      )}

      {/* tomorrow */}
      {tomorrowOrders.length > 0 && (
        <div style={{ background: '#FFFDF8', border: '1px solid #E7D9C5', borderRadius: 18, padding: '14px 16px', marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#D9982E', marginBottom: 4 }}>Due tomorrow</div>
          {tomorrowOrders.map(orderRow)}
        </div>
      )}

      {/* this week */}
      {weekOrders.length > 0 && (
        <div style={{ background: '#FFFDF8', border: '1px solid #E7D9C5', borderRadius: 18, padding: '14px 16px', marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#7A6452', marginBottom: 4 }}>Later this week</div>
          {weekOrders.map(orderRow)}
        </div>
      )}

      {/* overdue */}
      {overdue.length > 0 && (
        <div style={{ background: '#FBE6E6', border: '1px solid #EBC6CB', borderRadius: 18, padding: '14px 16px', marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#B5394F', marginBottom: 4 }}>Past due</div>
          {overdue.map(orderRow)}
        </div>
      )}

      {active.length === 0 && (
        <div style={{ background: '#FFFDF8', border: '1px solid #E7D9C5', borderRadius: 18, padding: '40px 20px', textAlign: 'center', color: '#7A6452' }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 20, color: '#33241A', marginBottom: 6 }}>All clear!</div>
          <div>No active orders right now.</div>
        </div>
      )}
    </div>
  )
}