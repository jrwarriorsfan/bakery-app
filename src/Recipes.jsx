import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Categories from './Categories.jsx'
import IconRecipes from './assets/icons/IconRecipes.jsx'

export default function Recipes() {
  const [recipes, setRecipes] = useState([])
  const [selected, setSelected] = useState(null)
  const [ingredients, setIngredients] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', yield_amount: '', yield_unit: '', notes: '', category_id: '' })
  const [ingredientRows, setIngredientRows] = useState([{ ingredient_name: '', quantity: '', unit: '', unit_price: '' }])
  const [search, setSearch] = useState('')
  const [showCategories, setShowCategories] = useState(false)
  const [categories, setCategories] = useState([])

  useEffect(() => {
    loadRecipes()
  }, [])

  useEffect(() => {
  supabase.from('categories').select('*').order('name').then(({ data }) => {
    if (data) setCategories(data)
  })
}, [])

  const loadRecipes = async () => {
    const { data, error } = await supabase.from('recipes').select('*').order('name')
    if (!error) setRecipes(data)
    setLoading(false)
  }

  const loadIngredients = async (recipeId) => {
    const { data, error } = await supabase
      .from('recipe_ingredients')
      .select('*')
      .eq('recipe_id', recipeId)
      .order('ingredient_name')
    if (!error) setIngredients(data)
  }

  const selectRecipe = (recipe) => {
    if (selected?.id === recipe.id) {
      setSelected(null)
      setIngredients([])
    } else {
      setSelected(recipe)
      loadIngredients(recipe.id)
    }
  }

  const addIngredientRow = () => {
    setIngredientRows(prev => [...prev, { ingredient_name: '', quantity: '', unit: '', unit_price: '' }])
  }

  const updateIngredientRow = (index, field, value) => {
    setIngredientRows(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row))
  }

  const removeIngredientRow = (index) => {
    setIngredientRows(prev => prev.filter((_, i) => i !== index))
  }

  const saveRecipe = async () => {
    if (!form.name.trim()) return
    const { data, error } = await supabase
      .from('recipes')
      .insert({
        name: form.name,
        description: form.description,
        yield_amount: form.yield_amount ? Number(form.yield_amount) : null,
        yield_unit: form.yield_unit,
        notes: form.notes,
        category_id: form.category_id || null,
      })
      .select()
      .single()
    if (error) { console.log('recipe error:', error); return }

    const validIngredients = ingredientRows.filter(r => r.ingredient_name.trim())
    if (validIngredients.length > 0) {
      await supabase.from('recipe_ingredients').insert(
        validIngredients.map(r => ({
          recipe_id: data.id,
          ingredient_name: r.ingredient_name,
          quantity: r.quantity ? Number(r.quantity) : null,
          unit: r.unit,
          unit_price: r.unit_price ? Number(r.unit_price) : null,
        }))
      )
    }

    setRecipes(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    setForm({ name: '', description: '', yield_amount: '', yield_unit: '', notes: '' })
    setIngredientRows([{ ingredient_name: '', quantity: '', unit: '', unit_price: '' }])
    setAdding(false)
  }

  const deleteRecipe = async (id) => {
    if (!confirm('Delete this recipe?')) return
    await supabase.from('recipe_ingredients').delete().eq('recipe_id', id)
    await supabase.from('recipes').delete().eq('id', id)
    setRecipes(prev => prev.filter(r => r.id !== id))
    if (selected?.id === id) { setSelected(null); setIngredients([]) }
  }

  const totalCost = (ings) => {
    const total = ings.reduce((sum, i) => {
      if (i.quantity && i.unit_price) return sum + (Number(i.quantity) * Number(i.unit_price))
      return sum
    }, 0)
    return total > 0 ? `$${total.toFixed(2)}` : null
  }

  const UNITS = ['g', 'kg', 'oz', 'lb', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'pc', 'dozen']

  return (
    <div style={{ fontFamily: 'Hanken Grotesk, sans-serif', padding: '22px 16px 60px', maxWidth: 760, margin: '0 auto' }}>
      <style>{`
        .recipe-form input, .recipe-form select, .recipe-form textarea {
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }
      `}</style>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Hanken+Grotesk:wght@400;500;600;700&display=swap');`}</style>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, minWidth: 0 }}>
          <div style={{ width: 40, height: 40, position: 'relative', flexShrink: 0 }}>
            <IconRecipes style={{ width: 100, height: 100, color: 'var(--ink)', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
          </div>
          <h1 style={{ fontFamily: 'Amatic SC, sans-serif', fontWeight: 700, fontSize: 48, color: 'var(--ink)', margin: 0, lineHeight: 0.9 }}>
            Recipes
          </h1>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0, marginTop: 0 }}>
          <button onClick={() => setShowCategories(true)} style={{ background: '#FFFDF8', border: '1px solid #E7D9C5', color: '#33241A', borderRadius: 11, padding: '8px 16px', fontFamily: 'Amatic SC, sans-serif', fontWeight: 1000, fontSize: 24, lineHeight: 1, cursor: 'pointer' }}>
            Categories
          </button>
          <button onClick={() => setAdding(s => !s)} style={{ background: '#C8643C', color: '#fff', border: 'none', borderRadius: 11, padding: '8px 16px', fontFamily: 'Amatic SC, sans-serif', fontWeight: 1000, fontSize: 24, lineHeight: 1, cursor: 'pointer' }}>
            {adding ? 'Cancel' : '+ Add recipe'}
          </button>
        </div>
      </div>

      {showCategories && <Categories onClose={() => setShowCategories(false)} />}
      <p style={{ fontFamily: 'Pacifico, cursive', fontSize: 14, color: 'var(--ink-soft)', margin: '-40px 0 22px' }}>your tried and true favorites</p>
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search recipes..."
        style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'Shadows Into Light, cursive', fontSize: 20, fontWeight: 500, lineHeight: 1, border: '1px solid #E7D9C5', borderRadius: 12, padding: '8px 14px', outline: 'none', background: '#FFFDF8', color: '#33241A', marginBottom: 14 }}
      />

      {adding && (
        <div className="recipe-form" style={{ background: '#FFFDF8', border: '1px solid #E7D9C5', borderRadius: 18, padding: 18, marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 600, margin: '0 0 14px' }}>New recipe</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#7A6452' }}>Recipe name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Chocolate chip cookies" style={{ fontFamily: 'inherit', fontSize: 15, border: '1px solid #E7D9C5', borderRadius: 11, padding: '10px 12px', outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#7A6452' }}>Description (optional)</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Classic chewy cookies with semi-sweet chocolate chips" style={{ fontFamily: 'inherit', fontSize: 15, border: '1px solid #E7D9C5', borderRadius: 11, padding: '10px 12px', outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#7A6452' }}>Category</label>
              <select
                value={form.category_id}
                onChange={e => setForm({ ...form, category_id: e.target.value })}
                style={{ fontFamily: 'inherit', fontSize: 15, border: '1px solid #E7D9C5', borderRadius: 11, padding: '10px 12px', outline: 'none' }}
              >
                <option value=''>No category</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#7A6452' }}>Yield amount</label>
              <input type="number" value={form.yield_amount} onChange={e => setForm({ ...form, yield_amount: e.target.value })} placeholder="24" style={{ fontFamily: 'inherit', fontSize: 15, border: '1px solid #E7D9C5', borderRadius: 11, padding: '10px 12px', outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#7A6452' }}>Yield unit</label>
              <input value={form.yield_unit} onChange={e => setForm({ ...form, yield_unit: e.target.value })} placeholder="cookies" style={{ fontFamily: 'inherit', fontSize: 15, border: '1px solid #E7D9C5', borderRadius: 11, padding: '10px 12px', outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#7A6452' }}>Notes (optional)</label>
              <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="bake at 375°F for 10 min..." style={{ fontFamily: 'inherit', fontSize: 15, border: '1px solid #E7D9C5', borderRadius: 11, padding: '10px 12px', outline: 'none' }} />
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#7A6452', display: 'block', marginBottom: 10 }}>Ingredients</label>
            {ingredientRows.map((row, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'center', width: '100%', boxSizing: 'border-box' }}>
                <input value={row.ingredient_name} onChange={e => updateIngredientRow(i, 'ingredient_name', e.target.value)} placeholder="Butter" style={{ fontFamily: 'inherit', fontSize: 14, border: '1px solid #E7D9C5', borderRadius: 9, padding: '8px 10px', outline: 'none', width: '100%', minWidth: 0, boxSizing: 'border-box' }} />
                <input type="number" value={row.quantity} onChange={e => updateIngredientRow(i, 'quantity', e.target.value)} placeholder="1" style={{ fontFamily: 'inherit', fontSize: 14, border: '1px solid #E7D9C5', borderRadius: 9, padding: '8px 10px', outline: 'none', width: '100%', minWidth: 0, boxSizing: 'border-box' }} />
                <select value={row.unit} onChange={e => updateIngredientRow(i, 'unit', e.target.value)} style={{ fontFamily: 'inherit', fontSize: 14, border: '1px solid #E7D9C5', borderRadius: 9, padding: '8px 10px', outline: 'none', color: '#33241A', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
                  <option value=''>unit</option>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <input type="number" value={row.unit_price} onChange={e => updateIngredientRow(i, 'unit_price', e.target.value)} placeholder="$0.00" style={{ fontFamily: 'inherit', fontSize: 14, border: '1px solid #E7D9C5', borderRadius: 9, padding: '8px 10px', outline: 'none', width: '100%', minWidth: 0, boxSizing: 'border-box' }} />
                <button onClick={() => removeIngredientRow(i)} style={{ background: 'transparent', border: 'none', color: '#7A6452', cursor: 'pointer', fontSize: 16, padding: '4px 6px' }}>✕</button>
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: '#7A6452', padding: '0 10px' }}>Ingredient</span>
              <span style={{ fontSize: 11, color: '#7A6452', padding: '0 10px' }}>Qty</span>
              <span style={{ fontSize: 11, color: '#7A6452', padding: '0 10px' }}>Unit</span>
              <span style={{ fontSize: 11, color: '#7A6452', padding: '0 10px' }}>Cost/unit $</span>
            </div>
            <button onClick={addIngredientRow} style={{ background: 'transparent', border: '1px dashed #E7D9C5', borderRadius: 9, padding: '8px 14px', fontFamily: 'inherit', fontSize: 13, color: '#7A6452', cursor: 'pointer', marginTop: 4 }}>
              + Add ingredient
            </button>
          </div>

          <button onClick={saveRecipe} style={{ marginTop: 18, background: '#C8643C', color: '#fff', border: 'none', borderRadius: 11, padding: '11px 18px', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            Save recipe
          </button>
        </div>
      )}

      {loading ? (
        <p style={{ color: '#7A6452' }}>Loading...</p>
      ) : recipes.length === 0 ? (
        <div style={{ background: '#FFFDF8', border: '1px solid #E7D9C5', borderRadius: 18, padding: '40px 20px', textAlign: 'center', color: '#7A6452' }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 20, color: '#33241A', marginBottom: 6 }}>No recipes yet</div>
          <div>Add your first recipe above.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {recipes
            .filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.description?.toLowerCase().includes(search.toLowerCase()))
            .map(r => (
            <div key={r.id}>
              <div onClick={() => selectRecipe(r)} style={{ background: '#FFFDF8', border: `1px solid ${selected?.id === r.id ? '#C8643C' : '#E7D9C5'}`, borderRadius: selected?.id === r.id ? '18px 18px 0 0' : 18, padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Amatic SC, sans-serif', fontWeight: 1000, fontSize: 30, color: 'var(--ink)', lineHeight: 1 }}>{r.name}</div>
                  {r.description && <div style={{ fontFamily: 'Shadows Into Light, cursive', fontSize: 16, color: 'var(--ink-soft)', marginTop: 2 }}>{r.description}</div>}
                  {r.yield_amount && <div style={{ fontFamily: 'Shadows Into Light, cursive', fontSize: 16, color: 'var(--ink-soft)' }}>Makes {r.yield_amount} {r.yield_unit}</div>}
                </div>
                <button onClick={e => { e.stopPropagation(); deleteRecipe(r.id) }} style={{ background: 'transparent', border: 'none', color: '#7A6452', cursor: 'pointer', fontSize: 16, padding: '4px 8px', borderRadius: 8 }}>✕</button>
              </div>

              {selected?.id === r.id && (
                <div style={{ background: '#FBF4E9', border: '1px solid #C8643C', borderTop: 'none', borderRadius: '0 0 18px 18px', padding: '14px 16px' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#7A6452', marginBottom: 10 }}>Ingredients</div>
                  {ingredients.length === 0 ? (
                    <div style={{ fontSize: 14, color: '#7A6452', fontStyle: 'italic' }}>No ingredients added.</div>
                  ) : (
                    <>
                      {ingredients.map(ing => (
                        <div key={ing.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid #E7D9C5' }}>
                          <div>
                            <span style={{ fontWeight: 600, fontSize: 14 }}>{ing.ingredient_name}</span>
                            <span style={{ fontSize: 13, color: '#7A6452', marginLeft: 8 }}>{ing.quantity} {ing.unit}</span>
                          </div>
                          {ing.unit_price && (
                            <span style={{ fontSize: 13, color: '#7A6452' }}>${(ing.quantity * ing.unit_price).toFixed(2)}</span>
                          )}
                        </div>
                      ))}
                      {totalCost(ingredients) && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', marginTop: 6, borderTop: '2px solid #E7D9C5' }}>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>Total ingredient cost</span>
                          <span style={{ fontWeight: 700, fontSize: 14, color: '#C8643C' }}>{totalCost(ingredients)}</span>
                        </div>
                      )}
                      {r.notes && <div style={{ fontSize: 13, color: '#7A6452', fontStyle: 'italic', marginTop: 10 }}>📝 {r.notes}</div>}
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