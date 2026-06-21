import React, { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from './supabase'
import jsPDF from 'jspdf'

// ---- helpers -------------------------------------------------------------
const pad = (n) => String(n).padStart(2, "0");
const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseKey = (s) => {
  const [y, m, dd] = s.split("-").map(Number);
  return new Date(y, m - 1, dd);
};
const todayStr = () => toKey(new Date());
const fmtLong = (s) =>
  parseKey(s).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
const fmtShort = (s) =>
  parseKey(s).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

const STATUSES = ["New", "Confirmed", "Baking", "Done"];
const DEFAULT_SETTINGS = { dailyCapacity: 3, bakerName: "" };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const blankItemRow = () => ({ uid: uid(), recipe_id: null, item_name: "", quantity: 1, subcategory_id: null, option_id: null })

// ---- component -----------------------------------------------------------
export default function SweetSchedule() {
  const [orders, setOrders] = useState([]); // each order has .items: []
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [viewOrder, setViewOrder] = useState(null);
  const [viewPhoto, setViewPhoto] = useState(null);
  const [orderSupplies, setOrderSupplies] = useState([]);
  const [subcategories, setSubcategories] = useState([])
  const [subcategoryOptions, setSubcategoryOptions] = useState([])

  const [inspoFile, setInspoFile] = useState(null);
  const [inspoPreview, setInspoPreview] = useState(null);
  const inspoRef = useRef();

  const [supplyRows, setSupplyRows] = useState([{ supply_name: '', quantity: '' }]);

  const blankForm = () => ({
    customer: "",
    contact: "",
    customer_id: null,
    dueDate: todayStr(),
    notes: "",
    status: "New",
    paid: false,
    price: "",
    inspiration_photo_url: null,
  });
  const [form, setForm] = useState(blankForm());
  const [itemRows, setItemRows] = useState([blankItemRow()]);

  // ---- load orders + their items ----
  const loadOrders = async () => {
    try {
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select('*')
        .order('due_date', { ascending: true })
      if (error) throw error

      const { data: itemsData, error: itemsErr } = await supabase
        .from('order_items')
        .select('*')
      if (itemsErr) throw itemsErr

      const mapped = ordersData.map(o => ({
        id: o.id,
        customer: o.customer_name,
        contact: o.contact,
        customer_id: o.customer_id,
        dueDate: o.due_date,
        notes: o.notes,
        status: o.status,
        paid: o.paid,
        price: o.price,
        inspiration_photo_url: o.inspiration_photo_url,
        createdAt: new Date(o.created_at).getTime(),
        items: itemsData.filter(it => it.order_id === o.id),
      }))
      setOrders(mapped)
    } catch (e) {
      console.error('load error', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadOrders() }, [])

  useEffect(() => {
    supabase.from('customers').select('*').order('name').then(({ data }) => {
      if (data) setCustomers(data)
    })
  }, [])

  useEffect(() => {
    supabase.from('recipes').select('*').order('name').then(({ data }) => {
      if (data) setRecipes(data)
    })
  }, [])

  useEffect(() => {
  supabase.from('subcategories').select('*').then(({ data }) => {
    if (data) setSubcategories(data)
  })
  supabase.from('subcategory_options').select('*').then(({ data }) => {
    if (data) setSubcategoryOptions(data)
  })
}, [])

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('settings').select('*').eq('user_id', user.id).single()
      if (data) setSettings({ bakerName: data.baker_name || '', dailyCapacity: data.daily_capacity || 3 })
    })()
  }, [])

  // ---- capacity helpers (count orders, not items) ----
  const activeCountForDate = (date, excludeId = null) =>
    orders.filter((o) => o.dueDate === date && o.status !== "Done" && o.id !== excludeId).length;

  const capInfo = (count) => {
    const cap = Math.max(1, settings.dailyCapacity);
    if (count >= cap) return { level: "full", label: `${count}/${cap} — full` };
    if (count >= cap - 1) return { level: "filling", label: `${count}/${cap} — almost full` };
    return { level: "open", label: `${count}/${cap} — open` };
  };

  const formCount = activeCountForDate(form.dueDate, editingId);
  const formCap = capInfo(formCount);

  // ---- item row helpers ----
  const addItemRow = () => setItemRows(prev => [...prev, blankItemRow()])
  const removeItemRow = (uidToRemove) => setItemRows(prev => prev.filter(r => r.uid !== uidToRemove))
  const updateItemRow = (uidToUpdate, patch) =>
    setItemRows(prev => prev.map(r => r.uid === uidToUpdate ? { ...r, ...patch } : r))

  // ---- supply row helpers ----
  const addSupplyRow = () => setSupplyRows(prev => [...prev, { supply_name: '', quantity: '' }])
  const updateSupplyRow = (index, field, value) =>
    setSupplyRows(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row))
  const removeSupplyRow = (index) => setSupplyRows(prev => prev.filter((_, i) => i !== index))

  const loadOrderSupplies = async (orderId) => {
    const { data } = await supabase.from('order_supplies').select('*').eq('order_id', orderId)
    if (data) setOrderSupplies(data)
  }

  const handleInspoChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setInspoFile(file)
    setInspoPreview(URL.createObjectURL(file))
  }

  // ---- submit (create or update order + items + supplies) ----
  const submit = async () => {
    const validItems = itemRows.filter(r => r.item_name.trim())
    if (validItems.length === 0) return

    let inspiration_photo_url = form.inspiration_photo_url || null
    if (inspoFile) {
      const ext = inspoFile.name.split('.').pop()
      const fileName = `${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('order-photos').upload(fileName, inspoFile)
      if (!uploadError) {
        const { data } = supabase.storage.from('order-photos').getPublicUrl(fileName)
        inspiration_photo_url = data.publicUrl
      }
    }

    const orderPayload = {
      customer_name: form.customer,
      contact: form.contact,
      customer_id: form.customer_id || null,
      due_date: form.dueDate,
      notes: form.notes,
      status: form.status || 'New',
      paid: form.paid || false,
      price: form.price ? Number(form.price) : null,
      inspiration_photo_url,
    }

    let orderId = editingId

    if (editingId) {
      const { error } = await supabase.from('orders').update(orderPayload).eq('id', editingId)
      if (error) { console.log('order update error:', JSON.stringify(error)); return }
      // wipe and re-insert items + supplies for simplicity
      await supabase.from('order_items').delete().eq('order_id', editingId)
      await supabase.from('order_supplies').delete().eq('order_id', editingId)
    } else {
      const { data, error } = await supabase.from('orders').insert(orderPayload).select().single()
      if (error) { console.log('order insert error:', JSON.stringify(error)); return }
      orderId = data.id
    }

    await supabase.from('order_items').insert(
      validItems.map(r => ({
        order_id: orderId,
        item_name: r.item_name,
        quantity: r.quantity || 1,
        recipe_id: r.recipe_id || null,
        subcategory_id: r.subcategory_id || null,
        option_id: r.option_id || null,
      }))
    )

    const validSupplies = supplyRows.filter(s => s.supply_name.trim())
    if (validSupplies.length > 0) {
      await supabase.from('order_supplies').insert(
        validSupplies.map(s => ({ order_id: orderId, supply_name: s.supply_name, quantity: s.quantity }))
      )
    }

    await loadOrders()
    setToast(editingId ? 'Order updated!' : 'Order added!')
    setTimeout(() => setToast(''), 2500)

    setEditingId(null)
    setForm(blankForm())
    setItemRows([blankItemRow()])
    setSupplyRows([{ supply_name: '', quantity: '' }])
    setInspoFile(null)
    setInspoPreview(null)
  }

  const startEdit = async (o) => {
    setEditingId(o.id)
    setForm({
      customer: o.customer,
      contact: o.contact,
      customer_id: o.customer_id || null,
      dueDate: o.dueDate,
      notes: o.notes,
      status: o.status,
      paid: o.paid,
      price: o.price || "",
      inspiration_photo_url: o.inspiration_photo_url,
    })
    setItemRows(
      o.items.length > 0
        ? o.items.map(it => ({ uid: uid(), recipe_id: it.recipe_id, item_name: it.item_name, quantity: it.quantity, subcategory_id: it.subcategory_id, option_id: it.option_id }))
        : [blankItemRow()]
    )
    const { data } = await supabase.from('order_supplies').select('*').eq('order_id', o.id)
    setSupplyRows(data && data.length > 0 ? data.map(s => ({ supply_name: s.supply_name, quantity: s.quantity || '' })) : [{ supply_name: '', quantity: '' }])
    setInspoFile(null)
    setInspoPreview(null)
    document.getElementById("ss-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const cancelEdit = () => {
    setEditingId(null)
    setForm(blankForm())
    setItemRows([blankItemRow()])
    setSupplyRows([{ supply_name: '', quantity: '' }])
    setInspoFile(null)
    setInspoPreview(null)
  };

  const remove = async (id) => {
    await supabase.from('order_items').delete().eq('order_id', id)
    await supabase.from('order_supplies').delete().eq('order_id', id)
    const { error } = await supabase.from('orders').delete().eq('id', id)
    if (!error) setOrders(prev => prev.filter(o => o.id !== id))
  }

  const cycleStatus = async (id) => {
    const order = orders.find(o => o.id === id)
    const nextStatus = STATUSES[(STATUSES.indexOf(order.status) + 1) % STATUSES.length]
    const { error } = await supabase.from('orders').update({ status: nextStatus }).eq('id', id)
    if (!error) setOrders(prev => prev.map(o => o.id === id ? { ...o, status: nextStatus } : o))
  }

  const togglePaid = async (id) => {
    const order = orders.find(o => o.id === id)
    const { error } = await supabase.from('orders').update({ paid: !order.paid }).eq('id', id)
    if (!error) setOrders(prev => prev.map(o => o.id === id ? { ...o, paid: !o.paid } : o))
  }

  const clearAll = async () => {
    if (!confirm("Delete all orders? This can't be undone.")) return
    await supabase.from('order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('order_supplies').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    const { error } = await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (!error) setOrders([])
  }

  // ---- grouping + search (search matches customer or any item name) ----
  const grouped = useMemo(() => {
    const map = {};
    orders
      .filter(o => {
        if (!search) return true
        const q = search.toLowerCase()
        const customerMatch = o.customer?.toLowerCase().includes(q)
        const itemMatch = o.items.some(it => it.item_name?.toLowerCase().includes(q))
        return customerMatch || itemMatch
      })
      .forEach((o) => {
        (map[o.dueDate] = map[o.dueDate] || []).push(o);
      });
    return Object.keys(map)
      .sort()
      .map((date) => ({
        date,
        items: map[date].sort((a, b) => a.createdAt - b.createdAt),
      }));
  }, [orders, search]);

  const today = todayStr();
  const tomorrow = toKey(new Date(new Date().setDate(new Date().getDate() + 1)));

  const itemSummary = (order) =>
    order.items.map(it => {
      const sub = subcategories.find(s => s.id === it.subcategory_id)
      const opt = subcategoryOptions.find(o => o.id === it.option_id)
      const tag = [sub?.name, opt?.label].filter(Boolean).join(' · ')
      return `${it.quantity}× ${it.item_name}${tag ? ` (${tag})` : ''}`
    }).join(', ')

  // ---- PDF export ----
  const exportPDF = () => {
    const doc = new jsPDF()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(20)
    doc.text('Order List', 14, 20)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.text(`Generated ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`, 14, 28)

    let y = 40
    grouped.forEach(({ date, items }) => {
      if (y > 260) { doc.addPage(); y = 20 }
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(13)
      doc.text(fmtLong(date), 14, y)
      y += 6

      items.forEach(o => {
        if (y > 270) { doc.addPage(); y = 20 }
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11)
        doc.text(`${o.customer || 'Unknown'}`, 18, y)
        y += 5
        o.items.forEach(it => {
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(10)
          doc.text(`  ${it.quantity}x ${it.item_name}`, 20, y)
          y += 5
        })
        if (o.notes) {
          doc.setFontSize(9)
          doc.setTextColor(120, 100, 82)
          doc.text(`  ${o.notes}`, 20, y)
          doc.setTextColor(0, 0, 0)
          y += 5
        }
        doc.setFontSize(10)
        doc.text(`  ${o.status}${o.paid ? ' · Paid' : ' · Unpaid'}${o.price ? ` · $${Number(o.price).toFixed(2)}` : ''}`, 20, y)
        y += 7
      })
      y += 4
    })

    doc.save(`orders-${today}.pdf`)
  }

  return (
    <div className="ss-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Hanken+Grotesk:wght@400;500;600;700&display=swap');

        .ss-root{
          --paper:#FBF4E9; --card:#FFFDF8; --ink:#33241A; --ink-soft:#7A6452;
          --line:#E7D9C5; --berry:#B5394F; --terra:#C8643C; --amber:#D9982E;
          --sage:#6F8C57; --shadow:rgba(110,80,50,.16);
          font-family:'Hanken Grotesk',sans-serif; color:var(--ink);
          background:
            radial-gradient(140% 90% at 12% -10%, #FCEFDC 0%, transparent 55%),
            radial-gradient(120% 80% at 100% 0%, #F7E7E9 0%, transparent 45%),
            var(--paper);
          min-height:100%; width:100%; padding:22px 16px 60px; box-sizing:border-box;
          overflow-x:hidden;
        }
        .ss-wrap{max-width:760px;width:100%;margin:0 auto;box-sizing:border-box;}
        .ss-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:4px;}
        .ss-title{font-family:'Fraunces',serif;font-weight:600;font-size:34px;line-height:1;letter-spacing:-.01em;margin:0;}
        .ss-title .em{font-style:italic;color:var(--terra);}
        .ss-sub{color:var(--ink-soft);font-size:14px;margin:6px 0 18px;}
        .ss-gear{border:1px solid var(--line);background:var(--card);border-radius:50px;
          padding:8px 14px;font-size:13px;font-weight:600;color:var(--ink-soft);cursor:pointer;
          font-family:inherit;white-space:nowrap;}
        .ss-gear:hover{color:var(--ink);border-color:var(--terra);}
        .ss-search{width:100%;box-sizing:border-box;font-family:inherit;font-size:15px;border:1px solid var(--line);
          border-radius:12px;padding:10px 14px;outline:none;background:var(--card);color:var(--ink);margin-bottom:18px;}
        .ss-card{background:var(--card);border:1px solid var(--line);border-radius:18px;
          box-shadow:0 8px 24px -16px var(--shadow);}
        .ss-form{padding:18px;margin-bottom:26px;}
        .ss-form h2{font-family:'Fraunces',serif;font-weight:600;font-size:18px;margin:0 0 14px;}
        .ss-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
        .ss-field{display:flex;flex-direction:column;gap:5px;}
        .ss-field.full{grid-column:1 / -1;}
        .ss-field label{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-soft);}
        .ss-field input,.ss-field textarea,.ss-field select{
          font-family:inherit;font-size:15px;color:var(--ink);background:#fff;
          border:1px solid var(--line);border-radius:11px;padding:10px 12px;outline:none;
          width:100%;box-sizing:border-box;max-width:100%;}
        .ss-field input:focus,.ss-field textarea:focus,.ss-field select:focus{border-color:var(--terra);box-shadow:0 0 0 3px rgba(200,100,60,.12);}
        .ss-field textarea{resize:vertical;min-height:46px;}
        .ss-item-row{display:flex;gap:8px;margin-bottom:8px;align-items:center;width:100%;box-sizing:border-box;}
        .ss-item-row select{flex:2;font-family:inherit;font-size:14px;border:1px solid var(--line);border-radius:9px;padding:8px 10px;outline:none;box-sizing:border-box;min-width:0;}
        .ss-item-row input.item-name{flex:2;font-family:inherit;font-size:14px;border:1px solid var(--line);border-radius:9px;padding:8px 10px;outline:none;box-sizing:border-box;min-width:0;}
        .ss-item-row input.item-qty{flex:0.6;font-family:inherit;font-size:14px;border:1px solid var(--line);border-radius:9px;padding:8px 10px;outline:none;box-sizing:border-box;min-width:0;}
        .ss-add-row{background:transparent;border:1px dashed var(--line);border-radius:9px;padding:8px 14px;
          font-family:inherit;font-size:13px;color:var(--ink-soft);cursor:pointer;margin-top:2px;}
        .ss-warn{margin:12px 0 4px;border-radius:11px;padding:9px 12px;font-size:13px;font-weight:600;
          display:flex;align-items:center;gap:8px;}
        .ss-dot{width:9px;height:9px;border-radius:50%;flex:none;}
        .lv-open{background:#EEF4E7;color:#46612F;} .lv-open .ss-dot{background:var(--sage);}
        .lv-filling{background:#FCF0D9;color:#8A5B12;} .lv-filling .ss-dot{background:var(--amber);}
        .lv-full{background:#FBE6E6;color:#8E2433;} .lv-full .ss-dot{background:var(--berry);}
        .ss-actions{display:flex;gap:10px;margin-top:14px;}
        .ss-btn{font-family:inherit;font-weight:700;font-size:14px;border-radius:11px;padding:11px 18px;cursor:pointer;border:none;}
        .ss-btn-primary{background:var(--terra);color:#fff;box-shadow:0 6px 16px -8px rgba(200,100,60,.8);}
        .ss-btn-primary:hover{background:#b9572f;}
        .ss-btn-ghost{background:transparent;color:var(--ink-soft);border:1px solid var(--line);}
        .ss-btn-ghost:hover{color:var(--ink);}
        .ss-day{margin-bottom:18px;}
        .ss-day-head{display:flex;align-items:center;gap:10px;margin:0 4px 8px;}
        .ss-day-name{font-family:'Fraunces',serif;font-weight:600;font-size:17px;}
        .ss-day-name .tag{font-family:'Hanken Grotesk';font-size:11px;font-weight:700;
          background:var(--terra);color:#fff;padding:2px 8px;border-radius:50px;margin-left:8px;vertical-align:middle;}
        .ss-day-name .tag.past{background:var(--berry);}
        .ss-pill{margin-left:auto;font-size:12px;font-weight:700;padding:4px 11px;border-radius:50px;
          display:inline-flex;align-items:center;gap:6px;}
        .ss-order{display:flex;gap:12px;align-items:flex-start;padding:14px 16px;border-top:1px solid var(--line);cursor:pointer;}
        .ss-order:first-child{border-top:none;}
        .ss-order .qty{font-family:'Fraunces',serif;font-weight:600;font-size:15px;
          background:#F4E9D8;border-radius:9px;min-width:34px;height:34px;display:flex;align-items:center;justify-content:center;flex:none;}
        .ss-order .body{flex:1;min-width:0;}
        .ss-order .item{font-weight:600;font-size:15px;}
        .ss-order .who{font-size:13px;color:var(--ink-soft);}
        .ss-order .notes{font-size:13px;color:var(--ink-soft);margin-top:3px;font-style:italic;}
        .ss-order .rowend{display:flex;align-items:center;gap:6px;flex:none;flex-wrap:wrap;justify-content:flex-end;max-width:170px;}        .ss-status{font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;
          border:none;cursor:pointer;font-family:inherit;border-radius:50px;padding:5px 11px;}
        .st-New{background:#FBE6E6;color:#8E2433;} .st-Confirmed{background:#E7EEF6;color:#2D4F77;}
        .st-Baking{background:#FCF0D9;color:#8A5B12;} .st-Done{background:#EEF4E7;color:#46612F;}
        .ss-icon{border:none;background:transparent;cursor:pointer;color:var(--ink-soft);font-size:15px;padding:4px 6px;border-radius:8px;font-family:inherit;}
        .ss-icon:hover{background:#F1E6D6;color:var(--ink);}
        .done .item,.done .who{text-decoration:line-through;opacity:.55;}
        .ss-empty{text-align:center;color:var(--ink-soft);padding:40px 20px;}
        .ss-empty .big{font-family:'Fraunces',serif;font-style:italic;font-size:20px;color:var(--ink);margin-bottom:6px;}
        .ss-settings{padding:18px;margin-bottom:26px;border-style:dashed;}
        .ss-settings .row{display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap;}
        .ss-settings input{width:64px;}
        .ss-clear{background:transparent;color:var(--berry);border:1px solid #EBC6CB;border-radius:11px;
          padding:9px 14px;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit;}
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.95); }
          60% { transform: scale(1.02); }
          100% { opacity: 1; transform: scale(1); }
        }
        @media(max-width:520px){
          .ss-grid{grid-template-columns:1fr;}
          .ss-title{font-size:28px;}
          .ss-order .rowend{max-width:none;}
          .ss-item-row{flex-wrap:wrap;}
          .ss-item-row select{flex:1 1 100%;}
          .ss-item-row input.item-name{flex:1 1 100%;}
          .ss-item-row input.item-qty{flex:1 1 100%;}
        }
      `}</style>

      <div className="ss-wrap">

        {toast && (
          <div style={{
            position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
            background: '#33241A', color: '#fff', borderRadius: 50, padding: '10px 20px',
            fontSize: 13, fontWeight: 700, zIndex: 300, whiteSpace: 'nowrap',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
          }}>
            {toast}
          </div>
        )}

        {viewPhoto && (
          <div onClick={() => setViewPhoto(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(51,36,26,0.85)', zIndex: 350, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, cursor: 'pointer' }}>
            <img src={viewPhoto} alt="inspiration full" style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: 12, objectFit: 'contain' }} />
          </div>
        )}

        {viewOrder && (
          <div onClick={() => setViewOrder(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(51,36,26,0.6)', zIndex: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#FFFDF8', borderRadius: 20, maxWidth: 480, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
              {viewOrder.inspiration_photo_url && (
                <img src={viewOrder.inspiration_photo_url} alt="inspiration" style={{ width: '100%', maxHeight: 260, objectFit: 'cover', borderRadius: '20px 20px 0 0', cursor: 'pointer' }} onClick={() => setViewPhoto(viewOrder.inspiration_photo_url)} />
              )}
              <div style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 600 }}>{viewOrder.customer || 'Order'}</div>
                  <button onClick={() => setViewOrder(null)} style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink-soft)' }}>✕</button>
                </div>
                <div style={{ fontSize: 14, color: 'var(--ink-soft)', marginBottom: 4 }}>
                  {viewOrder.contact || ''}
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 14 }}>{fmtLong(viewOrder.dueDate)}</div>

                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 8 }}>Items</div>
                  {viewOrder.items.map(it => {
                    const sub = subcategories.find(s => s.id === it.subcategory_id)
                    const opt = subcategoryOptions.find(o => o.id === it.option_id)
                    return (
                      <div key={it.id} style={{ display: 'flex', flexDirection: 'column', padding: '6px 0', borderTop: '1px solid var(--line)', fontSize: 14 }}>
                        <span style={{ fontWeight: 600 }}>{it.quantity}× {it.item_name}</span>
                        {(sub || opt) && <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{[sub?.name, opt?.label].filter(Boolean).join(' · ')}</span>}
                      </div>
                    )
                  })}
                </div>

                {viewOrder.notes && (
                  <div style={{ fontSize: 14, color: 'var(--ink-soft)', fontStyle: 'italic', padding: 12, background: 'var(--paper)', borderRadius: 10, marginBottom: 14 }}>{viewOrder.notes}</div>
                )}

                {orderSupplies.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 8 }}>Supplies needed</div>
                    {orderSupplies.map(s => (
                      <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid var(--line)', fontSize: 14 }}>
                        <span>{s.supply_name}</span>
                        {s.quantity && <span style={{ color: 'var(--ink-soft)' }}>{s.quantity}</span>}
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 50, background: viewOrder.paid ? '#EEF4E7' : '#F4E9D8', color: viewOrder.paid ? '#46612F' : 'var(--ink-soft)' }}>{viewOrder.paid ? 'Paid' : 'Unpaid'}</span>
                  <span className={`ss-status st-${viewOrder.status}`}>{viewOrder.status}</span>
                  {viewOrder.price && <span style={{ fontSize: 13, color: 'var(--ink-soft)', alignSelf: 'center' }}>${Number(viewOrder.price).toFixed(2)}</span>}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="ss-head">
          <div>
            <h1 className="ss-title">
              {settings.bakerName ? `${settings.bakerName}'s` : "The"} <span className="em">Bake</span> Book
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="ss-gear" onClick={exportPDF}>Export PDF</button>
            <button className="ss-gear" onClick={() => setShowSettings((s) => !s)}>
              {showSettings ? "Close" : "Settings"}
            </button>
          </div>
        </div>
        <p className="ss-sub">
          Add every order here before saying yes — each day shows how full it already is.
        </p>

        <input
          className="ss-search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by customer or item..."
        />

        {showSettings && (
          <div className="ss-card ss-settings">
            <div className="row">
              <label style={{ fontSize: 13, fontWeight: 600 }}>Baker name</label>
              <input
                style={{ width: 160, fontFamily: "inherit", fontSize: 15, padding: "8px 10px",
                  border: "1px solid var(--line)", borderRadius: 10 }}
                value={settings.bakerName}
                placeholder="optional"
                onChange={async (e) => {
                  const bakerName = e.target.value
                  setSettings({ ...settings, bakerName })
                  const { data: { user } } = await supabase.auth.getUser()
                  await supabase.from('settings').upsert(
                    { user_id: user.id, baker_name: bakerName, daily_capacity: settings.dailyCapacity },
                    { onConflict: 'user_id' }
                  )
                }}
              />
            </div>
            <div className="row">
              <label style={{ fontSize: 13, fontWeight: 600 }}>Orders she can handle per day</label>
              <input
                type="number" min="1"
                style={{ fontFamily: "inherit", fontSize: 15, padding: "8px 10px",
                  border: "1px solid var(--line)", borderRadius: 10 }}
                value={settings.dailyCapacity}
                onChange={async (e) => {
                  const dailyCapacity = Math.max(1, Number(e.target.value) || 1)
                  setSettings({ ...settings, dailyCapacity })
                  const { data: { user } } = await supabase.auth.getUser()
                  await supabase.from('settings').upsert(
                    { user_id: user.id, baker_name: settings.bakerName, daily_capacity: dailyCapacity },
                    { onConflict: 'user_id' }
                  )
                }}
              />
            </div>
            <button className="ss-clear" onClick={clearAll}>Clear all orders</button>
          </div>
        )}

        {/* ADD / EDIT FORM */}
        <div className="ss-card ss-form" id="ss-form">
          <h2>{editingId ? "Edit order" : "New order"}</h2>
          <div className="ss-grid">
            <div className="ss-field">
              <label>Customer</label>
              <select
                value={form.customer_id || ''}
                onChange={(e) => {
                  if (e.target.value === '__new__') { setShowQuickAdd(true); return }
                  const id = e.target.value
                  const found = customers.find(c => c.id === id)
                  setForm(f => ({ ...f, customer_id: id || null, customer: found?.name || '' }))
                }}
              >
                <option value=''>Select a customer...</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
                <option value='__new__'>+ Add new customer</option>
              </select>
            </div>
            <div className="ss-field">
              <label>Phone (optional)</label>
              <input value={form.contact}
                onChange={(e) => setForm({ ...form, contact: e.target.value })}
                placeholder="for the reply text" />
            </div>

            {showQuickAdd && (
              <div className="ss-field full" style={{ background: '#FBF4E9', border: '1px solid var(--line)', borderRadius: 12, padding: 12 }}>
                <label>New customer name</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={quickName}
                    onChange={e => setQuickName(e.target.value)}
                    placeholder="Maria"
                    style={{ flex: 1 }}
                  />
                  <button
                    onClick={async () => {
                      if (!quickName.trim()) return
                      const { data, error } = await supabase.from('customers').insert({ name: quickName }).select().single()
                      if (!error) {
                        setCustomers(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
                        setForm(f => ({ ...f, customer_id: data.id, customer: data.name }))
                        setQuickName('')
                        setShowQuickAdd(false)
                      }
                    }}
                    className="ss-btn ss-btn-primary"
                    type="button"
                  >
                    Save
                  </button>
                  <button onClick={() => { setShowQuickAdd(false); setQuickName('') }} className="ss-btn ss-btn-ghost" type="button">Cancel</button>
                </div>
              </div>
            )}

            <div className="ss-field full">
              <label>Items in this order</label>
              {itemRows.map(row => (
                <div key={row.uid} style={{ border: '1px solid var(--line)', borderRadius: 11, padding: 10, marginBottom: 8 }}>
                  <div className="ss-item-row" style={{ marginBottom: subcategories.some(s => s.category_id === recipes.find(r => r.id === row.recipe_id)?.category_id) ? 8 : 0 }}>
                    <select
                      value={row.recipe_id || ''}
                      onChange={e => {
                        const id = e.target.value || null
                        const found = recipes.find(r => r.id === id)
                        updateItemRow(row.uid, { recipe_id: id, item_name: found?.name || row.item_name, subcategory_id: null, option_id: null })
                      }}
                    >
                      <option value=''>Custom / no recipe</option>
                      {recipes.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                    <input
                      className="item-name"
                      value={row.item_name}
                      onChange={e => updateItemRow(row.uid, { item_name: e.target.value })}
                      placeholder="2-tier vanilla cake"
                    />
                    <input
                      className="item-qty"
                      type="number" min="1"
                      value={row.quantity}
                      onChange={e => updateItemRow(row.uid, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                    />
                    {itemRows.length > 1 && (
                      <button className="ss-icon" type="button" onClick={() => removeItemRow(row.uid)}>✕</button>
                    )}
                  </div>

                  {(() => {
                    const recipe = recipes.find(r => r.id === row.recipe_id)
                    if (!recipe?.category_id) return null
                    const types = subcategories.filter(s => s.category_id === recipe.category_id)
                    if (types.length === 0) return null
                    const sizeOptions = subcategoryOptions.filter(o => o.subcategory_id === row.subcategory_id)
                    return (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <select
                          value={row.subcategory_id || ''}
                          onChange={e => updateItemRow(row.uid, { subcategory_id: e.target.value || null, option_id: null })}
                          style={{ flex: 1, fontFamily: 'inherit', fontSize: 13, border: '1px solid var(--line)', borderRadius: 9, padding: '7px 9px', outline: 'none' }}
                        >
                          <option value=''>Type...</option>
                          {types.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                        {row.subcategory_id && sizeOptions.length > 0 && (
                          <select
                            value={row.option_id || ''}
                            onChange={e => updateItemRow(row.uid, { option_id: e.target.value || null })}
                            style={{ flex: 1, fontFamily: 'inherit', fontSize: 13, border: '1px solid var(--line)', borderRadius: 9, padding: '7px 9px', outline: 'none' }}
                          >
                            <option value=''>Size...</option>
                            {sizeOptions.map(o => (
                              <option key={o.id} value={o.id}>{o.label}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    )
                  })()}
                </div>
              ))}
              <button className="ss-add-row" type="button" onClick={addItemRow}>+ Add another item</button>
            </div>

            <div className="ss-field">
              <label>Due date</label>
              <input type="date" value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
            <div className="ss-field">
              <label>Price ($)</label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div className="ss-field full">
              <label>Notes</label>
              <textarea value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="gluten free, pickup 4pm..." />
            </div>

            <div className="ss-field full">
              <label>Inspiration photo (optional)</label>
              <div
                onClick={() => inspoRef.current.click()}
                style={{ border: '2px dashed var(--line)', borderRadius: 11, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', background: '#fff' }}
              >
                {inspoPreview || form.inspiration_photo_url
                  ? <img src={inspoPreview || form.inspiration_photo_url} alt="inspiration" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ textAlign: 'center', color: 'var(--ink-soft)', fontSize: 13 }}>📷 Tap to add a photo from the customer</div>
                }
              </div>
              <input ref={inspoRef} type="file" accept="image/*" onChange={handleInspoChange} style={{ display: 'none' }} />
            </div>

            <div className="ss-field full">
              <label>Supplies needed (optional)</label>
              {supplyRows.map((row, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input
                    value={row.supply_name}
                    onChange={e => updateSupplyRow(i, 'supply_name', e.target.value)}
                    placeholder="Fondant, edible glitter, cake topper..."
                    style={{ flex: 2 }}
                  />
                  <input
                    value={row.quantity}
                    onChange={e => updateSupplyRow(i, 'quantity', e.target.value)}
                    placeholder="qty / notes"
                    style={{ flex: 1 }}
                  />
                  <button onClick={() => removeSupplyRow(i)} className="ss-icon" type="button">✕</button>
                </div>
              ))}
              <button onClick={addSupplyRow} type="button" className="ss-add-row">+ Add supply</button>
            </div>
          </div>

          <div className={`ss-warn lv-${formCap.level}`}>
            <span className="ss-dot" />
            <span>
              {fmtShort(form.dueDate)}: {formCap.label}.
              {formCap.level === "full" && " Adding this puts her over — check before you commit."}
              {formCap.level === "filling" && " One more and that day is full."}
            </span>
          </div>

          <div className="ss-actions">
            <button className="ss-btn ss-btn-primary" onClick={submit}>
              {editingId ? "Save changes" : "Add order"}
            </button>
            {editingId && (
              <button className="ss-btn ss-btn-ghost" onClick={cancelEdit}>Cancel</button>
            )}
          </div>
        </div>

        {/* LIST */}
        {loading ? (
          <div className="ss-empty">Loading…</div>
        ) : grouped.length === 0 ? (
          <div className="ss-card ss-empty">
            <div className="big">No orders yet</div>
            <div>Add the first one above and it'll show up here, sorted by date.</div>
          </div>
        ) : (
          grouped.map(({ date, items }) => {
            const active = items.filter((o) => o.status !== "Done").length;
            const cap = capInfo(active);
            const isPast = date < today;
            const isToday = date === today;
            const isTomorrow = date === tomorrow;
            return (
              <div className="ss-day" key={date}>
                <div className="ss-day-head">
                  <span className="ss-day-name">
                    {fmtLong(date)}
                    {isToday && <span className="tag">Today</span>}
                    {isTomorrow && <span className="tag" style={{ background: '#D9982E' }}>Tomorrow</span>}
                    {isPast && active > 0 && <span className="tag past">Past due</span>}
                  </span>
                  <span className={`ss-pill lv-${cap.level}`}>
                    <span className="ss-dot" /> {cap.label}
                  </span>
                </div>
                <div className="ss-card">
                  {items.map((o) => (
                    <div
                      className={`ss-order ${o.status === "Done" ? "done" : ""}`}
                      key={o.id}
                      style={{ animation: 'popIn 0.25s ease forwards' }}
                      onClick={() => { setViewOrder(o); loadOrderSupplies(o.id) }}
                    >
                      <div className="qty">{o.items.reduce((sum, it) => sum + it.quantity, 0)}×</div>
                      <div className="body">
                        <div className="item">{itemSummary(o) || "—"}</div>
                        <div className="who">
                          {o.customer || "—"}{o.contact ? ` · ${o.contact}` : ""}
                        </div>
                        {o.notes && <div className="notes">{o.notes}</div>}
                      </div>
                      <div className="rowend" onClick={e => e.stopPropagation()}>
                        <button className={`ss-status st-${o.status}`}
                          onClick={() => cycleStatus(o.id)} title="Tap to change">
                          {o.status}
                        </button>
                        <button className="ss-status" style={{ background: o.paid ? '#EEF4E7' : '#F4E9D8', color: o.paid ? '#46612F' : 'var(--ink-soft)' }} onClick={() => togglePaid(o.id)} title="Toggle paid">
                          {o.paid ? 'Paid' : 'Unpaid'}
                        </button>
                        <button className="ss-icon" onClick={() => startEdit(o)} title="Edit">✎</button>
                        <button className="ss-icon" onClick={() => remove(o.id)} title="Delete">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}