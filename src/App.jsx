import { useState } from 'react'
import SweetSchedule from './SweetSchedule.jsx'
import Customers from './Customers.jsx'

function App() {
  const [tab, setTab] = useState('orders')

  return (
    <div style={{ paddingBottom: 64 }}>
      {tab === 'orders' && <SweetSchedule />}
      {tab === 'customers' && <Customers />}

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#FFFDF8', borderTop: '1px solid #E7D9C5', display: 'flex', zIndex: 100 }}>
        <button onClick={() => setTab('orders')} style={{ flex: 1, padding: '14px 0', fontFamily: 'Hanken Grotesk, sans-serif', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', background: 'transparent', color: tab === 'orders' ? '#C8643C' : '#7A6452', borderTop: tab === 'orders' ? '2px solid #C8643C' : '2px solid transparent' }}>
          Orders
        </button>
        <button onClick={() => setTab('customers')} style={{ flex: 1, padding: '14px 0', fontFamily: 'Hanken Grotesk, sans-serif', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', background: 'transparent', color: tab === 'customers' ? '#C8643C' : '#7A6452', borderTop: tab === 'customers' ? '2px solid #C8643C' : '2px solid transparent' }}>
          Customers
        </button>
      </div>
    </div>
  )
}

export default App