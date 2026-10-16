import * as THREE from 'three'
import { TOKENS as C, mix, rng, shade } from './palette'
import type { Textures } from './textures'

const lambert = (color: number) => new THREE.MeshLambertMaterial({ color })
const basic = (color: number) => new THREE.MeshBasicMaterial({ color })

function box(w: number, h: number, d: number, material: THREE.Material | THREE.Material[], x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material)
  mesh.position.set(x, y, z)
  return mesh
}

/** Landing pod. Group origin sits on the ground. Door faces -x, window faces +z. */
export function createPod(tex: Textures) {
  const hull = new THREE.MeshLambertMaterial({ map: tex.hull })
  const leg = lambert(C.regolith)
  const pod = new THREE.Group()

  pod.add(box(2.2, 2.2, 2.2, hull, 0, 1.6, 0))
  pod.add(box(1.6, 0.7, 1.6, hull, 0, 3.05, 0))
  pod.add(box(0.9, 0.5, 0.9, hull, 0, 3.65, 0))
  pod.add(box(0.15, 0.9, 0.15, leg, 0, 4.35, 0))
  pod.add(box(0.3, 0.3, 0.3, basic(C.ion), 0, 4.95, 0))
  pod.add(box(0.9, 0.7, 0.1, new THREE.MeshBasicMaterial({ map: tex.window }), 0, 1.9, 1.13))
  pod.add(box(0.06, 1.1, 0.8, lambert(shade(C.regolith, 0.8)), -1.11, 1.25, 0))
  for (const sx of [-0.9, 0.9])
    for (const sz of [-0.9, 0.9]) {
      pod.add(box(0.25, 0.5, 0.25, leg, sx, 0.25, sz))
      pod.add(box(0.55, 0.1, 0.55, lambert(shade(C.regolith, 0.8)), sx, 0.05, sz))
    }
  return pod
}

export interface Astronaut {
  group: THREE.Group
  legs: [THREE.Group, THREE.Group]
  arms: [THREE.Group, THREE.Group]
  body: THREE.Group
}

/** Astronaut-miner. Faces +z by default, rotate the group to turn it. */
export function createAstronaut(opts: { suitShade?: number; pickaxe?: boolean } = {}): Astronaut {
  const { suitShade = 1, pickaxe = true } = opts
  const suit = lambert(shade(C.bone, suitShade))
  const dark = lambert(C.regolith)
  const visor = basic(C.ion)

  const group = new THREE.Group()
  const body = new THREE.Group()
  group.add(body)

  const mkLimb = (x: number, y: number, w: number, h: number, material: THREE.Material) => {
    const pivot = new THREE.Group()
    pivot.position.set(x, y, 0)
    pivot.add(box(w, h, w, material, 0, -h / 2, 0))
    body.add(pivot)
    return pivot
  }

  const legs: [THREE.Group, THREE.Group] = [
    mkLimb(-0.17, 0.6, 0.3, 0.6, dark),
    mkLimb(0.17, 0.6, 0.3, 0.6, dark),
  ]
  const arms: [THREE.Group, THREE.Group] = [
    mkLimb(-0.5, 1.3, 0.2, 0.6, suit),
    mkLimb(0.5, 1.3, 0.2, 0.6, suit),
  ]

  body.add(box(0.7, 0.7, 0.4, suit, 0, 0.95, 0))
  body.add(box(0.5, 0.55, 0.25, dark, 0, 1.0, -0.32))
  body.add(box(0.6, 0.6, 0.6, suit, 0, 1.6, 0))
  body.add(box(0.5, 0.3, 0.1, visor, 0, 1.62, 0.31))
  // Small pickaxe in the right hand hints at the mining theme.
  if (pickaxe) {
    const pick = new THREE.Group()
    pick.add(box(0.08, 0.7, 0.08, lambert(shade(C.bone, 0.7)), 0, 0, 0))
    pick.add(box(0.5, 0.1, 0.1, lambert(C.regolith), 0, 0.33, 0))
    pick.position.set(0, -0.5, 0.25)
    arms[1].add(pick)
  }

  group.scale.setScalar(1.2)
  return { group, legs, arms, body }
}

/** Far star layer. A single InstancedMesh, no animation. */
export function createStars() {
  const rand = rng(7)
  const count = 230
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), basic(C.bone), count)
  const m = new THREE.Matrix4()
  const s = new THREE.Vector3()
  const q = new THREE.Quaternion()
  const p = new THREE.Vector3()
  for (let i = 0; i < count; i++) {
    s.setScalar(rand() < 0.2 ? 1.8 : 1)
    p.set(-30 + rand() * 60, rand() * 42, -10)
    m.compose(p, q, s)
    mesh.setMatrixAt(i, m)
  }
  mesh.frustumCulled = false
  return mesh
}

export function createMoon(tex: Textures) {
  const mat = new THREE.MeshBasicMaterial({ map: tex.moon, transparent: true, alphaTest: 0.5 })
  const moon = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), mat)
  moon.position.set(10, 6.2, -8)
  return moon
}

/** Earth: a real sphere with a hard-pixel texture, lit by the scene's sun. */
export function createEarth(tex: Textures) {
  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(4.6, 28, 18),
    new THREE.MeshLambertMaterial({ map: tex.earth }),
  )
  earth.position.set(-7.5, 18.5, -12)
  earth.rotation.z = 0.35
  return earth
}

/** The sun, far behind everything, as a flat pixel disc. */
export function createSun(tex: Textures) {
  const sun = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshBasicMaterial({ map: tex.sun, transparent: true, alphaTest: 0.5 }),
  )
  sun.position.set(7, 25, -25)
  return sun
}

