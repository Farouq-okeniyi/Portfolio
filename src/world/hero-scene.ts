import * as THREE from 'three'
import gsap from 'gsap'
import { TOKENS } from './palette'
import { createTextures } from './textures'
import { createTerrain } from './terrain'
import {
  createAstronaut,
  createEarth,
  createFlame,
  createMoon,
  createOreRock,
  createPod,
  createRobot,
  createSolarPanel,
  createStars,
  createSun,
  createBeacon,
  createMinecart,
  type Astronaut,
  type Beacon,
} from './props'
import { createParticles } from './particles'
import { createDust } from './dust'
import { LAYERS } from './layers'
import { mix } from './palette'

const GROUND = 0.5 // top surface of the grass blocks
const POD_X = 7
const ROCK = new THREE.Vector3(2.3, GROUND + 0.45, 1.2)
const A_WORK_X = 3.5 // astronaut mining the ore
const PANEL = new THREE.Vector3(11.6, GROUND, 2)
const B_WORK_X = 10.0 // astronaut fixing the solar panel
const ROBOT_X = 5.2
const PAN_START = 20 // how far up the camera starts, looking at space

export function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

const lerp = THREE.MathUtils.lerp

/**
 * Hero story, in one continuous shot:
 * Earth is in view, the pod climbs away from it, passes the sun, the camera follows it down,
 * it lands, then the crew gets to work: one astronaut mines ore, one fixes a solar panel,
 * the robot scans around. Any click skips to the end.
 */
