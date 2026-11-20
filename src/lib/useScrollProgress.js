import { useEffect } from 'react'

export default function useScrollProgress(ref) {
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      el.dataset.reduce = 'true'
      el.style.setProperty('--p', '0.45')
      return undefined
    }
    let frame = 0

    function update() {
      frame = 0
      const rect = el.getBoundingClientRect()
      const span = rect.height - window.innerHeight
      const p = span > 0 ? Math.min(1, Math.max(0, -rect.top / span)) : 0
      el.style.setProperty('--p', p.toFixed(4))
    }

    function request() {
      if (!frame) frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', request, { passive: true })
    window.addEventListener('resize', request)
    return () => {
      window.removeEventListener('scroll', request)
      window.removeEventListener('resize', request)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [ref])
}