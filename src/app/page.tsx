export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function HomePage() {
  return (
    <iframe
      src="/shenshu.html"
      title="問道 · 叩問古今"
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
