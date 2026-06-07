export default function HomePage() {
  const token = process.env.ACCESS_TOKEN || ''
  return (
    <iframe
      src={`/shenshu.html?v=20260607&t=${token}`}
      title="天機 · 問天"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        border: 'none',
      }}
    />
  )
}
