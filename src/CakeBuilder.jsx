import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const COLORS = [
  { name: 'Blush Pink', hex: '#F4C2C2' },
  { name: 'Cream White', hex: '#FFFDF5' },
  { name: 'Sage Green', hex: '#A8BFA0' },
  { name: 'Lavender', hex: '#D8C8E8' },
  { name: 'Butter Yellow', hex: '#F5E1A4' },
  { name: 'Terra Cotta', hex: '#C8643C' },
  { name: 'Chocolate Brown', hex: '#6B4226' },
  { name: 'Berry Red', hex: '#B5394F' },
]

const blankTier = (order) => ({
  tempId: Date.now() + Math.random(),
  tier_order: order,
  size: '',
  flavor: '',
  color: COLORS[1].hex,
})

export default function CakeBuilder({ onClose, onUse, embedded = false }) {
  const [tiers, setTiers] = useState([blankTier(1)])
  const [expandedTier, setExpandedTier] = useState(0)
  const [toppers, setToppers] = useState('')
  const [message, setMessage] = useState('')
  const [notes, setNotes] = useState('')
  const [templates, setTemplates] = useState([])
  const [saveAsTemplate, setSaveAsTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadTemplates() }, [])

  const loadTemplates = async () => {
    const { data: builds } = await supabase.from('cake_builds').select('*').eq('is_template', true).order('name')
    if (builds) setTemplates(builds)
    setLoading(false)
  }

  const addTier = () => {
    setTiers(prev => {
      const next = [...prev, blankTier(prev.length + 1)]
      setExpandedTier(next.length - 1)
      return next
    })
  }

  const removeTier = (tempId) => {
    setTiers(prev => prev.filter(t => t.tempId !== tempId).map((t, i) => ({ ...t, tier_order: i + 1 })))
  }

  const updateTier = (tempId, patch) => {
    setTiers(prev => prev.map(t => t.tempId === tempId ? { ...t, ...patch } : t))
  }

  const loadTemplate = async (template) => {
    const { data: tierData } = await supabase.from('cake_tiers').select('*').eq('build_id', template.id).order('tier_order')
    setTiers(
      tierData && tierData.length > 0
        ? tierData.map(t => ({ tempId: Date.now() + Math.random(), tier_order: t.tier_order, size: t.size || '', flavor: t.flavor || '', color: t.color || COLORS[1].hex }))
        : [blankTier(1)]
    )
    setToppers(template.toppers || '')
    setMessage(template.message || '')
    setNotes(template.notes || '')
    setExpandedTier(0)
  }

  const reset = () => {
    setTiers([blankTier(1)])
    setToppers('')
    setMessage('')
    setNotes('')
    setSaveAsTemplate(false)
    setTemplateName('')
    setExpandedTier(0)
  }

  const saveBuild = async (asTemplateOnly = false) => {
    const payload = {
      name: saveAsTemplate || asTemplateOnly ? templateName : null,
      is_template: saveAsTemplate || asTemplateOnly,
      toppers,
      message,
      notes,
    }
    const { data: build, error } = await supabase.from('cake_builds').insert(payload).select().single()
    if (error) { console.log('build error:', JSON.stringify(error)); return null }

    await supabase.from('cake_tiers').insert(
      tiers.map(t => ({
        build_id: build.id,
        tier_order: t.tier_order,
        size: t.size,
        flavor: t.flavor,
        color: t.color,
      }))
    )
    return build
  }

  const handleUse = async () => {
    const build = await saveBuild(false)
    if (build && onUse) {
      onUse({ ...build, tiers })
      reset()
    }
  }

  const handleSaveTemplateOnly = async () => {
    if (!templateName.trim()) return
    const build = await saveBuild(true)
    if (build) {
      await loadTemplates()
      reset()
    }
  }

  // visual width per tier, widest at bottom
  const tierWidth = (index, total) => {
    const minWidth = 90
    const maxWidth = 220
    if (total === 1) return maxWidth
    const step = (maxWidth - minWidth) / (total - 1)
    return maxWidth - index * step
  }

  return (
    <div style={{ fontFamily: 'Hanken Grotesk, sans-serif', maxWidth: 480, margin: '0 auto', padding: embedded ? 0 : '20px 16px 60px' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Hanken+Grotesk:wght@400;500;600;700&display=swap');
        .cb-tier { transition: all 0.2s ease; cursor: pointer; }
        .cb-color-swatch { width: 28px; height: 28px; border-radius: 50%; cursor: pointer; border: 2px solid transparent; flex-shrink: 0; }
        .cb-color-swatch.selected { border-color: #33241A; }
      `}</style>

      {!embedded && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 28, fontWeight: 600, margin: 0 }}>🎂 Cake Builder</h1>
          {onClose && <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', color: '#7A6452' }}>✕</button>}
        </div>
      )}
      <p style={{ color: '#7A6452', fontSize: 13, marginBottom: 18 }}>Design a custom cake tier by tier.</p>

      {/* templates row */}
      {templates.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#7A6452', marginBottom: 8 }}>Start from a template</div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {templates.map(t => (
              <button
                key={t.id}
                onClick={() => loadTemplate(t)}
                style={{ background: '#FFFDF8', border: '1px solid #E7D9C5', borderRadius: 50, padding: '8px 14px', fontFamily: 'inherit', fontWeight: 600, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* visual tier stack, top tier first visually = reverse order so bottom tier is widest at the bottom */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20, background: '#FBF4E9', borderRadius: 16, padding: '24px 16px' }}>
        {[...tiers].reverse().map((tier, revIndex) => {
          const index = tiers.length - 1 - revIndex
          const isExpanded = expandedTier === index
          return (
            <div key={tier.tempId} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                className="cb-tier"
                onClick={() => setExpandedTier(isExpanded ? null : index)}
                style={{
                  width: tierWidth(index, tiers.length),
                  height: 36,
                  background: tier.color,
                  borderRadius: 8,
                  marginBottom: 4,
                  boxShadow: isExpanded ? '0 0 0 3px #C8643C' : '0 2px 6px rgba(0,0,0,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#33241A',
                }}
              >
                Tier {tier.tier_order}
              </div>

              {isExpanded && (
                <div style={{ width: '100%', maxWidth: 280, background: '#FFFDF8', border: '1px solid #E7D9C5', borderRadius: 12, padding: 14, marginBottom: 10 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input
                      value={tier.size}
                      onChange={e => updateTier(tier.tempId, { size: e.target.value })}
                      placeholder="Size (e.g. 8 inch)"
                      style={{ fontFamily: 'inherit', fontSize: 14, border: '1px solid #E7D9C5', borderRadius: 9, padding: '8px 10px', outline: 'none' }}
                    />
                    <input
                      value={tier.flavor}
                      onChange={e => updateTier(tier.tempId, { flavor: e.target.value })}
                      placeholder="Flavor / filling (e.g. vanilla, raspberry filling)"
                      style={{ fontFamily: 'inherit', fontSize: 14, border: '1px solid #E7D9C5', borderRadius: 9, padding: '8px 10px', outline: 'none' }}
                    />
                    <div>
                      <div style={{ fontSize: 11, color: '#7A6452', marginBottom: 6 }}>Color</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {COLORS.map(c => (
                          <div
                            key={c.hex}
                            className={`cb-color-swatch ${tier.color === c.hex ? 'selected' : ''}`}
                            style={{ background: c.hex }}
                            title={c.name}
                            onClick={() => updateTier(tier.tempId, { color: c.hex })}
                          />
                        ))}
                      </div>
                    </div>
                    {tiers.length > 1 && (
                      <button
                        onClick={() => removeTier(tier.tempId)}
                        style={{ background: 'transparent', border: '1px solid #EBC6CB', color: '#B5394F', borderRadius: 9, padding: '7px 12px', fontFamily: 'inherit', fontWeight: 700, fontSize: 12, cursor: 'pointer', alignSelf: 'flex-start' }}
                      >
                        Remove this tier
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        <button
          onClick={addTier}
          style={{ background: 'transparent', border: '1px dashed #C8643C', color: '#C8643C', borderRadius: 9, padding: '8px 16px', fontFamily: 'inherit', fontWeight: 700, fontSize: 13, cursor: 'pointer', marginTop: 6 }}
        >
          + Add tier
        </button>
      </div>

      {/* extras */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#7A6452', display: 'block', marginBottom: 4 }}>Toppers / decorations</label>
          <input value={toppers} onChange={e => setToppers(e.target.value)} placeholder="Gold cake topper, fresh flowers..." style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: 14, border: '1px solid #E7D9C5', borderRadius: 9, padding: '8px 10px', outline: 'none' }} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#7A6452', display: 'block', marginBottom: 4 }}>Message on cake</label>
          <input value={message} onChange={e => setMessage(e.target.value)} placeholder="Happy Birthday Sarah!" style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: 14, border: '1px solid #E7D9C5', borderRadius: 9, padding: '8px 10px', outline: 'none' }} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#7A6452', display: 'block', marginBottom: 4 }}>Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="anything else..." style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: 14, border: '1px solid #E7D9C5', borderRadius: 9, padding: '8px 10px', outline: 'none', resize: 'vertical', minHeight: 50 }} />
        </div>
      </div>

      {/* save as template */}
      <div style={{ background: '#FBF4E9', borderRadius: 12, padding: 12, marginBottom: 18 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <input type="checkbox" checked={saveAsTemplate} onChange={e => setSaveAsTemplate(e.target.checked)} />
          Save this design as a reusable template
        </label>
        {saveAsTemplate && (
          <input
            value={templateName}
            onChange={e => setTemplateName(e.target.value)}
            placeholder="Template name (e.g. Sarah's Birthday Style)"
            style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: 14, border: '1px solid #E7D9C5', borderRadius: 9, padding: '8px 10px', outline: 'none', marginTop: 10 }}
          />
        )}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        {onUse && (
          <button onClick={handleUse} style={{ background: '#C8643C', color: '#fff', border: 'none', borderRadius: 11, padding: '11px 18px', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, cursor: 'pointer', flex: 1 }}>
            Use this design
          </button>
        )}
        {!onUse && (
          <button onClick={handleSaveTemplateOnly} style={{ background: '#C8643C', color: '#fff', border: 'none', borderRadius: 11, padding: '11px 18px', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, cursor: 'pointer', flex: 1 }}>
            Save template
          </button>
        )}
      </div>
    </div>
  )
}