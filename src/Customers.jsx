import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const COLORS = [
  '#C8643C', '#B5394F', '#6F8C57', '#4A7FA5', '#8B5E9E',
  '#D9982E', '#3D8C7A', '#C45B8A', '#5B7EC4', '#A06040'
]

const getColor = () => COLORS[Math.floor(Math.random() * COLORS.length)]

const initials = (name) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

const fmtDate = (s) => {
  if (!s) return ''
  return new Date(s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const statusColors = { New: '#FBE6E6', Confirmed: '#E7EEF6', Baking: '#FCF0D9', Done: '#EEF4E7' }
const statusText = { New: '#8E2433', Confirmed: '#2D4F77', Baking: '#8A5B12', Done: '#46612F' }

export default function Customers({ onNavigate }) {
  const [customers, setCustomers] = useState([])
  const [selected, setSelected] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(false)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ name: '', phone: '', notes: '', favorite_items: '' })

  useEffect(() => { loadCustomers() }, [])

  const loadCustomers = async () => {
    const { data, error } = await supabase.from('customers').select('*').order('name')
    if (!error) setCustomers(data)
    setLoading(false)
  }

const loadOrders = async (customerId) => {
  const { data: ordersData, error } = await supabase
    .from('orders').select('*').eq('customer_id', customerId).order('due_date', { ascending: false })
  if (error) return

  const orderIds = ordersData.map(o => o.id)
  const { data: itemsData } = orderIds.length > 0
    ? await supabase.from('order_items').select('*').in('order_id', orderIds)
    : { data: [] }

  const merged = ordersData.map(o => ({
    ...o,
    items: itemsData.filter(it => it.order_id === o.id),
  }))
  setOrders(merged)
}

const duplicateOrder = async (order) => {
  const { data: newOrder, error } = await supabase
    .from('orders')
    .insert({
      customer_name: order.customer_name,
      contact: order.contact,
      customer_id: order.customer_id || null,
      due_date: todayStr(),
      notes: order.notes,
      status: 'New',
      paid: false,
      price: order.price,
      inspiration_photo_url: order.inspiration_photo_url,
    })
    .select()
    .single()
  if (error) { console.log('duplicate error:', JSON.stringify(error)); return }

  if (order.items && order.items.length > 0) {
    await supabase.from('order_items').insert(
      order.items.map(it => ({
        order_id: newOrder.id,
        item_name: it.item_name,
        quantity: it.quantity,
        recipe_id: it.recipe_id,
        subcategory_id: it.subcategory_id,
        option_id: it.option_id,
        cake_build_id: it.cake_build_id,
        notes: it.notes,
      }))
    )
  }

  const { data: supplies } = await supabase.from('order_supplies').select('*').eq('order_id', order.id)
  if (supplies && supplies.length > 0) {
    await supabase.from('order_supplies').insert(
      supplies.map(s => ({ order_id: newOrder.id, supply_name: s.supply_name, quantity: s.quantity }))
    )
  }

  loadOrders(selected.id)
  if (onNavigate) onNavigate('orders')
}

  const [allOrders, setAllOrders] = useState([])

  useEffect(() => {
    supabase.from('orders').select('*').then(({ data }) => {
      if (data) setAllOrders(data)
    })
  }, [])

  const lifetimeSpend = (customerId) => {
    return allOrders
      .filter(o => o.customer_id === customerId && o.paid && o.price)
      .reduce((sum, o) => sum + Number(o.price), 0)
  }

  const selectCustomer = (customer) => {
    if (selected?.id === customer.id) {
      setSelected(null)
      setOrders([])
      setEditing(false)
    } else {
      setSelected(customer)
      setEditing(false)
      loadOrders(customer.id)
    }
  }

  const addCustomer = async () => {
    if (!form.name.trim()) return
    const color = getColor()
    const { data, error } = await supabase
      .from('customers')
      .insert({ name: form.name, phone: form.phone, notes: form.notes, favorite_items: form.favorite_items, color })
      .select().single()
    if (!error) {
      setCustomers(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setForm({ name: '', phone: '', notes: '', favorite_items: '' })
      setAdding(false)
    }
  }

  const saveEdit = async () => {
    if (!form.name.trim()) return
    const { error } = await supabase
      .from('customers')
      .update({ name: form.name, phone: form.phone, notes: form.notes, favorite_items: form.favorite_items })
      .eq('id', selected.id)
    if (!error) {
      const updated = { ...selected, ...form }
      setCustomers(prev => prev.map(c => c.id === selected.id ? updated : c).sort((a, b) => a.name.localeCompare(b.name)))
      setSelected(updated)
      setEditing(false)
    }
  }

  const toggleFavorite = async (customer) => {
    const { error } = await supabase
      .from('customers').update({ favorite: !customer.favorite }).eq('id', customer.id)
    if (!error) {
      const updated = { ...customer, favorite: !customer.favorite }
      setCustomers(prev => prev.map(c => c.id === customer.id ? updated : c))
      if (selected?.id === customer.id) setSelected(updated)
    }
  }

  const deleteCustomer = async (id) => {
    if (!confirm('Delete this customer?')) return
    const { error } = await supabase.from('customers').delete().eq('id', id)
    if (!error) {
      setCustomers(prev => prev.filter(c => c.id !== id))
      if (selected?.id === id) { setSelected(null); setOrders([]) }
    }
  }

  const todayStr = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  const favorites = customers.filter(c => c.favorite)
  const filtered = customers.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.toLowerCase().includes(search.toLowerCase())
  )

  const avatarStyle = (c, size = 44) => ({
    width: size, height: size, borderRadius: '50%',
    background: c.color || '#C8643C',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: size * 0.33, color: '#fff', flexShrink: 0
  })

  const formFields = (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      {[
        { label: 'Name', key: 'name', placeholder: 'Maria', full: true },
        { label: 'Phone', key: 'phone', placeholder: '555-0192' },
        { label: 'Favorite items', key: 'favorite_items', placeholder: 'chocolate chip cookies, tres leches...' },
        { label: 'Notes', key: 'notes', placeholder: 'allergies, preferences...', full: true },
      ].map(f => (
        <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 5, gridColumn: f.full ? '1 / -1' : 'auto' }}>
          <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#7A6452' }}>{f.label}</label>
          <input
            value={form[f.key]}
            onChange={e => setForm({ ...form, [f.key]: e.target.value })}
            placeholder={f.placeholder}
            style={{ fontFamily: 'inherit', fontSize: 15, border: '1px solid #E7D9C5', borderRadius: 11, padding: '10px 12px', outline: 'none' }}
          />
        </div>
      ))}
    </div>
  )

  return (
    <div style={{ fontFamily: 'Hanken Grotesk, sans-serif', padding: '22px 16px 60px', maxWidth: 760, margin: '0 auto' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Hanken+Grotesk:wght@400;500;600;700&display=swap');
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.95); }
          60% { transform: scale(1.02); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h1 style={{ fontFamily: 'Amatic SC, sans-serif', fontWeight: 700, fontSize: 48, color: 'var(--ink)', margin: 0, lineHeight: 0.9 }}>Customers</h1>
        <button onClick={() => { setAdding(s => !s); setSelected(null) }} style={{ background: '#C8643C', color: '#fff', border: 'none', borderRadius: 11, padding: '10px 18px', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          {adding ? 'Cancel' : '+ Add customer'}
        </button>
      </div>
      <p style={{ fontFamily: 'Pacifico, cursive', fontSize: 14, color: 'var(--ink-soft)', marginBottom: 18 }}>the people you bake for</p>

      {/* add form */}
      {adding && (
        <div style={{ background: '#FFFDF8', border: '1px solid #E7D9C5', borderRadius: 18, padding: 18, marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 600, margin: '0 0 14px' }}>New customer</h2>
          {formFields}
          <button onClick={addCustomer} style={{ marginTop: 14, background: '#C8643C', color: '#fff', border: 'none', borderRadius: 11, padding: '11px 18px', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            Save customer
          </button>
        </div>
      )}

      {/* favorites row */}
      {favorites.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#7A6452', marginBottom: 12 }}>Favorites</div>
          <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8, paddingTop: 4, paddingLeft: 4, paddingRight: 4 }}>
            {favorites.map(c => (
              <div key={c.id} onClick={() => selectCustomer(c)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', minWidth: 56 }}>
                <div style={{ ...avatarStyle(c, 56), boxShadow: selected?.id === c.id ? `0 0 0 3px ${c.color || '#C8643C'}` : 'none' }}>
                  {initials(c.name)}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#33241A', textAlign: 'center', maxWidth: 56, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name.split(' ')[0]}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* search */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search customers..."
        style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: 15, border: '1px solid #E7D9C5', borderRadius: 12, padding: '10px 14px', outline: 'none', background: '#FFFDF8', color: '#33241A', marginBottom: 14 }}
      />

      {loading ? (
        <p style={{ color: '#7A6452' }}>Loading...</p>
      ) : filtered.length === 0 ? (
        <div style={{ background: '#FFFDF8', border: '1px solid #E7D9C5', borderRadius: 18, padding: '40px 20px', textAlign: 'center', color: '#7A6452' }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 20, color: '#33241A', marginBottom: 6 }}>No customers yet</div>
          <div>Add your first customer above.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(c => (
            <div key={c.id}>
              {/* customer card */}
              <div onClick={() => selectCustomer(c)} style={{ background: '#FFFDF8', border: `1px solid ${selected?.id === c.id ? c.color || '#C8643C' : '#E7D9C5'}`, borderRadius: selected?.id === c.id ? '18px 18px 0 0' : 18, padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, animation: 'popIn 0.25s ease forwards' }}>
                <div style={avatarStyle(c)}>{initials(c.name)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {c.name}
                    {c.favorite && <span style={{ fontSize: 14 }}>⭐</span>}
                  </div>
                  {c.phone && <div style={{ fontSize: 13, color: '#7A6452' }}>{c.phone}</div>}
                  {c.favorite_items && <div style={{ fontSize: 13, color: '#7A6452', fontStyle: 'italic' }}>Loves: {c.favorite_items}</div>}
                </div>
                <button onClick={e => { e.stopPropagation(); deleteCustomer(c.id) }} style={{ background: 'transparent', border: 'none', color: '#7A6452', cursor: 'pointer', fontSize: 16, padding: '4px 8px', borderRadius: 8 }}>✕</button>
              </div>

              {/* expanded detail */}
              {selected?.id === c.id && (
                <div style={{ background: '#FBF4E9', border: `1px solid ${c.color || '#C8643C'}`, borderTop: 'none', borderRadius: '0 0 18px 18px', padding: '16px 16px 18px' }}>

                  {editing ? (
                    <>
                      {formFields}
                      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                        <button onClick={saveEdit} style={{ background: '#C8643C', color: '#fff', border: 'none', borderRadius: 11, padding: '10px 16px', fontFamily: 'inherit', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Save</button>
                        <button onClick={() => setEditing(false)} style={{ background: 'transparent', border: '1px solid #E7D9C5', borderRadius: 11, padding: '10px 16px', fontFamily: 'inherit', fontWeight: 700, fontSize: 13, cursor: 'pointer', color: '#7A6452' }}>Cancel</button>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* action buttons */}
                      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                        <button
                          onClick={() => { setEditing(true); setForm({ name: c.name, phone: c.phone || '', notes: c.notes || '', favorite_items: c.favorite_items || '' }) }}
                          style={{ background: '#FFFDF8', border: '1px solid #E7D9C5', borderRadius: 9, padding: '7px 14px', fontFamily: 'inherit', fontWeight: 700, fontSize: 12, cursor: 'pointer', color: '#33241A' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleFavorite(c)}
                          style={{ background: c.favorite ? '#FEF3C7' : '#FFFDF8', border: `1px solid ${c.favorite ? '#D9982E' : '#E7D9C5'}`, borderRadius: 9, padding: '7px 14px', fontFamily: 'inherit', fontWeight: 700, fontSize: 12, cursor: 'pointer', color: c.favorite ? '#D9982E' : '#7A6452' }}
                        >
                          {c.favorite ? '⭐ Favorited' : '☆ Add to favorites'}
                        </button>
                      </div>

                      {c.notes && (
                        <div style={{ fontSize: 13, color: '#7A6452', fontStyle: 'italic', marginBottom: 12, padding: '10px 12px', background: '#FFFDF8', borderRadius: 10 }}>{c.notes}</div>
                      )}

                      {lifetimeSpend(c.id) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, padding: '12px 14px', background: '#EAF3DE', borderRadius: 12 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#27500A' }}>Lifetime spend</span>
                          <span style={{ fontSize: 18, fontFamily: 'Fraunces, serif', fontWeight: 600, color: '#27500A' }}>${lifetimeSpend(c.id).toFixed(2)}</span>
                        </div>
                      )}

                      {/* order history */}
                      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#7A6452', marginBottom: 8 }}>Order history</div>
                      {orders.length === 0 ? (
                        <div style={{ fontSize: 14, color: '#7A6452', fontStyle: 'italic' }}>No orders linked yet.</div>
                      ) : (
                        orders.map(o => (
                          <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid #E7D9C5' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: 14 }}>
                                {o.items && o.items.length > 0
                                  ? o.items.map(it => `${it.quantity}× ${it.item_name}`).join(', ')
                                  : '—'}
                              </div>
                              <div style={{ fontSize: 13, color: '#7A6452' }}>{fmtDate(o.due_date)}</div>
                              {o.notes && <div style={{ fontSize: 13, color: '#7A6452', fontStyle: 'italic' }}>{o.notes}</div>}
                            </div>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 50, background: o.paid ? '#EEF4E7' : '#F4E9D8', color: o.paid ? '#46612F' : '#7A6452' }}>{o.paid ? 'Paid' : 'Unpaid'}</span>
                              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 50, background: statusColors[o.status], color: statusText[o.status] }}>{o.status}</span>
                              <button onClick={() => duplicateOrder(o)} title="Duplicate this order" style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14, color: '#7A6452', padding: '2px 4px' }}>⧉</button>
                            </div>
                          </div>
                        ))
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}