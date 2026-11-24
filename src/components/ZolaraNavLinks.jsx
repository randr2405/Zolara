import { useLocation, useNavigate } from 'react-router-dom'
import GooeyNav from './GooeyNav'
import './ZolaraNavLinks.css'

const LINKS = [
  { label: 'Products', to: '/shop?type=product' },
  { label: 'Services', to: '/shop?type=service' },
  { label: 'Under R250', to: '/shop?type=product&max=250' },
  { label: 'Everything', to: '/shop' },
]

const ITEMS = LINKS.map(({ label }) => ({ label }))

const PARTICLES = ['#C9A24B', '#A67C2E', '#0B3D2E']

function activeIndexFor(pathname, search) {
  if (pathname !== '/shop') return -1
  const params = new URLSearchParams(search)
  if (params.get('max') === '250') return 2
  if (params.get('type') === 'product') return 0
  if (params.get('type') === 'service') return 1
  return 3
}

export default function ZolaraNavLinks({ className = '' }) {
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const matched = activeIndexFor(pathname, search)
  const idle = matched < 0

  function handleClick(event) {
    const item = event.target.closest('[data-gooey-index]')
    if (!item) return
    const link = LINKS[Number(item.dataset.gooeyIndex)]
    if (link) navigate(link.to)
  }

  return (
    <div
      onClickCapture={handleClick}
      className={`zolara-gooey${idle ? ' zolara-gooey--idle' : ''} ${className}`.trim()}
    >
      <GooeyNav
        items={ITEMS}
        activeIndex={Math.max(0, matched)}
        theme="light"
        size="sm"
        frame={false}
        color="#0B3D2E"
        activeTextColor="#FAF6EE"
        colors={PARTICLES}
        particleCount={12}
        spread={44}
        animationTime={550}
        timeVariance={250}
        gooeyness={0.55}
        wobble={0.45}
        hoverEffect
        style={{ '--gn-ink': '#0B3D2E', '--gn-muted': 'rgba(43, 43, 43, 0.7)' }}
      />
    </div>
  )
}