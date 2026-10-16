import gsap from 'gsap'
import { TOKENS } from './palette'

function playRocketSound() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(120, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(760, ctx.currentTime + 1.2)
    gain.gain.setValueAtTime(0.06, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.25)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 1.25)
  } catch {
    // Ignore audio policy blocks
  }
}

function playDeliveryPing() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(523.25, ctx.currentTime)
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1)
    gain.gain.setValueAtTime(0.08, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.4)
  } catch {
    // Ignore
  }
}

/**
 * Launches a pixel-art cargo rocket carrying Farouq's CV from the clicked button
 * directly to the browser's download icon (top-right corner).
 */
export function launchCvRocket(button: HTMLElement, downloadUrl: string = '/Farouq_Okeniyi_CV.pdf') {
  console.log('[CV Rocket] launchCvRocket called with button:', button, 'url:', downloadUrl)
  playRocketSound()

  const rect = button.getBoundingClientRect()
  const startX = rect.left + rect.width / 2
  const startY = rect.top + rect.height / 2

  // Target coordinates: the browser's download icon / tray in the top right
  const targetX = Math.max(120, window.innerWidth - 65)
  const targetY = 24

  // Arc control point (curves upward into high orbital trajectory before diving into downloads)
  const ctrlX = startX + (targetX - startX) * 0.15
  const ctrlY = Math.min(startY, targetY) - Math.max(140, Math.abs(startY - targetY) * 0.35)

  // Container overlay
  let overlay = document.getElementById('rocket-launch-overlay')
  if (!overlay) {
    overlay = document.createElement('div')
    overlay.id = 'rocket-launch-overlay'
    overlay.className = 'rocket-launch-overlay'
    document.body.appendChild(overlay)
  }

  // Rocket Pod DOM element
  const rocket = document.createElement('div')
  rocket.className = 'cv-rocket'
  rocket.innerHTML = `
    <div class="rocket-sprite">
      <svg width="44" height="52" viewBox="0 0 36 44" fill="none">
        <!-- Nose cone -->
        <rect x="16" y="2" width="4" height="4" fill="${'#' + TOKENS.bone.toString(16)}" />
        <rect x="14" y="6" width="8" height="6" fill="${'#' + TOKENS.ion.toString(16)}" />
        <!-- Cockpit Glass -->
        <rect x="16" y="8" width="4" height="4" fill="#ffffff" />
        <!-- Main Hull -->
        <rect x="12" y="12" width="12" height="16" fill="${'#' + TOKENS.regolith.toString(16)}" stroke="${'#' + TOKENS.bone.toString(16)}" stroke-width="2" />
        <!-- Farouq CV Emblem -->
        <rect x="15" y="16" width="6" height="8" fill="${'#' + TOKENS.bone.toString(16)}" />
        <rect x="17" y="18" width="2" height="4" fill="${'#' + TOKENS.void.toString(16)}" />
        <!-- Left Wing / Booster -->
        <rect x="6" y="20" width="6" height="10" fill="${'#' + TOKENS.ore.toString(16)}" />
        <rect x="8" y="30" width="4" height="2" fill="${'#' + TOKENS.void.toString(16)}" />
        <!-- Right Wing / Booster -->
        <rect x="24" y="20" width="6" height="10" fill="${'#' + TOKENS.ore.toString(16)}" />
        <rect x="24" y="30" width="4" height="2" fill="${'#' + TOKENS.void.toString(16)}" />
        <!-- Engine Bell -->
        <rect x="14" y="28" width="8" height="4" fill="${'#' + TOKENS.bone.toString(16)}" />
        <!-- Thruster Flame -->
        <polygon points="14,32 22,32 18,42" fill="${'#' + TOKENS.ore.toString(16)}" class="engine-flame" />
        <polygon points="16,32 20,32 18,38" fill="#ffffff" />
      </svg>
      <span class="rocket-badge">CV.PDF</span>
    </div>
  `
  // Position rocket at start immediately
  rocket.style.transform = `translate(${startX - 22}px, ${startY - 26}px) rotate(45deg)`
  overlay.appendChild(rocket)

  // Target download radar ping icon in the top right
  const targetBeacon = document.createElement('div')
  targetBeacon.className = 'download-target-ping'
  targetBeacon.style.left = `${targetX - 28}px`
  targetBeacon.style.top = `${targetY - 12}px`
  targetBeacon.innerHTML = `
    <span class="ping-ring"></span>
    <span class="ping-core">⬇</span>
    <span class="ping-text">DOCKING: DOWNLOADS TRAY</span>
  `
  overlay.appendChild(targetBeacon)

  // Update button visual state during launch
  const originalButtonText = button.innerHTML
  button.innerHTML = `🚀 CARGO LAUNCHING...`
  button.classList.add('launching-active')

  // Spawn smoke and flame particles during trajectory
  let lastParticleTime = 0

  function spawnTrailParticle(x: number, y: number, angleRad: number) {
    if (!overlay) return
    const p = document.createElement('div')
    p.className = 'rocket-particle'
    const color = Math.random() > 0.4 ? TOKENS.ore : Math.random() > 0.5 ? TOKENS.ion : TOKENS.bone
    p.style.backgroundColor = '#' + color.toString(16).padStart(6, '0')
    const size = Math.floor(Math.random() * 5 + 4)
    p.style.width = `${size}px`
    p.style.height = `${size}px`
    const spread = (Math.random() - 0.5) * 12
    const emitX = x - Math.sin(angleRad) * 16 + Math.cos(angleRad) * spread
    const emitY = y + Math.cos(angleRad) * 16 + Math.sin(angleRad) * spread
    p.style.left = `${emitX}px`
    p.style.top = `${emitY}px`
    overlay.appendChild(p)

    gsap.to(p, {
      opacity: 0,
      scale: 0.2,
      duration: 0.5 + Math.random() * 0.3,
      onComplete: () => p.remove(),
    })
  }

  // Animation timeline using quadratic bezier flight curve
  const flight = { p: 0 }
  const tl = gsap.timeline({
    onUpdate: () => {
      const p = flight.p
      // Quadratic Bezier interpolation
      const x = (1 - p) * (1 - p) * startX + 2 * (1 - p) * p * ctrlX + p * p * targetX
      const y = (1 - p) * (1 - p) * startY + 2 * (1 - p) * p * ctrlY + p * p * targetY

      // Tangent derivative for facing rotation
      const dx = 2 * (1 - p) * (ctrlX - startX) + 2 * p * (targetX - ctrlX)
      const dy = 2 * (1 - p) * (ctrlY - startY) + 2 * p * (targetY - ctrlY)
      const rotDeg = (Math.atan2(dy, dx) * 180) / Math.PI + 90

      rocket.style.transform = `translate(${x - 22}px, ${y - 26}px) rotate(${rotDeg}deg)`

      // Spawn particles
      const now = performance.now()
      if (now - lastParticleTime > 26) {
        lastParticleTime = now
        spawnTrailParticle(x, y, (Math.atan2(dy, dx) * Math.PI) / 180)
      }
    },
    onComplete: () => {
      // Impact & Delivery Explosion
      rocket.remove()
      playDeliveryPing()

      // Spawn delivery burst particles at destination
      for (let i = 0; i < 20; i++) {
        const bp = document.createElement('div')
        bp.className = 'rocket-particle'
        const color = i % 3 === 0 ? TOKENS.ion : i % 2 === 0 ? TOKENS.ore : TOKENS.bone
        bp.style.backgroundColor = '#' + color.toString(16).padStart(6, '0')
        bp.style.width = '6px'
        bp.style.height = '6px'
        bp.style.left = `${targetX}px`
        bp.style.top = `${targetY}px`
        overlay.appendChild(bp)

        const ang = Math.random() * Math.PI * 2
        const dist = Math.random() * 50 + 15
        gsap.to(bp, {
          x: Math.cos(ang) * dist,
          y: Math.sin(ang) * dist,
          opacity: 0,
          duration: 0.6 + Math.random() * 0.4,
          ease: 'power2.out',
          onComplete: () => bp.remove(),
        })
      }

      // Flash target beacon
      targetBeacon.classList.add('docked')
      targetBeacon.innerHTML = `
        <span class="ping-core">✓</span>
        <span class="ping-text">CARGO RECEIVED: CV.PDF</span>
      `
      setTimeout(() => {
        targetBeacon.remove()
      }, 3000)

      // Trigger the real file download now that the rocket has delivered it!
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = 'Farouq_Okeniyi_CV.pdf'
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      setTimeout(() => link.remove(), 200)

      // Button success feedback
      button.innerHTML = `✓ CV DELIVERED TO DOWNLOADS!`
      button.classList.remove('launching-active')
      button.classList.add('launch-delivered')

      setTimeout(() => {
        button.innerHTML = originalButtonText
        button.classList.remove('launch-delivered')
      }, 4000)
    },
  })

  // Start with brief engine spool-up recoil, then blast off toward the downloads tray!
  tl.fromTo(
    rocket,
    { scale: 0.6, opacity: 0 },
    { scale: 1.15, opacity: 1, duration: 0.18, ease: 'back.out(2)' },
    0,
  )
  tl.to(flight, { p: 1, duration: 1.35, ease: 'power2.in' }, 0.1)
}
