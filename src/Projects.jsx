import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'

export default function Projects() {
  const [projects, setProjects] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({ item_name: '', customer_name: '', project_date: '', notes: '' })
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const fileRef = useRef()

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    const { data, error } = await supabase.from('projects').select('*').order('project_date', { ascending: false })
    if (!error) setProjects(data)
    setLoading(false)
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const saveProject = async () => {
  if (!form.item_name.trim()) return
  setUploading(true)

  let photo_url = null

  if (photoFile) {
    const ext = photoFile.name.split('.').pop()
    const fileName = `${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('project-photos')
      .upload(fileName, photoFile)
    if (uploadError) {
      console.log('upload error:', JSON.stringify(uploadError))
    } else {
      const { data } = supabase.storage.from('project-photos').getPublicUrl(fileName)
      photo_url = data.publicUrl
      console.log('photo url:', photo_url)
    }
  }

  const { data, error } = await supabase
    .from('projects')
    .insert({
      item_name: form.item_name,
      customer_name: form.customer_name,
      project_date: form.project_date || null,
      notes: form.notes,
      photo_url,
    })
    .select()
    .single()

  if (!error) {
    setProjects(prev => [data, ...prev])
    setForm({ item_name: '', customer_name: '', project_date: '', notes: '' })
    setPhotoFile(null)
    setPhotoPreview(null)
    setAdding(false)
  }

  setUploading(false)
}

  const deleteProject = async (id, photo_url) => {
    if (!confirm('Delete this project?')) return
    if (photo_url) {
      const fileName = photo_url.split('/').pop()
      await supabase.storage.from('project-photos').remove([fileName])
    }
    await supabase.from('projects').delete().eq('id', id)
    setProjects(prev => prev.filter(p => p.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  const fmt = (date) => {
    if (!date) return ''
    return new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div style={{ fontFamily: 'Hanken Grotesk, sans-serif', padding: '22px 16px 60px', maxWidth: 760, margin: '0 auto' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Hanken+Grotesk:wght@400;500;600;700&display=swap');
        .photo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .photo-card { position: relative; aspect-ratio: 1; border-radius: 12px; overflow: hidden; cursor: pointer; background: #F4E9D8; }
        .photo-card img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .photo-card .overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(51,36,26,0.7) 0%, transparent 50%); opacity: 0; transition: opacity 0.2s; display: flex; align-items: flex-end; padding: 8px; }
        .photo-card:hover .overlay { opacity: 1; }
        .photo-card .overlay span { color: #fff; font-size: 12px; font-weight: 600; line-height: 1.3; }
        .no-photo { display: flex; align-items: center; justify-content: center; font-size: 28px; }
        .modal-bg { position: fixed; inset: 0; background: rgba(51,36,26,0.6); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal { background: #FFFDF8; border-radius: 20px; max-width: 800px; width: 100%; max-height: 90vh; overflow-y: auto; display: flex; flex-direction: row; }
        .modal img { width: 55%; border-radius: 20px 0 0 20px; object-fit: cover; max-height: 90vh; }
        .modal-details { flex: 1; padding: 24px; display: flex; flex-direction: column; justify-content: space-between; }
        @media(max-width: 600px) { .modal { flex-direction: column; } .modal img { width: 100%; border-radius: 20px 20px 0 0; max-height: 260px; } .modal-details { padding: 16px; } }
        `}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 34, fontWeight: 600, margin: 0 }}>
          Projects
        </h1>
        <button onClick={() => setAdding(s => !s)} style={{ background: '#C8643C', color: '#fff', border: 'none', borderRadius: 11, padding: '10px 18px', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          {adding ? 'Cancel' : '+ Add project'}
        </button>
      </div>
      <p style={{ color: '#7A6452', fontSize: 14, marginBottom: 22 }}>A gallery of your past work.</p>

      {adding && (
        <div style={{ background: '#FFFDF8', border: '1px solid #E7D9C5', borderRadius: 18, padding: 18, marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 600, margin: '0 0 14px' }}>New project</h2>

          <div style={{ marginBottom: 14 }}>
            <div
              onClick={() => fileRef.current.click()}
              style={{ border: '2px dashed #E7D9C5', borderRadius: 14, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', background: '#FBF4E9' }}
            >
              {photoPreview
                ? <img src={photoPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ textAlign: 'center', color: '#7A6452' }}>
                    <div style={{ fontSize: 32, marginBottom: 6 }}>📷</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Tap to add a photo</div>
                  </div>
              }
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#7A6452' }}>What was it</label>
              <input value={form.item_name} onChange={e => setForm({ ...form, item_name: e.target.value })} placeholder="3-tier wedding cake" style={{ fontFamily: 'inherit', fontSize: 15, border: '1px solid #E7D9C5', borderRadius: 11, padding: '10px 12px', outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#7A6452' }}>Customer</label>
              <input value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} placeholder="Maria" style={{ fontFamily: 'inherit', fontSize: 15, border: '1px solid #E7D9C5', borderRadius: 11, padding: '10px 12px', outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#7A6452' }}>Date</label>
              <input type="date" value={form.project_date} onChange={e => setForm({ ...form, project_date: e.target.value })} style={{ fontFamily: 'inherit', fontSize: 15, border: '1px solid #E7D9C5', borderRadius: 11, padding: '10px 12px', outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#7A6452' }}>Notes</label>
              <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="vanilla buttercream, fondant flowers..." style={{ fontFamily: 'inherit', fontSize: 15, border: '1px solid #E7D9C5', borderRadius: 11, padding: '10px 12px', outline: 'none' }} />
            </div>
          </div>

          <button onClick={saveProject} disabled={uploading} style={{ marginTop: 14, background: '#C8643C', color: '#fff', border: 'none', borderRadius: 11, padding: '11px 18px', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: uploading ? 0.6 : 1 }}>
            {uploading ? 'Saving...' : 'Save project'}
          </button>
        </div>
      )}

      {loading ? (
        <p style={{ color: '#7A6452' }}>Loading...</p>
      ) : projects.length === 0 ? (
        <div style={{ background: '#FFFDF8', border: '1px solid #E7D9C5', borderRadius: 18, padding: '40px 20px', textAlign: 'center', color: '#7A6452' }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 20, color: '#33241A', marginBottom: 6 }}>No projects yet</div>
          <div>Add your first one above.</div>
        </div>
      ) : (
        <div className="photo-grid">
          {projects.map(p => (
            <div key={p.id} className="photo-card" onClick={() => setSelected(p)}>
              {p.photo_url
                ? <img src={p.photo_url} alt={p.item_name} />
                : <div className="no-photo">🎂</div>
              }
              <div className="overlay">
                <span>{p.item_name}</span>
              </div>
            </div>
          ))}
        </div>
      )}

            {selected && (
          <div className="modal-bg" onClick={() => setSelected(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              {selected.photo_url && <img src={selected.photo_url} alt={selected.item_name} />}
              <div className="modal-details">
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 600, lineHeight: 1.2 }}>{selected.item_name}</div>
                    <button onClick={() => setSelected(null)} style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', color: '#7A6452', padding: '0 0 0 12px', flexShrink: 0 }}>✕</button>
                  </div>
                  {selected.customer_name && (
                    <div style={{ fontSize: 14, color: '#7A6452', marginBottom: 4 }}>For {selected.customer_name}</div>
                  )}
                  {selected.project_date && (
                    <div style={{ fontSize: 13, color: '#7A6452', marginBottom: 14 }}>{fmt(selected.project_date)}</div>
                  )}
                  {selected.notes && (
                    <div style={{ fontSize: 14, color: '#7A6452', fontStyle: 'italic', lineHeight: 1.6, marginTop: 8, padding: '12px', background: '#FBF4E9', borderRadius: 10 }}>{selected.notes}</div>
                  )}
                </div>
                <button
                  onClick={() => deleteProject(selected.id, selected.photo_url)}
                  style={{ marginTop: 24, background: 'transparent', border: '1px solid #EBC6CB', color: '#B5394F', borderRadius: 11, padding: '9px 14px', fontFamily: 'inherit', fontWeight: 700, fontSize: 13, cursor: 'pointer', alignSelf: 'flex-start' }}
                >
                  Delete project
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  )
}