import * as THREE from 'three'
import { TOKENS as C, DIRT, css, mix, rng, shade } from './palette'

type Put = (x: number, y: number, color: number) => void

/** Draws a 16x16 texture pixel by pixel. Nearest filtering keeps it crisp. */
function pixelTexture(seed: number, draw: (put: Put, rand: () => number) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 16
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  const put: Put = (x, y, color) => {
    if (x < 0 || y < 0 || x > 15 || y > 15) return
    ctx.fillStyle = css(color)
    ctx.fillRect(x, y, 1, 1)
  }
  draw(put, rng(seed))
  const tex = new THREE.CanvasTexture(canvas)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  tex.generateMipmaps = false
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

const pick = <T,>(rand: () => number, list: T[]) => list[Math.floor(rand() * list.length)]

function fillStone(put: Put, rand: () => number) {
  const tones = [mix(C.regolith, C.bone, 0.14), mix(C.regolith, C.bone, 0.06), mix(C.regolith, C.bone, 0.22)]
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) put(x, y, pick(rand, tones))
  for (let i = 0; i < 7; i++) put(Math.floor(rand() * 16), Math.floor(rand() * 16), C.regolith)
}

function fillDirt(put: Put, rand: () => number, y0 = 0) {
  const tones = [DIRT, shade(DIRT, 0.86), shade(DIRT, 1.1)]
  for (let y = y0; y < 16; y++) for (let x = 0; x < 16; x++) put(x, y, pick(rand, tones))
  for (let i = 0; i < 6; i++) put(Math.floor(rand() * 16), y0 + Math.floor(rand() * (16 - y0)), shade(DIRT, 0.7))
}

export function createTextures() {
  const stone = pixelTexture(1, fillStone)

  const dirt = pixelTexture(2, (put, rand) => fillDirt(put, rand))

  const grassTop = pixelTexture(3, (put, rand) => {
    const tones = [C.moss, shade(C.moss, 0.88), shade(C.moss, 1.08)]
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) put(x, y, pick(rand, tones))
    for (let i = 0; i < 8; i++) put(Math.floor(rand() * 16), Math.floor(rand() * 16), shade(C.moss, 0.7))
  })

  const grassSide = pixelTexture(4, (put, rand) => {
    fillDirt(put, rand)
    const tones = [C.moss, shade(C.moss, 0.88), shade(C.moss, 1.08)]
    for (let x = 0; x < 16; x++) {
      // Ragged grass edge: 3 to 5 rows deep.
      const depth = 3 + Math.floor(rand() * 3)
      for (let y = 0; y < depth; y++) put(x, y, pick(rand, tones))
    }
  })

  const ore = pixelTexture(5, (put, rand) => {
    fillStone(put, rand)
    const glint = mix(C.ore, C.bone, 0.45)
    const clusters = [
      [3, 3],
      [10, 5],
      [6, 10],
      [12, 12],
    ]
    for (const [cx, cy] of clusters) {
      put(cx, cy, C.ore)
      put(cx + 1, cy, C.ore)
      put(cx, cy + 1, shade(C.ore, 0.85))
      put(cx + 1, cy + 1, C.ore)
      put(cx, cy, glint)
    }
  })

  const hull = pixelTexture(6, (put, rand) => {
    const tones = [C.bone, shade(C.bone, 0.96), shade(C.bone, 0.92)]
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) put(x, y, pick(rand, tones))
    for (let i = 0; i < 16; i++) {
      for (const [x, y] of [
        [i, 0],
        [i, 15],
        [0, i],
        [15, i],
      ])
        put(x, y, shade(C.bone, 0.72))
    }
    for (const [x, y] of [
      [2, 2],
      [13, 2],
      [2, 13],
      [13, 13],
    ])
      put(x, y, C.regolith)
  })

  const window = pixelTexture(7, (put) => {
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const edge = x < 2 || y < 2 || x > 13 || y > 13
        put(x, y, edge ? C.regolith : C.ion)
      }
    // Reflection streak.
    for (let i = 0; i < 6; i++) put(3 + i, 11 - i, mix(C.ion, C.bone, 0.7))
  })

  const moon = pixelTexture(8, (put, rand) => {
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const dx = x - 7.5
        const dy = y - 7.5
        if (dx * dx + dy * dy <= 7.6 * 7.6) put(x, y, mix(C.bone, C.void, 0.04))
      }
    for (const [cx, cy, s] of [
      [5, 5, 2],
      [10, 9, 3],
      [6, 11, 1],
    ])
      for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) put(cx + x, cy + y, shade(C.bone, 0.78))
    void rand
  })

  // Mineshaft wall: darker stone with dirt-colored timber braces.
  const shaft = pixelTexture(9, (put, rand) => {
    const tones = [mix(C.regolith, C.void, 0.3), mix(C.regolith, C.void, 0.42), mix(C.regolith, C.bone, 0.04)]
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) put(x, y, pick(rand, tones))
    for (let x = 0; x < 16; x++) {
      put(x, 7, shade(DIRT, 0.9))
      put(x, 8, shade(DIRT, 0.7))
    }
    for (const x of [1, 14]) for (let y = 0; y < 16; y++) put(x, y, shade(DIRT, 0.8))
  })

  // Deep rock: darker and a touch warmer than stone, so depth steps read without any gradient.
  const deep = pixelTexture(10, (put, rand) => {
    const base = mix(C.regolith, C.void, 0.55)
    const tones = [base, shade(base, 0.85), mix(base, C.ore, 0.06)]
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) put(x, y, pick(rand, tones))
    for (let i = 0; i < 5; i++) put(Math.floor(rand() * 16), Math.floor(rand() * 16), C.void)
  })

  // Core: near-void rock with ion crystal flecks.
  const core = pixelTexture(11, (put, rand) => {
    const base = mix(C.void, C.regolith, 0.2)
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) put(x, y, rand() < 0.5 ? base : shade(base, 0.85))
    for (let i = 0; i < 5; i++) {
      const x = 1 + Math.floor(rand() * 13)
      const y = 1 + Math.floor(rand() * 13)
      put(x, y, C.ion)
      put(x + 1, y, mix(C.ion, C.void, 0.45))
      put(x, y + 1, mix(C.ion, C.void, 0.45))
    }
  })

  return { stone, dirt, grassTop, grassSide, ore, hull, window, moon, shaft, deep, core, earth: earthTexture(), sun: sunTexture() }
}

