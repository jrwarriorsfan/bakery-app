import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export default function Categories({ onClose }) {
  const [categories, setCategories] = useState([])
  const [subcategories, setSubcategories] = useState([])
  const [options, setOptions] = useState([])
  const [loading, setLoading] = useState(true)

  const [newCategory, setNewCategory] = useState('')
  const [expandedCat, setExpandedCat] = useState(null)
  const [newSub, setNewSub] = useState('')
  const [expandedSub, setExpandedSub] = useState(null)
  const [newOption, setNewOption] = useState('')

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    const [catRes, subRes, optRes] = await Promise.all([
      supabase.from('categories').select('*').order('name'),
      supabase.from('subcategories').select('*').order('name'),
      supabase.from('subcategory_options').select('*').order('label'),
    ])
    if (catRes.data) setCategories(catRes.data)
    if (subRes.data) setSubcategories(subRes.data)
    if (optRes.data) setOptions(optRes.data)
    setLoading(false)
  }

  const addCategory = async () => {
    if (!newCategory.trim()) return
    const { data, error } = await supabase.from('categories').insert({ name: newCategory }).select().single()
    if (!error) {
      setCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setNewCategory('')
    }
  }

  const deleteCategory = async (id) => {
    if (!confirm('Delete this category and all its types/sizes?')) return
    const subIds = subcategories.filter(s => s.category_id === id).map(s => s.id)
    if (subIds.length > 0) {
      await supabase.from('subcategory_options').delete().in('subcategory_id', subIds)
      await supabase.from('subcategories').delete().eq('category_id', id)
    }
    await supabase.from('categories').delete().eq('id', id)
    setCategories(prev => prev.filter(c => c.id !== id))
    setSubcategories(prev => prev.filter(s => s.category_id !== id))
    if (expandedCat === id) setExpandedCat(null)
  }

  const addSubcategory = async (categoryId) => {
    if (!newSub.trim()) return
    const { data, error } = await supabase.from('subcategories').insert({ category_id: categoryId, name: newSub }).select().single()
    if (!error) {
      setSubcategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setNewSub('')
    }
  }

  const deleteSubcategory = async (id) => {
    if (!confirm('Delete this type and all its sizes/options?')) return
    await supabase.from('subcategory_options').delete().eq('subcategory_id', id)
    await supabase.from('subcategories').delete().eq('id', id)
    setSubcategories(prev => prev.filter(s => s.id !== id))
    setOptions(prev => prev.filter(o => o.subcategory_id !== id))
    if (expandedSub === id) setExpandedSub(null)
  }

  const addOption = async (subcategoryId) => {
    if (!newOption.trim()) return
    const { data, error } = await supabase.from('subcategory_options').insert({ subcategory_id: subcategoryId, label: newOption }).select().single()
    if (!error) {
      setOptions(prev => [...prev, data])
      setNewOption('')
    }
  }

  const deleteOption = async (id) => {
    await supabase.from('subcategory_options').delete().eq('id', id)
    setOptions(prev => prev.filter(o => o.id !== id))
  }

  const inputStyle = { fontFamily: 'inherit', fontSize: 14, border: '1px solid #E7D9C5', borderRadius: 9, padding: '8px 10px', outline: 'none', flex: 1 }
  const smallBtn = { background: '#C8643C', color: '#fff', border: 'none', borderRadius: 9, padding: '8px 14px', fontFamily: 'inherit', fontWeight: 700, fontSize: 13, cursor: 'pointer' }
  const ghostBtn = { background: 'transparent', border: 'none', color: '#7A6452', cursor: 'pointer', fontSize: 15, padding: '4px 8px', borderRadius: 8 }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,36,26,0.6)', zIndex: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#FFFDF8', borderRadius: 20, maxWidth: 540, width: '100%', maxHeight: '85vh', overflowY: 'auto', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 600 }}>Categories</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', color: '#7A6452' }}>✕</button>
        </div>
        <p style={{ color: '#7A6452', fontSize: 13, marginBottom: 20 }}>
          Organize recipes into categories, types, and sizes — like Cakes → Tiered Cake → 3-tier.
        </p>

        {/* add new category */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <input
            value={newCategory}
            onChange={e => setNewCategory(e.target.value)}
            placeholder="New category name (e.g. Cakes)"
            style={inputStyle}
            onKeyDown={e => e.key === 'Enter' && addCategory()}
          />
          <button onClick={addCategory} style={smallBtn}>Add</button>
        </div>

        {loading ? (
          <p style={{ color: '#7A6452' }}>Loading...</p>
        ) : categories.length === 0 ? (
          <div style={{ color: '#7A6452', fontSize: 14, fontStyle: 'italic', padding: '20px 0', textAlign: 'center' }}>No categories yet. Add one above.</div>
        ) : (
          categories.map(cat => (
            <div key={cat.id} style={{ marginBottom: 12, border: '1px solid #E7D9C5', borderRadius: 14, overflow: 'hidden' }}>
              <div
                onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#FBF4E9', cursor: 'pointer' }}
              >
                <span style={{ fontWeight: 700, fontSize: 15 }}>{cat.name}</span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#7A6452' }}>{subcategories.filter(s => s.category_id === cat.id).length} types</span>
                  <button onClick={e => { e.stopPropagation(); deleteCategory(cat.id) }} style={ghostBtn}>✕</button>
                </div>
              </div>

              {expandedCat === cat.id && (
                <div style={{ padding: 14 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                    <input
                      value={newSub}
                      onChange={e => setNewSub(e.target.value)}
                      placeholder="New type (e.g. Sheet Cake, Tiered Cake)"
                      style={inputStyle}
                      onKeyDown={e => e.key === 'Enter' && addSubcategory(cat.id)}
                    />
                    <button onClick={() => addSubcategory(cat.id)} style={smallBtn}>Add</button>
                  </div>

                  {subcategories.filter(s => s.category_id === cat.id).map(sub => (
                    <div key={sub.id} style={{ marginBottom: 10, border: '1px solid #E7D9C5', borderRadius: 11, overflow: 'hidden' }}>
                      <div
                        onClick={() => setExpandedSub(expandedSub === sub.id ? null : sub.id)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#fff', cursor: 'pointer' }}
                      >
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{sub.name}</span>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ fontSize: 12, color: '#7A6452' }}>{options.filter(o => o.subcategory_id === sub.id).length} sizes</span>
                          <button onClick={e => { e.stopPropagation(); deleteSubcategory(sub.id) }} style={ghostBtn}>✕</button>
                        </div>
                      </div>

                      {expandedSub === sub.id && (
                        <div style={{ padding: 12, background: '#FBF4E9' }}>
                          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                            <input
                              value={newOption}
                              onChange={e => setNewOption(e.target.value)}
                              placeholder="New size/option (e.g. 9x13, 2-tier)"
                              style={inputStyle}
                              onKeyDown={e => e.key === 'Enter' && addOption(sub.id)}
                            />
                            <button onClick={() => addOption(sub.id)} style={smallBtn}>Add</button>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {options.filter(o => o.subcategory_id === sub.id).map(opt => (
                              <span key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #E7D9C5', borderRadius: 50, padding: '5px 10px', fontSize: 13 }}>
                                {opt.label}
                                <button onClick={() => deleteOption(opt.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#7A6452', fontSize: 12, padding: 0 }}>✕</button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}