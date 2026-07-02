import { useRef, useEffect } from 'react'
import { useStore } from '../store.jsx'
import { Wrap } from '../components/atoms.jsx'
import { MatchRow } from '../components/MatchRow.jsx'
import { dateKey } from '../lib/util.js'

export function Matches() {
  const { th, D, filter, setFilter } = useStore()
  let list = D.MATCHES.slice()
  if (filter === 'live') list = list.filter(m => m.status === 'LIVE')
  else if (filter === 'upcoming') list = list.filter(m => m.status === 'UP')
  else if (filter !== 'all') list = list.filter(m => m.g === filter)

  // group by date, newest date first
  const byDate = {}; const order = []
  list.forEach(m => { if (!byDate[m.date]) { byDate[m.date] = []; order.push(m.date) } byDate[m.date].push(m) })
  order.sort((a, b) => dateKey(b) - dateKey(a))

  // which date group to land on when entering this view: today, else the nearest
  // upcoming date, else the most recent.
  const todayKey = dateKey(D.TODAY)
  let target = byDate[D.TODAY] ? D.TODAY : null
  if (!target) {
    const upcoming = order.filter(d => dateKey(d) >= todayKey)
    target = upcoming.length ? upcoming[upcoming.length - 1] : order[0]
  }
  const todayRef = useRef(null)
  const scrolledRef = useRef(false)
  useEffect(() => {
    if (!scrolledRef.current && todayRef.current) {
      todayRef.current.scrollIntoView({ block: 'start' })
      scrolledRef.current = true
    }
  })

  const chip = (val, label) => {
    const on = filter === val
    return (
      <button key={val} type="button" onClick={() => setFilter(val)} style={{
        border: '1px solid ' + (on ? th.accent : th.bd), background: on ? th.accent : th.sf, color: on ? '#fff' : th.sub,
        cursor: 'pointer', font: 'inherit', fontSize: 13, fontWeight: 700, padding: '7px 13px', borderRadius: 9999, whiteSpace: 'nowrap',
      }}>{label}</button>
    )
  }

  return (
    <Wrap>
      <div className="wc-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 10, marginBottom: 18 }}>
        {chip('all', 'All')}
        {chip('live', 'Live')}
        {chip('upcoming', 'Upcoming')}
        {D.grouped ? 'ABCDEFGHIJKL'.split('').map(g => chip(g, 'Group ' + g)) : null}
      </div>
      {order.map(d => (
        <div key={d} ref={d === target ? todayRef : null} style={{ marginBottom: 22, scrollMarginTop: 80 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 2px 10px' }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: d === target ? th.accent : th.tx, letterSpacing: '-0.01em' }}>{d}</span>
            <span style={{ height: 1, flex: 1, background: th.bd }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 10 }}>
            {byDate[d].map(m => <MatchRow key={m.id} m={m} />)}
          </div>
        </div>
      ))}
    </Wrap>
  )
}