/** Small canvas helper for non-16x16 art. Nearest filtering keeps the pixels hard. */
function canvasTexture(w: number, h: number, draw: (put: Put) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  draw((x, y, color) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return
    ctx.fillStyle = css(color)
    ctx.fillRect(x, y, 1, 1)
  })
  const tex = new THREE.CanvasTexture(canvas)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  tex.generateMipmaps = false
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** Equirectangular pixel Earth: ion-dark oceans, moss land, bone ice and a few cloud streaks. */
function earthTexture() {
  const ocean = [mix(C.ion, C.void, 0.55), mix(C.ion, C.void, 0.62)]
  return canvasTexture(64, 32, (put) => {
    const rand = rng(21)
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 64; x++) {
        const u = x / 64
        const v = y / 32
        const n = Math.sin(u * 17 + Math.sin(v * 6) * 1.7) + Math.sin(v * 9 + u * 5) * 0.8 + Math.sin(u * 31) * 0.25
        let c = ocean[(x + y) % 2]
        if (n > 0.85) c = rand() < 0.15 ? shade(C.moss, 0.85) : C.moss
        if (y < 2 || y > 29) c = C.bone
        put(x, y, c)
      }
    for (let i = 0; i < 9; i++) {
      const cx = Math.floor(rand() * 60)
      const cy = 4 + Math.floor(rand() * 24)
      for (let k = 0; k < 4 + Math.floor(rand() * 4); k++) put(cx + k, cy, C.bone)
    }
  })
}

/** Stepped pixel sun. Rings get hotter toward the middle. No smooth glow. */
function sunTexture() {
  return canvasTexture(32, 32, (put) => {
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 32; x++) {
        const dx = x - 15.5
        const dy = y - 15.5
        const d = Math.sqrt(dx * dx + dy * dy)
        if (d < 6) put(x, y, mix(C.bone, C.ore, 0.25))
        else if (d < 9) put(x, y, mix(C.ore, C.bone, 0.2))
        else if (d < 12) put(x, y, C.ore)
        else if (d < 14 && (x + y) % 2 === 0) put(x, y, shade(C.ore, 0.8))
      }
    // Eight short rays.
    for (let a = 0; a < 8; a++) {
      const ang = (a * Math.PI) / 4
      for (let r = 13; r < 16; r++)
        put(Math.round(15.5 + Math.cos(ang) * r), Math.round(15.5 + Math.sin(ang) * r), C.ore)
    }
  })
}

export type Textures = ReturnType<typeof createTextures>
