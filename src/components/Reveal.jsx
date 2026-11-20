import { useEffect, useRef, useState } from 'react'

export default function Reveal({ as: Tag = 'div', delay = 0, className = '', children, ...rest }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    if (!('IntersectionObserver' in window)) {
      setShown(true)
      return undefined
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <Tag
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition duration-700 ease-out motion-reduce:transition-none ${
        shown ? 'translate-y-0 opacity-100 blur-0' : 'translate-y-10 opacity-0 blur-sm motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:blur-0'
      } ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  )
}