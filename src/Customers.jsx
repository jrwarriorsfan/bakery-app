import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [selected, setSelected] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', phone: '', notes: '' })
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    loadCustomers()
  }, [])

  const loadCustomers = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name', { ascending: true })
    if (!error) setCustomers(data)
    setLoading(false)
  }

  const loadOrders = async (customerId) => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', customerId)
      .order('due_date', { ascending: false })
    if (!error) setOrders(data)
  }

  const selectCustomer = (customer) => {
    setSelected(customer)
    loadOrders(customer.id)
  }

  const addCustomer = async () => {
    if (!form.name.trim()) return
    const { data, error } = await supabase
      .from('customers')
      .insert({ name: form.name, phone: form.phone, notes: form.notes })
      .select()
      .single()
    if (!error) {
      setCustomers(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setForm({ name: '', phone: '', notes: '' })
      setAdding(false)
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

  const initials = (name) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  const statusColors = {
    New: '#FBE6E6', Confirmed: '#E7EEF6', Baking: '#FCF0D9', Done: '#EEF4E7'
  }
  const statusText = {
    New: '#8E2433', Confirmed: '#2D4F77', Baking: '#8A5B12', Done: '#46612F'
  }

  return (
    <div style={{ fontFamily: 'Hanken Grotesk, sans-serif', padding: '22px 16px 60px', maxWidth: 760, margin: '0 auto' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Hanken+Grotesk:wght@400;500;600;700&display=swap');`}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 34, fontWeight: 600, margin: 0 }}>
          Customers
        </h1>
        <button onClick={() => setAdding(s => !s)} style={{ background: '#C8643C', color: '#fff', border: 'none', borderRadius: 11, padding: '10px 18px', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          {adding ? 'Cancel' : '+ Add customer'}
        </button>
      </div>
      <p style={{ color: '#7A6452', fontSize: 14, marginBottom: 22 }}>Tap a customer to see their order history.</p>

      {adding && (
        <div style={{ background: '#FFFDF8', border: '1px solid #E7D9C5', borderRadius: 18, padding: 18, marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 600, margin: '0 0 14px' }}>New customer</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#7A6452' }}>Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Maria" style={{ fontFamily: 'inherit', fontSize: 15, border: '1px solid #E7D9C5', borderRadius: 11, padding: '10px 12px', outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#7A6452' }}>Phone</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="555-0192" style={{ fontFamily: 'inherit', fontSize: 15, border: '1px solid #E7D9C5', borderRadius: 11, padding: '10px 12px', outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#7A6452' }}>Notes</label>
              <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="allergies, preferences..." style={{ fontFamily: 'inherit', fontSize: 15, border: '1px solid #E7D9C5', borderRadius: 11, padding: '10px 12px', outline: 'none' }} />
            </div>
          </div>
          <button onClick={addCustomer} style={{ marginTop: 14, background: '#C8643C', color: '#fff', border: 'none', borderRadius: 11, padding: '11px 18px', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            Save customer
          </button>
        </div>
      )}

      {loading ? (
        <p style={{ color: '#7A6452' }}>Loading...</p>
      ) : customers.length === 0 ? (
        <div style={{ background: '#FFFDF8', border: '1px solid #E7D9C5', borderRadius: 18, padding: '40px 20px', textAlign: 'center', color: '#7A6452' }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 20, color: '#33241A', marginBottom: 6 }}>No customers yet</div>
          <div>Add your first customer above.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {customers.map(c => (
            <div key={c.id}>
              <div onClick={() => selectCustomer(c)} style={{ background: '#FFFDF8', border: `1px solid ${selected?.id === c.id ? '#C8643C' : '#E7D9C5'}`, borderRadius: 18, padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#F4E9D8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, color: '#C8643C', flexShrink: 0 }}>
                  {initials(c.name)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{c.name}</div>
                  {c.phone && <div style={{ fontSize: 13, color: '#7A6452' }}>{c.phone}</div>}
                  {c.notes && <div style={{ fontSize: 13, color: '#7A6452', fontStyle: 'italic' }}>{c.notes}</div>}
                </div>
                <button onClick={e => { e.stopPropagation(); deleteCustomer(c.id) }} style={{ background: 'transparent', border: 'none', color: '#7A6452', cursor: 'pointer', fontSize: 16, padding: '4px 8px', borderRadius: 8 }}>✕</button>
              </div>

              {selected?.id === c.id && (
                <div style={{ background: '#FBF4E9', border: '1px solid #E7D9C5', borderTop: 'none', borderRadius: '0 0 18px 18px', padding: '14px 16px' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#7A6452', marginBottom: 10 }}>Order history</div>
                  {orders.length === 0 ? (
                    <div style={{ fontSize: 14, color: '#7A6452', fontStyle: 'italic' }}>No orders linked to this customer yet.</div>
                  ) : (
                    orders.map(o => (
                      <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid #E7D9C5' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{o.qty}× {o.item}</div>
                          <div style={{ fontSize: 13, color: '#7A6452' }}>
                            {new Date(o.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                          {o.notes && <div style={{ fontSize: 13, color: '#7A6452', fontStyle: 'italic' }}>{o.notes}</div>}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 50, background: statusColors[o.status], color: statusText[o.status] }}>{o.status}</span>
                      </div>
                    ))
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