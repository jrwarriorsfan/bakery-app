import IconWhisk from './assets/icons/IconWhisk.jsx'

export default function SectionDivider({ style = {} }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        margin: '8px 0',
        ...style,
      }}
    >
      <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
      <IconWhisk style={{ width: 50, height: 50, color: 'var(--ink-soft)', flexShrink: 0, transform: 'rotate(270deg)' }} />
      <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
    </div>
  )
}