/** Engine flame under the pod. Scale it every frame while flying. */
export function createFlame() {
  const flame = new THREE.Group()
  flame.add(box(0.7, 0.9, 0.7, basic(C.ore), 0, -0.5, 0))
  flame.add(box(0.4, 0.7, 0.4, basic(mix(C.ore, C.bone, 0.6)), 0, -0.35, 0))
  flame.position.y = 0
  return flame
}

export interface Robot {
  group: THREE.Group
  head: THREE.Group
  light: THREE.Mesh
}

/** Companion robot on treads. Faces +z by default. */
export function createRobot(): Robot {
  const hullMat = lambert(C.bone)
  const dark = lambert(C.regolith)
  const group = new THREE.Group()

  group.add(box(0.95, 0.28, 0.75, dark, 0, 0.14, 0)) // treads
  group.add(box(0.8, 0.55, 0.6, hullMat, 0, 0.55, 0)) // body
  group.add(box(0.3, 0.25, 0.05, basic(C.ion), 0, 0.6, 0.31)) // chest display
  const head = new THREE.Group()
  head.position.set(0, 0.95, 0)
  head.add(box(0.55, 0.38, 0.48, hullMat, 0, 0, 0))
  head.add(box(0.42, 0.12, 0.05, basic(C.ion), 0, 0.02, 0.25)) // eye strip
  head.add(box(0.05, 0.4, 0.05, dark, 0.15, 0.38, 0)) // antenna
  group.add(head)
  const light = box(0.14, 0.14, 0.14, basic(C.ion), 0.15, 1.6, 0)
  group.add(light)
  group.add(box(0.12, 0.12, 0.45, dark, -0.5, 0.55, 0.25)) // arm
  group.scale.setScalar(1.25)
  return { group, head, light }
}

/** A chunk of ore on the ground for the astronaut to mine. */
export function createOreRock(tex: Textures) {
  const rock = new THREE.Group()
  const m = new THREE.MeshLambertMaterial({ map: tex.ore })
  rock.add(box(0.9, 0.9, 0.9, m, 0, 0, 0))
  rock.add(box(0.55, 0.55, 0.55, new THREE.MeshLambertMaterial({ map: tex.stone }), 0.7, -0.17, 0.2))
  return rock
}

/** Solar panel on a mast. The second astronaut works on it. */
export function createSolarPanel() {
  const g = new THREE.Group()
  g.add(box(0.18, 1.7, 0.18, lambert(C.regolith), 0, 0.85, 0))
  const panel = new THREE.Group()
  panel.position.set(0, 1.85, 0)
  panel.rotation.z = -0.3
  panel.add(box(1.9, 0.12, 1.2, lambert(shade(C.ion, 0.55)), 0, 0, 0))
  panel.add(box(1.9, 0.14, 0.08, lambert(C.regolith), 0, 0, 0))
  g.add(panel)
  return g
}

/** 3D Glowing Planetary Core Beacon */
export interface Beacon {
  group: THREE.Group
  core: THREE.Mesh
  rings: THREE.Group[]
  beam: THREE.Mesh
}

export function createBeacon(): Beacon {
  const g = new THREE.Group()
  
  // Base pedestal
  g.add(box(3.2, 0.8, 3.2, lambert(C.regolith), 0, 0.4, 0))
  g.add(box(2.2, 0.6, 2.2, lambert(shade(C.regolith, 0.8)), 0, 1.0, 0))
  
  // Pulsing ion core crystal
  const core = box(1.2, 1.2, 1.2, basic(C.ion), 0, 2.2, 0)
  g.add(core)

  // Floating rotating containment rings
  const rings: THREE.Group[] = []
  for (let i = 0; i < 2; i++) {
    const ringGroup = new THREE.Group()
    ringGroup.position.set(0, 2.2, 0)
    const ringMat = basic(i === 0 ? C.ore : C.ion)
    // 4 segments of a square ring
    ringGroup.add(box(1.8, 0.1, 0.1, ringMat, 0, 0, 0.9))
    ringGroup.add(box(1.8, 0.1, 0.1, ringMat, 0, 0, -0.9))
    ringGroup.add(box(0.1, 0.1, 1.8, ringMat, 0.9, 0, 0))
    ringGroup.add(box(0.1, 0.1, 1.8, ringMat, -0.9, 0, 0))
    g.add(ringGroup)
    rings.push(ringGroup)
  }

  // Vertical ion beacon energy beam
  const beamMat = new THREE.MeshBasicMaterial({
    color: C.ion,
    transparent: true,
    opacity: 0.65,
  })
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.35, 36, 0.35), beamMat)
  beam.position.set(0, 20, 0)
  g.add(beam)

  return { group: g, core, rings, beam }
}

/** 3D Mineshaft Cart on Rails */
export function createMinecart() {
  const g = new THREE.Group()
  const iron = lambert(C.bone)
  const dark = lambert(C.regolith)
  // Cart body
  g.add(box(1.4, 0.6, 0.9, iron, 0, 0.5, 0))
  // Ores inside the cart
  g.add(box(1.1, 0.3, 0.7, basic(C.ore), 0, 0.75, 0))
  // Wheels
  for (const x of [-0.45, 0.45]) {
    for (const z of [-0.45, 0.45]) {
      g.add(box(0.25, 0.25, 0.1, dark, x, 0.2, z))
    }
  }
  // Rail ties
  for (let r = -2; r <= 2; r++) {
    g.add(box(0.3, 0.08, 1.4, lambert(shade(C.regolith, 0.7)), r * 0.9, 0.04, 0))
  }
  return g
}


