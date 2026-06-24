import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import SectionDivider from './SectionDivider.jsx'

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
const fmtLong = (s) => new Date(s + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

const SHORTCUTS = [
  { key: 'recipes', label: 'Recipes', icon: '📖' },
  { key: 'cakebuilder', label: 'Cake Builder', icon: '🎂' },
  { key: 'customers', label: 'Customers', icon: '👥' },
  { key: 'projects', label: 'Projects', icon: '🖼️' },
  { key: 'notes', label: 'Notes', icon: '📝' },
]

export default function Dashboard({ onNavigate }) {
  const [orders, setOrders] = useState([])
  const [settings, setSettings] = useState({ bakerName: '', dailyCapacity: 3 })
  const [loading, setLoading] = useState(true)

  const [subcategories, setSubcategories] = useState([])
  const [subcategoryOptions, setSubcategoryOptions] = useState([])

  const [pinnedNotes, setPinnedNotes] = useState([])
  const [recentProject, setRecentProject] = useState(null)

  const [viewOrder, setViewOrder] = useState(null)
  const [viewPhoto, setViewPhoto] = useState(null)
  const [orderSupplies, setOrderSupplies] = useState([])
  const [cakeBuilds, setCakeBuilds] = useState({})

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()

      const [ordersRes, itemsRes, settingsRes, subRes, optRes, notesRes, projectsRes] = await Promise.all([
        supabase.from('orders').select('*').order('due_date', { ascending: true }),
        supabase.from('order_items').select('*'),
        supabase.from('settings').select('*').eq('user_id', user.id).single(),
        supabase.from('subcategories').select('*'),
        supabase.from('subcategory_options').select('*'),
        supabase.from('notes').select('*').eq('pinned', true).order('created_at', { ascending: false }),
        supabase.from('projects').select('*').order('created_at', { ascending: false }).limit(1),
      ])

      if (ordersRes.data) {
        const mapped = ordersRes.data.map(o => ({
          id: o.id,
          customer: o.customer_name,
          contact: o.contact,
          customer_id: o.customer_id,
          due_date: o.due_date,
          notes: o.notes,
          status: o.status,
          paid: o.paid,
          price: o.price,
          inspiration_photo_url: o.inspiration_photo_url,
          items: (itemsRes.data || []).filter(it => it.order_id === o.id),
        }))
        setOrders(mapped)
      }
      if (settingsRes.data) setSettings({ bakerName: settingsRes.data.baker_name || '', dailyCapacity: settingsRes.data.daily_capacity || 3 })
      if (subRes.data) setSubcategories(subRes.data)
      if (optRes.data) setSubcategoryOptions(optRes.data)
      if (notesRes.data) setPinnedNotes(notesRes.data)
      if (projectsRes.data && projectsRes.data.length > 0) setRecentProject(projectsRes.data[0])

      setLoading(false)
    })()
  }, [])

  const loadOrderSupplies = async (orderId) => {
    const { data } = await supabase.from('order_supplies').select('*').eq('order_id', orderId)
    if (data) setOrderSupplies(data)
  }

  const loadCakeBuilds = async (order) => {
    const buildIds = order.items.map(it => it.cake_build_id).filter(Boolean)
    if (buildIds.length === 0) { setCakeBuilds({}); return }
    const { data: builds } = await supabase.from('cake_builds').select('*').in('id', buildIds)
    const { data: tiers } = await supabase.from('cake_tiers').select('*').in('build_id', buildIds).order('tier_order')
    const map = {}
    buildIds.forEach(id => {
      const build = builds?.find(b => b.id === id)
      const buildTiers = tiers?.filter(t => t.build_id === id) || []
      if (build) map[id] = { ...build, tiers: buildTiers }
    })
    setCakeBuilds(map)
  }

  const openOrder = (o) => {
    setViewOrder(o)
    loadOrderSupplies(o.id)
    loadCakeBuilds(o)
  }

  const today = todayStr()
  const tom = tomorrow()
  const week = weekEnd()
  const thisMonth = new Date().toISOString().slice(0, 7)

  const active = orders.filter(o => o.status !== 'Done')
  const todayOrders = active.filter(o => o.due_date === today)
  const tomorrowOrders = active.filter(o => o.due_date === tom)
  const weekOrders = active.filter(o => o.due_date > today && o.due_date <= week)
  const unpaid = active.filter(o => !o.paid)
  const overdue = active.filter(o => o.due_date < today)

  const monthlyRevenue = orders
    .filter(o => o.paid && o.price && o.due_date?.startsWith(thisMonth))
    .reduce((sum, o) => sum + Number(o.price), 0)

  // unique customers with unpaid orders
  const unpaidCustomers = Array.from(
    new Map(
      unpaid
        .filter(o => o.customer)
        .map(o => [o.customer_id || o.customer, { name: o.customer, count: unpaid.filter(u => (u.customer_id || u.customer) === (o.customer_id || o.customer)).length }])
    ).values()
  )

  const itemSummary = (order) =>
    order.items.map(it => `${it.quantity}× ${it.item_name}`).join(', ')

  const statCard = (label, value, color, onClick) => (
    <div onClick={onClick} style={{ background: '#FFFDF8', border: '1px solid #E7D9C5', borderRadius: 16, padding: '16px 18px', cursor: onClick ? 'pointer' : 'default', flex: 1 }}>
      <div style={{ fontSize: 28, fontFamily: 'Fraunces, serif', fontWeight: 600, color: color || '#33241A' }}>{value}</div>
      <div style={{ fontSize: 13, color: '#7A6452', marginTop: 2 }}>{label}</div>
    </div>
  )

  const orderRow = (o) => (
    <div key={o.id} onClick={() => openOrder(o)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderTop: '1px solid #E7D9C5', cursor: 'pointer' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{itemSummary(o) || '—'}</div>
        <div style={{ fontSize: 13, color: '#7A6452' }}>{o.customer} · {fmtDate(o.due_date)}</div>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 50, background: o.paid ? '#EEF4E7' : '#F4E9D8', color: o.paid ? '#46612F' : '#7A6452' }}>{o.paid ? 'Paid' : 'Unpaid'}</span>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 50, background: { New: '#FBE6E6', Confirmed: '#E7EEF6', Baking: '#FCF0D9', Done: '#EEF4E7' }[o.status], color: { New: '#8E2433', Confirmed: '#2D4F77', Baking: '#8A5B12', Done: '#46612F' }[o.status] }}>{o.status}</span>
      </div>
    </div>
  )

  const sectionCard = (label, color, list) => list.length > 0 && (
    <div style={{ background: '#FFFCF6', border: '1px solid #D9CCB8', borderRadius: 18, padding: '14px 16px', marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color, marginBottom: 4 }}>{label}</div>
      {list.map(orderRow)}
    </div>
  )

  if (loading) return <div style={{ padding: 40, fontFamily: 'Hanken Grotesk, sans-serif', color: '#7A6452' }}>Loading...</div>

  return (
    <div style={{ fontFamily: 'Hanken Grotesk, sans-serif', padding: '22px 16px 60px', maxWidth: 760, margin: '0 auto' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Hanken+Grotesk:wght@400;500;600;700&display=swap');
        .shortcut-tile { background: #FFFDF8; border: 1px solid #E7D9C5; border-radius: 14px; padding: '14px 10px'; display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; flex: 1; min-width: 78px; }
        .shortcut-tile:active { transform: scale(0.97); }
      `}</style>

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

      {/* order sections */}
      {sectionCard('Due today', '#C8643C', todayOrders)}
      {sectionCard('Due tomorrow', '#D9982E', tomorrowOrders)}
      {sectionCard('Later this week', '#7A6452', weekOrders)}
      {sectionCard('Past due', '#B5394F', overdue)}

      {active.length === 0 && (
        <div style={{ background: '#FFFDF8', border: '1px solid #E7D9C5', borderRadius: 18, padding: '40px 20px', textAlign: 'center', color: '#7A6452', marginBottom: 14 }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 20, color: '#33241A', marginBottom: 6 }}>All clear!</div>
          <div>No active orders right now.</div>
        </div>
      )}

      <SectionDivider />

      {/* shortcuts row */}
      <div style={{ marginTop: 28, marginBottom: 22 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#7A6452', marginBottom: 10 }}>Jump to</div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {SHORTCUTS.map(s => (
            <div key={s.key} className="shortcut-tile" onClick={() => onNavigate(s.key)} style={{ padding: '14px 10px' }}>
              <div style={{ fontSize: 24 }}>{s.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#33241A', textAlign: 'center' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* widgets */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* revenue */}
        <div onClick={() => onNavigate('orders')} style={{ background: '#FFFDF8', border: '1px solid #E7D9C5', borderRadius: 18, padding: '16px 18px', cursor: 'pointer' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#7A6452', marginBottom: 6 }}>Revenue this month</div>
          <div style={{ fontSize: 28, fontFamily: 'Fraunces, serif', fontWeight: 600, color: '#6F8C57' }}>${monthlyRevenue.toFixed(2)}</div>
        </div>

        {/* pinned notes */}
        {pinnedNotes.length > 0 && (
          <div onClick={() => onNavigate('notes')} style={{ background: '#FEF3C7', border: '1px solid #D9982E', borderRadius: 18, padding: '16px 18px', cursor: 'pointer' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#D9982E', marginBottom: 8 }}>📌 Pinned notes</div>
            {pinnedNotes.slice(0, 3).map(n => (
              <div key={n.id} style={{ fontSize: 14, color: '#33241A', padding: '6px 0', borderTop: '1px solid rgba(217,152,46,0.25)' }}>{n.content}</div>
            ))}
          </div>
        )}

        {/* customers with unpaid orders */}
        {unpaidCustomers.length > 0 && (
          <div onClick={() => onNavigate('customers')} style={{ background: '#FFFDF8', border: '1px solid #E7D9C5', borderRadius: 18, padding: '16px 18px', cursor: 'pointer' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#7A6452', marginBottom: 8 }}>Customers with unpaid orders</div>
            {unpaidCustomers.slice(0, 5).map((c, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '6px 0', borderTop: '1px solid #E7D9C5' }}>
                <span>{c.name}</span>
                <span style={{ color: '#7A6452' }}>{c.count} order{c.count > 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
        )}

        {/* recent project */}
        {recentProject && (
          <div onClick={() => onNavigate('projects')} style={{ background: '#FFFDF8', border: '1px solid #E7D9C5', borderRadius: 18, overflow: 'hidden', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, padding: 14 }}>
            {recentProject.photo_url ? (
              <img src={recentProject.photo_url} alt={recentProject.item_name} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }} />
            ) : (
              <div style={{ width: 56, height: 56, borderRadius: 10, background: '#F4E9D8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🎂</div>
            )}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#7A6452', marginBottom: 2 }}>Most recent project</div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{recentProject.item_name}</div>
            </div>
          </div>
        )}
      </div>

      {/* full screen photo viewer */}
      {viewPhoto && (
        <div onClick={() => setViewPhoto(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(51,36,26,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, cursor: 'pointer' }}>
          <img src={viewPhoto} alt="inspiration full" style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: 12, objectFit: 'contain' }} />
        </div>
      )}

      {/* order detail modal */}
      {viewOrder && (
        <div onClick={() => setViewOrder(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(51,36,26,0.6)', zIndex: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#FFFDF8', borderRadius: 20, maxWidth: 480, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
            {viewOrder.inspiration_photo_url && (
              <img src={viewOrder.inspiration_photo_url} alt="inspiration" style={{ width: '100%', maxHeight: 260, objectFit: 'cover', borderRadius: '20px 20px 0 0', cursor: 'pointer' }} onClick={() => setViewPhoto(viewOrder.inspiration_photo_url)} />
            )}
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 600 }}>{viewOrder.customer || 'Order'}</div>
                <button onClick={() => setViewOrder(null)} style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', color: '#7A6452' }}>✕</button>
              </div>
              <div style={{ fontSize: 14, color: '#7A6452', marginBottom: 4 }}>{viewOrder.contact || ''}</div>
              <div style={{ fontSize: 13, color: '#7A6452', marginBottom: 14 }}>{fmtLong(viewOrder.due_date)}</div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#7A6452', marginBottom: 8 }}>Items</div>
                {viewOrder.items.map(it => {
                  const sub = subcategories.find(s => s.id === it.subcategory_id)
                  const opt = subcategoryOptions.find(o => o.id === it.option_id)
                  const build = it.cake_build_id ? cakeBuilds[it.cake_build_id] : null
                  return (
                    <div key={it.id} style={{ display: 'flex', flexDirection: 'column', padding: '8px 0', borderTop: '1px solid #E7D9C5', fontSize: 14 }}>
                      <span style={{ fontWeight: 600 }}>{it.quantity}× {it.item_name}</span>
                      {(sub || opt) && <span style={{ fontSize: 12, color: '#7A6452' }}>{[sub?.name, opt?.label].filter(Boolean).join(' · ')}</span>}
                      {it.notes && <span style={{ fontSize: 12, color: '#7A6452', fontStyle: 'italic', marginTop: 2 }}>{it.notes}</span>}

                      {build && (
                        <div style={{ marginTop: 8, background: '#FBF4E9', borderRadius: 10, padding: 10 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#C8643C', marginBottom: 6 }}>🎂 Custom cake design</div>
                          {build.tiers.map(t => (
                            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                              <div style={{ width: 16, height: 16, borderRadius: 4, background: t.color, flexShrink: 0 }} />
                              <span style={{ fontSize: 13 }}>Tier {t.tier_order}: {t.size || '—'}{t.flavor ? `, ${t.flavor}` : ''}</span>
                            </div>
                          ))}
                          {build.toppers && <div style={{ fontSize: 13, marginTop: 6 }}><strong>Toppers:</strong> {build.toppers}</div>}
                          {build.message && <div style={{ fontSize: 13, marginTop: 2 }}><strong>Message:</strong> "{build.message}"</div>}
                          {build.notes && <div style={{ fontSize: 13, marginTop: 2, fontStyle: 'italic', color: '#7A6452' }}>{build.notes}</div>}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {viewOrder.notes && (
                <div style={{ fontSize: 14, color: '#7A6452', fontStyle: 'italic', padding: 12, background: '#FBF4E9', borderRadius: 10, marginBottom: 14 }}>{viewOrder.notes}</div>
              )}

              {orderSupplies.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#7A6452', marginBottom: 8 }}>Supplies needed</div>
                  {orderSupplies.map(s => (
                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid #E7D9C5', fontSize: 14 }}>
                      <span>{s.supply_name}</span>
                      {s.quantity && <span style={{ color: '#7A6452' }}>{s.quantity}</span>}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 50, background: viewOrder.paid ? '#EEF4E7' : '#F4E9D8', color: viewOrder.paid ? '#46612F' : '#7A6452' }}>{viewOrder.paid ? 'Paid' : 'Unpaid'}</span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 50, background: { New: '#FBE6E6', Confirmed: '#E7EEF6', Baking: '#FCF0D9', Done: '#EEF4E7' }[viewOrder.status], color: { New: '#8E2433', Confirmed: '#2D4F77', Baking: '#8A5B12', Done: '#46612F' }[viewOrder.status] }}>{viewOrder.status}</span>
                {viewOrder.price && <span style={{ fontSize: 13, color: '#7A6452', alignSelf: 'center' }}>${Number(viewOrder.price).toFixed(2)}</span>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}