export function startHero(canvas: HTMLCanvasElement, onIntroDone: () => void) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false })
  renderer.setPixelRatio(1)
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(TOKENS.void)

  scene.add(new THREE.AmbientLight(0xffffff, 1.05))
  const light = new THREE.DirectionalLight(0xffffff, 0.55)
  light.position.set(-4, 9, 6)
  scene.add(light)

  const tex = createTextures()
  const terrain = createTerrain(tex)
  const pod = createPod(tex)
  const flame = createFlame()
  pod.add(flame)
  const earth = createEarth(tex)
  const sun = createSun(tex)
  const rock = createOreRock(tex)
  const panel = createSolarPanel()
  const astroA: Astronaut = createAstronaut()
  const astroB: Astronaut = createAstronaut({ suitShade: 0.9, pickaxe: false })
  const robot = createRobot()
  const particles = createParticles(64)
  const dust = createDust(56)
  const stars = createStars()
  const beacon: Beacon = createBeacon()
  const cart = createMinecart()

  scene.add(
    terrain.group,
    pod,
    earth,
    sun,
    rock,
    panel,
    astroA.group,
    astroB.group,
    robot.group,
    beacon.group,
    cart,
    particles.mesh,
    dust.mesh,
    stars,
    createMoon(tex),
  )

  rock.position.copy(ROCK)
  panel.position.copy(PANEL)
  
  // Mineshaft depth (-37.5) cart placement
  cart.position.set(4.5, -37.0, 1.4)
  cart.rotation.y = -0.2

  // Core depth (-60.0) beacon placement
  beacon.group.position.set(2.0, -60.0, 1.2)

  // Resting poses: all three start inside the pod, beside its door.
  const doorX = POD_X - 1.3
  astroA.group.position.set(doorX, GROUND, 1.2)
  astroA.group.rotation.y = -Math.PI / 2
  astroB.group.position.set(doorX, GROUND, 1.5)
  astroB.group.rotation.y = Math.PI / 2
  robot.group.position.set(doorX - 0.1, GROUND, 0.7)
  robot.group.rotation.y = -Math.PI / 2

  // Orthographic camera, fixed angle. Only a tiny mouse tilt is allowed.
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200)
  const base = new THREE.Vector3(1.4, 4, 14).normalize().multiplyScalar(60)
  const target = new THREE.Vector3()
  const pan = { y: reduced ? 0 : PAN_START }
  let baseY = 0
  let tiltX = 0
  let tiltY = 0
  let tiltTX = 0
  let tiltTY = 0

  // Scroll descent: scroll position maps to camera depth through each section's anchor.
  let halfW = 12
  let halfHView = 7
  let scrollAnchors: number[] = []
  let depthNow = 0
  let depthGoal = 0
  // Background steps through hard depth colors, never a smooth fade.
  const depthBg = [
    TOKENS.void,
    mix(TOKENS.void, TOKENS.ore, 0.04),
    mix(TOKENS.void, TOKENS.ore, 0.06),
    mix(TOKENS.void, 0x000000, 0.2),
    mix(TOKENS.void, 0x000000, 0.35),
    mix(TOKENS.void, 0x000000, 0.5),
  ]
  const bg = new THREE.Color(TOKENS.void)

  function measureSections() {
    const vh = window.innerHeight
    scrollAnchors = LAYERS.map((l) => {
      const el = document.getElementById(l.id)
      if (!el) return 0
      return Math.max(0, el.offsetTop + el.offsetHeight / 2 - vh / 2)
    })
  }

  function depthForScroll(y: number): number {
    if (scrollAnchors.length === 0) return 0
    if (y <= scrollAnchors[0]) return LAYERS[0].depth
    for (let i = 1; i < LAYERS.length; i++) {
      if (y <= scrollAnchors[i]) {
        const a = scrollAnchors[i - 1]
        const f = (y - a) / Math.max(1, scrollAnchors[i] - a)
        return lerp(LAYERS[i - 1].depth, LAYERS[i].depth, f)
      }
    }
    return LAYERS[LAYERS.length - 1].depth
  }

  function layout() {
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    const aspect = w / h
    // Chunky pixels: 1/3 resolution on desktop, 1/2 on small screens.
    const scale = w < 700 ? 2 : 3
    renderer.setSize(Math.ceil(w / scale), Math.ceil(h / scale), false)
    const halfH = Math.max(7, 9.5 / aspect)
    camera.left = -halfH * aspect
    camera.right = halfH * aspect
    camera.top = halfH
    camera.bottom = -halfH
    camera.updateProjectionMatrix()
    halfW = halfH * aspect
    halfHView = halfH
    measureSections()
    // Surface sits about 64% down the screen, the crew right of centre.
    baseY = halfH * 0.28
    target.x = aspect < 1 ? 6.2 : 3
  }
  layout()
  window.addEventListener('resize', layout)

  if (!reduced) {
    window.addEventListener('pointermove', (e) => {
      tiltTX = (e.clientX / window.innerWidth - 0.5) * 2
      tiltTY = (e.clientY / window.innerHeight - 0.5) * 2
    })
  }

  // Story flags drive the per-frame animation.
  let walkA = false
  let walkB = false
  let workA = false
  let workB = false
  let workR = false

  const setAstroVisible = (visible: boolean) => {
    astroA.group.visible = visible
    astroB.group.visible = visible
    robot.group.visible = visible
  }

  const worldPos = new THREE.Vector3()
  const burst = (pos: THREE.Vector3, color: number, count: number, speed: number, lift?: number) =>
    particles.emit(pos, color, count, speed, lift)

  let tl: gsap.core.Timeline | null = null

  const hudBar = document.getElementById('hud-bar') as HTMLElement | null
  const hudPhase = document.getElementById('hud-phase') as HTMLElement | null
  const hud = document.getElementById('mission-hud') as HTMLElement | null

  function playIntro(onDone?: () => void) {
    if (tl) {
      tl.kill()
      tl = null
    }

    if (reduced) {
      // Static world: landed, crew at their jobs, no motion.
      flame.visible = false
      pod.position.set(POD_X, GROUND, 0)
      pod.rotation.set(0, 0, 0)
      pan.y = 0
      setAstroVisible(true)
      astroA.group.position.x = A_WORK_X
      astroB.group.position.set(B_WORK_X, GROUND, 2.2)
      robot.group.position.set(ROBOT_X, GROUND, 1.9)
      astroA.arms[1].rotation.x = -0.9
      astroB.arms[0].rotation.x = -1.1
      astroB.arms[1].rotation.x = -1.0
      walkA = walkB = false
      workA = workB = workR = true
      if (hud) hud.hidden = true
      onIntroDone()
      onDone?.()
      return
    }

    // Reset pod to orbital launch point near Earth
    pod.position.set(-9, 16.5, 0)
    pod.rotation.set(0, 0, -1.03)
    flame.visible = true
    pan.y = PAN_START

    // Reset astronauts and robot
    walkA = walkB = false
    workA = workB = workR = false
    setAstroVisible(false)
    astroA.group.position.set(doorX, GROUND, 1.2)
    astroA.group.rotation.y = -Math.PI / 2
    astroB.group.position.set(doorX, GROUND, 1.5)
    astroB.group.rotation.y = Math.PI / 2
    robot.group.position.set(doorX - 0.1, GROUND, 0.7)
    robot.group.rotation.y = -Math.PI / 2

    if (hud) hud.hidden = false
    if (hudBar) hudBar.style.width = '0%'
    if (hudPhase) hudPhase.textContent = 'ORBITAL TRANSIT (DEPARTING EARTH)'

    tl = gsap.timeline({
      onUpdate: () => {
        if (!tl) return
        const p = tl.progress()
        if (hudBar) hudBar.style.width = `${Math.round(p * 100)}%`
        if (hudPhase) {
          const s = tl.time()
          if (s < 2.4) hudPhase.textContent = 'ORBITAL TRANSIT (DEPARTING EARTH)'
          else if (s < 3.7) hudPhase.textContent = 'SOLAR CORONA FLYBY'
          else if (s < 5.7) hudPhase.textContent = 'ATMOSPHERIC ENTRY & BRAKE'
          else if (s < 6.3) hudPhase.textContent = 'TOUCHDOWN & DUST DISPERSAL'
          else if (s < 8.2) hudPhase.textContent = 'CREW EVA & SYSTEM SETUP'
          else hudPhase.textContent = 'ACTIVE SURFACE EXPLORATION'
        }
      },
      onComplete: () => {
        walkA = walkB = false
        workA = workB = workR = true
        if (hudBar) hudBar.style.width = '100%'
        onIntroDone()
        onDone?.()
        setTimeout(() => {
          if (hud) hud.hidden = true
        }, 1200)
      },
    })

    // 1. Climb away from Earth.
    tl.to(pod.position, { x: 2.5, duration: 2.4, ease: 'power1.inOut' }, 0)
    tl.to(pod.position, { y: 24.2, duration: 2.4, ease: 'power2.out' }, 0)
    tl.to(pod.rotation, { z: -1.5, duration: 2.4, ease: 'sine.inOut' }, 0)
    // 2. Cross in front of the sun.
    tl.to(pod.position, { x: 9, y: 23.4, duration: 1.3, ease: 'sine.inOut' }, 2.4)
    // 3. Flip, brake and descend while the camera follows.
    tl.to(pod.position, { x: POD_X, duration: 2, ease: 'power2.inOut' }, 3.7)
    tl.to(pod.position, { y: GROUND + 1.5, duration: 2, ease: 'power2.inOut' }, 3.7)
    tl.to(pod.rotation, { z: 0, duration: 1.2, ease: 'power2.inOut' }, 3.7)
    tl.to(pan, { y: 0, duration: 2, ease: 'power2.inOut' }, 3.7)
    // 4. Touch down.
    tl.to(pod.position, { y: GROUND, duration: 0.55, ease: 'bounce.out' }, 5.7)
    tl.call(
      () => {
        flame.visible = false
        burst(new THREE.Vector3(POD_X - 1, GROUND + 0.1, 1.2), TOKENS.bone, 8, 4, 1.5)
        burst(new THREE.Vector3(POD_X + 1, GROUND + 0.1, 1.2), TOKENS.bone, 8, 4, 1.5)
      },
      undefined,
      5.75,
    )

    // 5. Crew steps out and heads to work.
    const T = 6.3
    tl.call(
      () => {
        astroA.group.visible = true
        walkA = true
      },
      undefined,
      T,
    )
    tl.to(astroA.group.position, { x: A_WORK_X, duration: 1.5, ease: 'none' }, T)
    tl.call(
      () => {
        walkA = false
        workA = true
      },
      undefined,
      T + 1.5,
    )

    tl.call(
      () => {
        astroB.group.visible = true
        walkB = true
      },
      undefined,
      T + 0.4,
    )
    tl.to(astroB.group.position, { x: B_WORK_X, z: 2.2, duration: 2.2, ease: 'none' }, T + 0.4)
    tl.call(
      () => {
        walkB = false
        workB = true
      },
      undefined,
      T + 2.6,
    )

    tl.call(() => (robot.group.visible = true), undefined, T + 0.9)
    tl.to(robot.group.position, { x: ROBOT_X, z: 1.9, duration: 0.9, ease: 'power1.out' }, T + 0.9)
    tl.call(() => (workR = true), undefined, T + 1.8)
  }

  // Start the intro sequence initially
  playIntro()

  const skip = () => {
    if (tl && tl.progress() < 1) {
      tl.progress(1)
    }
    if (hud) hud.hidden = true
  }

  const replay = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    document.documentElement.classList.add('intro')
    if (hud) hud.hidden = false
    playIntro()
  }

  const swingWalk = (a: Astronaut, t: number) => {
    const swing = Math.sin(t * 14) * 0.7
    a.legs[0].rotation.x = swing
    a.legs[1].rotation.x = -swing
    a.arms[0].rotation.x = -swing * 0.8
    a.arms[1].rotation.x = swing * 0.4
  }

  // Render loop (the browser pauses rAF while the tab is hidden).
  let last = performance.now()
  const start = last
  let prevSwing = 0
  let sparkClock = 0
  let trailClock = 0
  const offset = new THREE.Vector3()
  const yAxis = new THREE.Vector3(0, 1, 0)
  const xAxis = new THREE.Vector3(1, 0, 0)
  const tmp = new THREE.Vector3()

  function frame() {
    requestAnimationFrame(frame)
    const now = performance.now()
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    const t = (now - start) / 1000

    if (!reduced) earth.rotation.y += dt * 0.12

    // Engine flame and ember trail while flying.
    if (flame.visible) {
      flame.scale.set(1, 0.7 + Math.random() * 0.7, 1)
      trailClock += dt
      if (trailClock > 0.05) {
        trailClock = 0
        tmp.set(0, -0.4, 0)
        pod.localToWorld(worldPos.copy(tmp))
        burst(worldPos, TOKENS.ore, 1, 0.6, 0)
      }
    }

    // Astronaut A walks, then mines the ore.
    if (walkA) swingWalk(astroA, t)
    else if (workA && !reduced) {
      for (const p of [...astroA.legs, astroA.arms[0]]) p.rotation.x = 0
      const p = (t * 1.4) % 1
      const raise = 1 - Math.pow(1 - Math.min(p / 0.7, 1), 2)
      astroA.arms[1].rotation.x = p < 0.7 ? lerp(-0.1, -2.3, raise) : lerp(-2.3, 0.2, (p - 0.7) / 0.3)
      astroA.body.rotation.x = p > 0.7 ? 0.12 : 0
      if (prevSwing < 0.7 && p >= 0.7) {
        tmp.set(ROCK.x + 0.4, ROCK.y + 0.2, ROCK.z)
        burst(tmp, TOKENS.ore, 5, 3.5, 2.5)
        burst(tmp, TOKENS.bone, 2, 2.5, 2)
      }
      prevSwing = p
    }

    // Astronaut B walks to the panel, then keeps working on it with a shower of sparks.
    if (walkB) swingWalk(astroB, t)
    else if (workB && !reduced) {
      for (const p of astroB.legs) p.rotation.x = 0
      astroB.arms[0].rotation.x = -1.2 + Math.sin(t * 9) * 0.3
      astroB.arms[1].rotation.x = -1.0 + Math.sin(t * 9 + 2) * 0.3
      sparkClock += dt
      if (sparkClock > 0.45) {
        sparkClock = 0
        tmp.set(PANEL.x - 1.0, GROUND + 1.9, PANEL.z)
        burst(tmp, TOKENS.ion, 3, 2.2, 1.5)
      }
    }

    // Robot scans: head sweeps, antenna light blinks, small patrol along the ground.
    if (workR && !reduced) {
      robot.head.rotation.y = Math.sin(t * 1.3) * 0.6
      robot.light.visible = Math.floor(t * 2) % 2 === 0
      robot.group.position.x = ROBOT_X + Math.sin(t * 0.7) * 0.3
    }

    particles.update(dt)

    // Subterranean visual life: Beacon pulse and counter-rotating containment rings
    if (!reduced) {
      beacon.core.rotation.y += dt * 1.5
      beacon.core.rotation.x += dt * 0.8
      const coreScale = 1.0 + Math.sin(t * 4.0) * 0.12
      beacon.core.scale.setScalar(coreScale)
      beacon.rings[0].rotation.y += dt * 2.2
      beacon.rings[1].rotation.x -= dt * 1.8
      beacon.beam.scale.x = 0.85 + Math.sin(t * 8.0) * 0.15
      beacon.beam.scale.z = 0.85 + Math.sin(t * 8.0) * 0.15
    }

    // Scroll descent. Ease toward the goal so the camera glides instead of snapping.
    depthGoal = depthForScroll(window.scrollY)
    depthNow += (depthGoal - depthNow) * (reduced ? 1 : 0.12)
    if (Math.abs(depthGoal - depthNow) < 0.005) depthNow = depthGoal

    let step = 0
    for (let i = 1; i < LAYERS.length; i++) {
      if (depthNow < (LAYERS[i - 1].depth + LAYERS[i].depth) / 2) step = i
    }
    bg.setHex(depthBg[step])
    scene.background = bg
    document.documentElement.style.setProperty('--bg-step', '#' + depthBg[step].toString(16).padStart(6, '0'))

    pod.visible = true
    target.y = baseY + pan.y + depthNow
    if (!reduced) {
      dust.update(depthNow, target.x, target.y, halfW, halfHView)
      stars.position.y = depthNow * 0.6 // far layer moves slower than the camera
    } else {
      dust.mesh.visible = false
    }
    tiltX += (tiltTX - tiltX) * 0.06
    tiltY += (tiltTY - tiltY) * 0.06
    const max = THREE.MathUtils.degToRad(4)
    offset.copy(base)
    offset.applyAxisAngle(yAxis, -tiltX * max)
    offset.applyAxisAngle(xAxis, -tiltY * max * 0.5)
    camera.position.copy(target).add(offset)
    camera.lookAt(target)

    renderer.render(scene, camera)
  }
  frame()

  return { skip, replay, playIntro, getDepth: () => depthNow, remeasure: measureSections }
}
