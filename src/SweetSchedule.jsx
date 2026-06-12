import React, { useState, useEffect, useMemo } from "react";
import { supabase } from './supabase'

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

// ---- component -----------------------------------------------------------
export default function SweetSchedule() {
  const [orders, setOrders] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [customers, setCustomers] = useState([]);

  const blankForm = () => ({
    customer: "",
    contact: "",
    customer_id: null,
    item: "",
    qty: 1,
    dueDate: todayStr(),
    notes: "",
    status: "New",
  });
  const [form, setForm] = useState(blankForm());
  const [staged, setStaged] = useState([]);

  // load orders
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .order('due_date', { ascending: true })
        if (error) throw error
        const mapped = data.map(o => ({
          id: o.id,
          customer: o.customer_name,
          contact: o.contact,
          item: o.item,
          qty: o.qty,
          dueDate: o.due_date,
          notes: o.notes,
          status: o.status,
          createdAt: new Date(o.created_at).getTime(),
        }))
        setOrders(mapped)
      } catch (e) {
        console.error('load error', e)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // load customers
  // load customers
useEffect(() => {
  supabase.from('customers').select('*').order('name').then(({ data, error }) => {
    console.log('customers:', JSON.stringify(data), 'error:', JSON.stringify(error))
    if (data) setCustomers(data)
  })
}, [])

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

  const submit = async () => {
    if (!form.item.trim()) return
    if (editingId) {
      const { error } = await supabase
        .from('orders')
        .update({
          customer_name: form.customer,
          contact: form.contact,
          customer_id: form.customer_id || null,
          item: form.item,
          qty: form.qty,
          due_date: form.dueDate,
          notes: form.notes,
          status: form.status,
        })
        .eq('id', editingId)
      if (error) console.log('Supabase error:', JSON.stringify(error))
      if (!error) {
        setOrders(prev => prev.map(o => o.id === editingId ? { ...o, ...form } : o))
        setEditingId(null)
      }
    } else {
      const { data, error } = await supabase
        .from('orders')
        .insert({
          customer_name: form.customer,
          contact: form.contact,
          customer_id: form.customer_id || null,
          item: form.item,
          qty: form.qty,
          due_date: form.dueDate,
          notes: form.notes,
          status: form.status || 'New',
        })
        .select()
        .single()
      if (error) console.log('Supabase error:', JSON.stringify(error))
      if (!error) {
        setOrders(prev => [...prev, {
          id: data.id,
          customer: data.customer_name,
          contact: data.contact,
          item: data.item,
          qty: data.qty,
          dueDate: data.due_date,
          notes: data.notes,
          status: data.status,
          createdAt: new Date(data.created_at).getTime(),
        }])
      }
    }
    setForm(blankForm())
  }

  const startEdit = (o) => {
    setEditingId(o.id);
    setForm({
      customer: o.customer,
      contact: o.contact,
      customer_id: o.customer_id || null,
      item: o.item,
      qty: o.qty,
      dueDate: o.dueDate,
      notes: o.notes,
      status: o.status,
    });
    document.getElementById("ss-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const cancelEdit = () => { setEditingId(null); setForm(blankForm()); };

  const stagedDayLoad = (date) =>
    activeCountForDate(date) + staged.filter((s) => s.dueDate === date).length;

  const updateStaged = (id, patch) =>
    setStaged((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const removeStaged = (id) => setStaged((prev) => prev.filter((s) => s.id !== id));
  const addAllStaged = () => {
    setOrders((prev) => [
      ...prev,
      ...staged.map((s, i) => ({
        customer: s.customer, contact: s.contact, item: s.item,
        qty: s.qty, dueDate: s.dueDate, notes: s.notes,
        status: "New", id: Date.now().toString(36) + i, createdAt: Date.now() + i,
      })),
    ]);
    setStaged([]);
  };

  const remove = async (id) => {
    const { error } = await supabase.from('orders').delete().eq('id', id)
    if (!error) setOrders(prev => prev.filter(o => o.id !== id))
  }

  const cycleStatus = async (id) => {
    const order = orders.find(o => o.id === id)
    const nextStatus = STATUSES[(STATUSES.indexOf(order.status) + 1) % STATUSES.length]
    const { error } = await supabase.from('orders').update({ status: nextStatus }).eq('id', id)
    if (!error) setOrders(prev => prev.map(o => o.id === id ? { ...o, status: nextStatus } : o))
  }

  const grouped = useMemo(() => {
    const map = {};
    orders.forEach((o) => {
      (map[o.dueDate] = map[o.dueDate] || []).push(o);
    });
    return Object.keys(map)
      .sort()
      .map((date) => ({
        date,
        items: map[date].sort((a, b) => a.createdAt - b.createdAt),
      }));
  }, [orders]);

  const today = todayStr();

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
          min-height:100%; padding:22px 16px 60px; box-sizing:border-box;
        }
        .ss-wrap{max-width:760px;margin:0 auto;}
        .ss-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:4px;}
        .ss-title{font-family:'Fraunces',serif;font-weight:600;font-size:34px;line-height:1;letter-spacing:-.01em;margin:0;}
        .ss-title .em{font-style:italic;color:var(--terra);}
        .ss-sub{color:var(--ink-soft);font-size:14px;margin:6px 0 22px;}
        .ss-gear{border:1px solid var(--line);background:var(--card);border-radius:50px;
          padding:8px 14px;font-size:13px;font-weight:600;color:var(--ink-soft);cursor:pointer;
          font-family:inherit;white-space:nowrap;}
        .ss-gear:hover{color:var(--ink);border-color:var(--terra);}
        .ss-card{background:var(--card);border:1px solid var(--line);border-radius:18px;
          box-shadow:0 8px 24px -16px var(--shadow);}
        .ss-form{padding:18px;margin-bottom:26px;}
        .ss-form h2{font-family:'Fraunces',serif;font-weight:600;font-size:18px;margin:0 0 14px;}
        .ss-stage{padding:0;margin-bottom:26px;overflow:hidden;}
        .ss-stage-head{padding:13px 16px;font-weight:600;font-size:14px;background:#FBEEE1;
          color:var(--ink);border-bottom:1px solid var(--line);}
        .ss-stage-row{display:flex;gap:12px;align-items:flex-start;padding:14px 16px;border-top:1px solid var(--line);}
        .ss-stage-date{display:flex;align-items:center;gap:9px;margin-top:9px;flex-wrap:wrap;}
        .ss-stage-date input{font-family:inherit;font-size:13px;color:var(--ink);background:#fff;
          border:1px solid var(--line);border-radius:9px;padding:6px 9px;outline:none;}
        .ss-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
        .ss-field{display:flex;flex-direction:column;gap:5px;}
        .ss-field.full{grid-column:1 / -1;}
        .ss-field label{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-soft);}
        .ss-field input,.ss-field textarea,.ss-field select{
          font-family:inherit;font-size:15px;color:var(--ink);background:#fff;
          border:1px solid var(--line);border-radius:11px;padding:10px 12px;outline:none;}
        .ss-field input:focus,.ss-field textarea:focus,.ss-field select:focus{border-color:var(--terra);box-shadow:0 0 0 3px rgba(200,100,60,.12);}
        .ss-field textarea{resize:vertical;min-height:46px;}
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
        .ss-order{display:flex;gap:12px;align-items:flex-start;padding:14px 16px;border-top:1px solid var(--line);}
        .ss-order:first-child{border-top:none;}
        .ss-order .qty{font-family:'Fraunces',serif;font-weight:600;font-size:15px;
          background:#F4E9D8;border-radius:9px;min-width:34px;height:34px;display:flex;align-items:center;justify-content:center;flex:none;}
        .ss-order .body{flex:1;min-width:0;}
        .ss-order .item{font-weight:600;font-size:15px;}
        .ss-order .who{font-size:13px;color:var(--ink-soft);}
        .ss-order .notes{font-size:13px;color:var(--ink-soft);margin-top:3px;font-style:italic;}
        .ss-order .rowend{display:flex;align-items:center;gap:6px;flex:none;}
        .ss-status{font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;
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
        @media(max-width:520px){.ss-grid{grid-template-columns:1fr;}.ss-title{font-size:28px;}}
      `}</style>

      <div className="ss-wrap">
        <div className="ss-head">
          <div>
            <h1 className="ss-title">
              {settings.bakerName ? `${settings.bakerName}'s` : "The"} <span className="em">Bake</span> Book
            </h1>
          </div>
          <button className="ss-gear" onClick={() => setShowSettings((s) => !s)}>
            {showSettings ? "Close" : "Settings"}
          </button>
        </div>
        <p className="ss-sub">
          Add every order here before saying yes — each day shows how full it already is.
        </p>

        {showSettings && (
          <div className="ss-card ss-settings">
            <div className="row">
              <label style={{ fontSize: 13, fontWeight: 600 }}>Baker name</label>
              <input
                style={{ width: 160, fontFamily: "inherit", fontSize: 15, padding: "8px 10px",
                  border: "1px solid var(--line)", borderRadius: 10 }}
                value={settings.bakerName}
                placeholder="optional"
                onChange={(e) => setSettings({ ...settings, bakerName: e.target.value })}
              />
            </div>
            <div className="row">
              <label style={{ fontSize: 13, fontWeight: 600 }}>Orders she can handle per day</label>
              <input
                type="number" min="1"
                style={{ fontFamily: "inherit", fontSize: 15, padding: "8px 10px",
                  border: "1px solid var(--line)", borderRadius: 10 }}
                value={settings.dailyCapacity}
                onChange={(e) =>
                  setSettings({ ...settings, dailyCapacity: Math.max(1, Number(e.target.value) || 1) })}
              />
            </div>
            <button
              className="ss-clear"
              onClick={() => {
                if (confirm("Delete all orders? This can't be undone.")) setOrders([]);
              }}
            >
              Clear all orders
            </button>
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
                  const id = e.target.value
                  const found = customers.find(c => c.id === id)
                  setForm(f => ({ ...f, customer_id: id || null, customer: found?.name || '' }))
                }}
              >
                <option value=''>Select a customer...</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="ss-field">
              <label>Phone (optional)</label>
              <input value={form.contact}
                onChange={(e) => setForm({ ...form, contact: e.target.value })}
                placeholder="for the reply text" />
            </div>
            <div className="ss-field full">
              <label>What they want</label>
              <input value={form.item}
                onChange={(e) => setForm({ ...form, item: e.target.value })}
                placeholder="2-tier vanilla birthday cake" />
            </div>
            <div className="ss-field">
              <label>Quantity</label>
              <input type="number" min="1" value={form.qty}
                onChange={(e) => setForm({ ...form, qty: Math.max(1, Number(e.target.value) || 1) })} />
            </div>
            <div className="ss-field">
              <label>Due date</label>
              <input type="date" value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
            <div className="ss-field full">
              <label>Notes</label>
              <textarea value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="gluten free, pickup 4pm, $45..." />
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

        {/* STAGED MULTI-ORDER REVIEW */}
        {staged.length > 0 && (
          <div className="ss-card ss-stage">
            <div className="ss-stage-head">
              Found {staged.length} orders in that text — check the dates, then add them.
            </div>
            {staged.map((s) => {
              const cap = capInfo(stagedDayLoad(s.dueDate));
              return (
                <div className="ss-stage-row" key={s.id}>
                  <div className="qty">{s.qty}×</div>
                  <div className="body">
                    <div className="item">{s.item || "—"}</div>
                    <div className="who">
                      {s.customer || "—"}{s.contact ? ` · ${s.contact}` : ""}
                    </div>
                    {s.notes && <div className="notes">{s.notes}</div>}
                    <div className="ss-stage-date">
                      <input type="date" value={s.dueDate}
                        onChange={(e) => updateStaged(s.id, { dueDate: e.target.value })} />
                      <span className={`ss-pill lv-${cap.level}`}>
                        <span className="ss-dot" /> {cap.label}
                      </span>
                    </div>
                  </div>
                  <button className="ss-icon" onClick={() => removeStaged(s.id)} title="Remove">✕</button>
                </div>
              );
            })}
            <div className="ss-actions" style={{ padding: "4px 16px 16px" }}>
              <button className="ss-btn ss-btn-primary" onClick={addAllStaged}>
                Add all {staged.length} orders
              </button>
              <button className="ss-btn ss-btn-ghost" onClick={() => setStaged([])}>Discard</button>
            </div>
          </div>
        )}

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
            return (
              <div className="ss-day" key={date}>
                <div className="ss-day-head">
                  <span className="ss-day-name">
                    {fmtLong(date)}
                    {isToday && <span className="tag">Today</span>}
                    {isPast && active > 0 && <span className="tag past">Past due</span>}
                  </span>
                  <span className={`ss-pill lv-${cap.level}`}>
                    <span className="ss-dot" /> {cap.label}
                  </span>
                </div>
                <div className="ss-card">
                  {items.map((o) => (
                    <div className={`ss-order ${o.status === "Done" ? "done" : ""}`} key={o.id}>
                      <div className="qty">{o.qty}×</div>
                      <div className="body">
                        <div className="item">{o.item || "—"}</div>
                        <div className="who">
                          {o.customer || "—"}{o.contact ? ` · ${o.contact}` : ""}
                        </div>
                        {o.notes && <div className="notes">{o.notes}</div>}
                      </div>
                      <div className="rowend">
                        <button className={`ss-status st-${o.status}`}
                          onClick={() => cycleStatus(o.id)} title="Tap to change">
                          {o.status}
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