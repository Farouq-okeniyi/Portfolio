import gsap from 'gsap'
import { TOKENS } from './palette'

function playWarpSound() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const now = ctx.currentTime

    // 1. Low engine charge-up drone
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sawtooth'
    osc1.frequency.setValueAtTime(80, now)
    osc1.frequency.exponentialRampToValueAtTime(440, now + 0.8)
    gain1.gain.setValueAtTime(0.05, now)
    gain1.gain.exponentialRampToValueAtTime(0.12, now + 0.7)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 1.1)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 1.1)

    // 2. High ion resonance shimmer
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(320, now)
    osc2.frequency.exponentialRampToValueAtTime(1400, now + 0.85)
    gain2.gain.setValueAtTime(0.03, now)
    gain2.gain.exponentialRampToValueAtTime(0.15, now + 0.8)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(now)
    osc2.stop(now + 1.2)
  } catch {
    // Audio context may be restricted
  }
}

/**
 * 1-second sci-fi warp launch animation when transitioning to an external page.
 * Creates an animated warp starfield and terminal HUD, launches the jump, then opens the URL.
 */
export function launchToExternalPage(targetUrl: string, destinationName: string = 'EXTERNAL ORBIT') {
  playWarpSound()

  let overlay = document.getElementById('warp-launch-overlay')
  if (!overlay) {
    overlay = document.createElement('div')
    overlay.id = 'warp-launch-overlay'
    overlay.className = 'warp-launch-overlay'
    document.body.appendChild(overlay)
  }
  overlay.innerHTML = ''
  overlay.style.display = 'flex'

  // Canvas for warp speed starfield streaks
  const canvas = document.createElement('canvas')
  canvas.className = 'warp-canvas'
  const ctx = canvas.getContext('2d')
  overlay.appendChild(canvas)

  const w = (canvas.width = window.innerWidth)
  const h = (canvas.height = window.innerHeight)
  const cx = w / 2
  const cy = h / 2

  // Generate 120 star particles
  const stars: Array<{ x: number; y: number; z: number; oz: number; color: string }> = []
  const palette = [
    '#' + TOKENS.ion.toString(16).padStart(6, '0'),
    '#' + TOKENS.bone.toString(16).padStart(6, '0'),
    '#' + TOKENS.ore.toString(16).padStart(6, '0'),
  ]

  for (let i = 0; i < 140; i++) {
    stars.push({
      x: (Math.random() - 0.5) * w * 2,
      y: (Math.random() - 0.5) * h * 2,
      z: Math.random() * 1000 + 100,
      oz: 1000,
      color: palette[Math.floor(Math.random() * palette.length)],
    })
  }

  // Warp HUD terminal UI
  const hud = document.createElement('div')
  hud.className = 'warp-hud'
  hud.innerHTML = `
    <div class="warp-frame">
      <div class="warp-tag">HYPERDRIVE ENGAGED // CLASS-IV JUMP</div>
      <div class="warp-dest">TARGET: <span class="dest-name">${destinationName.toUpperCase()}</span></div>
      <div class="warp-track">
        <div id="warp-fill" class="warp-fill"></div>
      </div>
      <div class="warp-telemetry">
        <span id="warp-status-txt">> INITIATING SUBLIGHT ACCELERATION...</span>
        <span id="warp-pct" class="warp-pct">0%</span>
      </div>
    </div>
  `
  overlay.appendChild(hud)

  // Central warp flash element
  const flash = document.createElement('div')
  flash.className = 'warp-flash'
  overlay.appendChild(flash)

  let speedFactor = 1
  let animId: number

  function renderStars() {
    if (!ctx) return
    ctx.fillStyle = 'rgba(23, 27, 51, 0.45)'
    ctx.fillRect(0, 0, w, h)

    for (let i = 0; i < stars.length; i++) {
      const s = stars[i]
      s.oz = s.z
      s.z -= 18 * speedFactor

      if (s.z <= 10) {
        s.z = 1000
        s.oz = 1000
        s.x = (Math.random() - 0.5) * w * 2
        s.y = (Math.random() - 0.5) * h * 2
      }

      const k = 320 / s.z
      const px = s.x * k + cx
      const py = s.y * k + cy

      const prevK = 320 / s.oz
      const prevX = s.x * prevK + cx
      const prevY = s.y * prevK + cy

      if (px >= 0 && px <= w && py >= 0 && py <= h) {
        ctx.strokeStyle = s.color
        ctx.lineWidth = Math.min(4, Math.max(1, (1 - s.z / 1000) * 4 * speedFactor))
        ctx.beginPath()
        ctx.moveTo(prevX, prevY)
        ctx.lineTo(px, py)
        ctx.stroke()
      }
    }

    animId = requestAnimationFrame(renderStars)
  }
  renderStars()

  // Timeline: 1-second warp sequence
  const warpFill = document.getElementById('warp-fill') as HTMLElement | null
  const warpStatus = document.getElementById('warp-status-txt') as HTMLElement | null
  const warpPct = document.getElementById('warp-pct') as HTMLElement | null

  const warpObj = { p: 0 }
  const tl = gsap.timeline({
    onUpdate: () => {
      const p = warpObj.p
      speedFactor = 1 + p * 7 // accelerate starfield
      if (warpFill) warpFill.style.width = `${Math.round(p * 100)}%`
      if (warpPct) warpPct.textContent = `${Math.round(p * 100)}%`

      if (warpStatus) {
        if (p < 0.35) warpStatus.textContent = '> CHARGING ION COILS...'
        else if (p < 0.7) warpStatus.textContent = '> ENTERING HYPERSPACE VECTOR...'
        else warpStatus.textContent = '> JUMP CONFIRMED! ARRIVING AT DESTINATION...'
      }
    },
    onComplete: () => {
      // Warp flash burst
      gsap.to(flash, {
        opacity: 1,
        duration: 0.15,
        ease: 'power2.in',
        onComplete: () => {
          // Open target URL at peak jump!
          window.open(targetUrl, '_blank', 'noopener,noreferrer')

          // Dissolve warp screen
          gsap.to(overlay, {
            opacity: 0,
            duration: 0.45,
            ease: 'power2.out',
            onComplete: () => {
              cancelAnimationFrame(animId)
              overlay.style.display = 'none'
              overlay.style.opacity = '1'
              overlay.innerHTML = ''
            },
          })
        },
      })
    },
  })

  // Ramp from 0 to 1 over 0.95 seconds
  tl.to(warpObj, { p: 1, duration: 0.95, ease: 'power2.in' })
}
