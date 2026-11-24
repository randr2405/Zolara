import { useEffect, useState } from 'react'
import BlobCursor from './BlobCursor'

function canRun() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!finePointer || calm) return false
  try {
    const probe = document.createElement('canvas')
    return Boolean(probe.getContext('webgl2') || probe.getContext('webgl'))
  } catch {
    return false
  }
}

export default function SiteCursor() {
  const [active, setActive] = useState(false)

  useEffect(() => {
    setActive(canRun())
  }, [])

  useEffect(() => {
    if (!active) return undefined
    document.documentElement.classList.add('zolara-blob')
    return () => document.documentElement.classList.remove('zolara-blob')
  }, [active])

  if (!active) return null

  return (
    <BlobCursor
      material="chrome"
      color="#C9A24B"
      blend="normal"
      size={26}
      morph={0}
      depth={0.8}
      trail={8}
      lag={0.5}
      goo={0.7}
      stretch={0.5}
      wobble={0.6}
      drip={0}
      shine={1}
      splash
      splashCount={5}
      splashSpeed={0.35}
      splashSize={0.3}
      splashGravity={0}
      regrow={0.6}
      shadow={false}
      hideCursor={false}
    />
  )
}