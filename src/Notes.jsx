import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export default function Notes() {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')

  useEffect(() => {
    loadNotes()
  }, [])

  const loadNotes = async () => {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
    if (!error) setNotes(data)
    setLoading(false)
  }

  const addNote = async () => {
  if (!input.trim()) return
  const { data, error } = await supabase
    .from('notes')
    .insert({ content: input })
    .select()
    .single()
  if (!error) {
    setNotes(prev =>
      [data, ...prev].sort((a, b) => b.pinned - a.pinned || new Date(b.created_at) - new Date(a.created_at))
    )
    setInput('')
  }
}

  const togglePin = async (note) => {
    const { error } = await supabase
      .from('notes')
      .update({ pinned: !note.pinned })
      .eq('id', note.id)
    if (!error) {
      setNotes(prev =>
        [...prev.map(n => n.id === note.id ? { ...n, pinned: !n.pinned } : n)]
          .sort((a, b) => b.pinned - a.pinned || new Date(b.created_at) - new Date(a.created_at))
      )
    }
  }

  const deleteNote = async (id) => {
    const { error } = await supabase.from('notes').delete().eq('id', id)
    if (!error) setNotes(prev => prev.filter(n => n.id !== id))
  }

  const fmtDate = (s) => new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

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
      <p style={{ color: '#7A6452', fontSize: 14, marginBottom: 22 }}>Reminders, shopping lists, anything on your mind.</p>

      {/* input */}
      <div style={{ background: '#FFFDF8', border: '1px solid #E7D9C5', borderRadius: 18, padding: 18, marginBottom: 24 }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addNote() } }}
          placeholder="Need more vanilla extract, call Maria about her order, don't forget the birthday cake for Saturday..."
          style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: 15, border: '1px solid #E7D9C5', borderRadius: 11, padding: '10px 12px', outline: 'none', resize: 'vertical', minHeight: 80, color: '#33241A', background: '#fff' }}
        />
        <button
          onClick={addNote}
          style={{ marginTop: 10, background: '#C8643C', color: '#fff', border: 'none', borderRadius: 11, padding: '10px 18px', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
        >
          Add note
        </button>
      </div>

      {loading ? (
        <p style={{ color: '#7A6452' }}>Loading...</p>
      ) : notes.length === 0 ? (
        <div style={{ background: '#FFFDF8', border: '1px solid #E7D9C5', borderRadius: 18, padding: '40px 20px', textAlign: 'center', color: '#7A6452' }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 20, color: '#33241A', marginBottom: 6 }}>Nothing here yet</div>
          <div>Add your first note above.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {notes.map(n => (
            <div key={n.id} style={{ background: n.pinned ? '#FEF3C7' : '#FFFDF8', border: `1px solid ${n.pinned ? '#D9982E' : '#E7D9C5'}`, borderRadius: 14, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start', animation: 'popIn 0.25s ease forwards' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, color: '#33241A', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{n.content}</div>
                <div style={{ fontSize: 12, color: '#7A6452', marginTop: 6 }}>{fmtDate(n.created_at)}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button
                  onClick={() => togglePin(n)}
                  title={n.pinned ? 'Unpin' : 'Pin'}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 16, padding: '4px 6px', borderRadius: 8, color: n.pinned ? '#D9982E' : '#7A6452' }}
                >
                  📌
                </button>
                <button
                  onClick={() => deleteNote(n.id)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 15, padding: '4px 6px', borderRadius: 8, color: '#7A6452' }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}