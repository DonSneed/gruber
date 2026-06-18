import { useEffect, useRef } from 'react'
import urodWurmSrc from '../assets/thats-you/urodWurm/russischerWurm.gif'

interface Props {
  onDismiss: () => void
}

const SPEED = 360 // px/s

export function UrodWurmEgg({ onDismiss }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const posRef = useRef({ x: 0, y: 0 })
  const initAngle = useRef(Math.random() * Math.PI * 2)
  const velRef = useRef({
    x: Math.cos(initAngle.current) * SPEED,
    y: Math.sin(initAngle.current) * SPEED,
  })
  const lastTimeRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const throwTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dragOriginRef = useRef<{ x: number; y: number } | null>(null)
  const prevPointerRef = useRef<{ x: number; y: number; t: number } | null>(null)
  const dragVelRef = useRef({ x: 0, y: 0 })

  function applyTransform(x: number, y: number, rotate = 0) {
    const el = containerRef.current
    if (!el) return
    el.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${rotate}deg)`
  }

  function startBounce() {
    lastTimeRef.current = null
    rafRef.current = requestAnimationFrame(function tick(time) {
      if (!containerRef.current) { rafRef.current = requestAnimationFrame(tick); return }

      const dt = lastTimeRef.current !== null
        ? Math.min((time - lastTimeRef.current) / 1000, 0.05)
        : 0
      lastTimeRef.current = time

      const el = containerRef.current
      const elW = el.offsetWidth || 280
      const elH = el.offsetHeight || 220
      const maxX = (window.innerWidth - elW) / 2
      const maxY = (window.innerHeight - elH) / 2

      posRef.current.x += velRef.current.x * dt
      posRef.current.y += velRef.current.y * dt

      if (posRef.current.x > maxX)  { posRef.current.x = maxX;  velRef.current.x = -Math.abs(velRef.current.x) }
      if (posRef.current.x < -maxX) { posRef.current.x = -maxX; velRef.current.x =  Math.abs(velRef.current.x) }
      if (posRef.current.y > maxY)  { posRef.current.y = maxY;  velRef.current.y = -Math.abs(velRef.current.y) }
      if (posRef.current.y < -maxY) { posRef.current.y = -maxY; velRef.current.y =  Math.abs(velRef.current.y) }

      applyTransform(posRef.current.x, posRef.current.y)
      rafRef.current = requestAnimationFrame(tick)
    })
  }

  useEffect(() => {
    startBounce()
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      if (throwTimerRef.current !== null) clearTimeout(throwTimerRef.current)
    }
  }, [])

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    dragOriginRef.current = { x: e.clientX - posRef.current.x, y: e.clientY - posRef.current.y }
    prevPointerRef.current = { x: e.clientX, y: e.clientY, t: e.timeStamp }
    dragVelRef.current = { x: 0, y: 0 }
    if (containerRef.current) containerRef.current.style.cursor = 'grabbing'
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragOriginRef.current) return
    posRef.current = { x: e.clientX - dragOriginRef.current.x, y: e.clientY - dragOriginRef.current.y }
    applyTransform(posRef.current.x, posRef.current.y)
    if (prevPointerRef.current) {
      const dt = e.timeStamp - prevPointerRef.current.t
      if (dt > 5) {
        dragVelRef.current = {
          x: (e.clientX - prevPointerRef.current.x) / dt,
          y: (e.clientY - prevPointerRef.current.y) / dt,
        }
      }
    }
    prevPointerRef.current = { x: e.clientX, y: e.clientY, t: e.timeStamp }
  }

  function onPointerUp() {
    if (!dragOriginRef.current) return
    dragOriginRef.current = null
    if (containerRef.current) containerRef.current.style.cursor = 'grab'

    const speed = Math.hypot(dragVelRef.current.x, dragVelRef.current.y)
    const dist = Math.hypot(posRef.current.x, posRef.current.y)

    if (speed > 0.5 || dist > window.innerWidth * 0.35) {
      const magnitude = Math.max(speed * 500, 800)
      const dir = speed > 0.5
        ? { x: dragVelRef.current.x / speed, y: dragVelRef.current.y / speed }
        : { x: posRef.current.x / dist, y: posRef.current.y / dist }
      const el = containerRef.current
      if (el) {
        el.style.transition = 'transform 0.45s ease-out, opacity 0.45s'
        el.style.opacity = '0'
        applyTransform(
          posRef.current.x + dir.x * magnitude,
          posRef.current.y + dir.y * magnitude,
          dir.x * 20,
        )
      }
      throwTimerRef.current = setTimeout(onDismiss, 450)
    } else {
      // Resume bouncing; if released with some drag velocity, use it
      const dragSpeed = Math.hypot(dragVelRef.current.x, dragVelRef.current.y)
      if (dragSpeed > 0.05) {
        velRef.current = {
          x: (dragVelRef.current.x / dragSpeed) * SPEED,
          y: (dragVelRef.current.y / dragSpeed) * SPEED,
        }
      }
      startBounce()
    }
  }

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        position: 'fixed',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        cursor: 'grab',
        userSelect: 'none',
        touchAction: 'none',
        zIndex: 9999,
        width: '280px',
        maxWidth: '80vw',
      }}
      className="overflow-hidden rounded-2xl border-4 border-white shadow-2xl"
    >
      <p className="bg-white px-3 py-2 text-center text-sm font-semibold text-ink">
        Привет, моя маленькая девочка
      </p>
      <img
        src={urodWurmSrc}
        alt=""
        draggable={false}
        style={{ width: '100%', display: 'block', pointerEvents: 'none' }}
      />
    </div>
  )
}
