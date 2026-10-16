/** The six color tokens from the design spec. Mirrors the CSS variables in style.css. */
export const TOKENS = {
  void: 0x171b33,
  regolith: 0x2f3858,
  bone: 0xede6d3,
  ion: 0x4fd3e6,
  ore: 0xf0b544,
  moss: 0x6fbf6a,
} as const

const r = (c: number) => (c >> 16) & 255
const g = (c: number) => (c >> 8) & 255
const b = (c: number) => c & 255
const pack = (R: number, G: number, B: number) =>
  (Math.round(R) << 16) | (Math.round(G) << 8) | Math.round(B)

/** Blend two colors. t = 0 gives a, t = 1 gives b. */
export function mix(a: number, bb: number, t: number): number {
  return pack(r(a) + (r(bb) - r(a)) * t, g(a) + (g(bb) - g(a)) * t, b(a) + (b(bb) - b(a)) * t)
}

/** Multiply brightness. f < 1 darkens. */
export function shade(c: number, f: number): number {
  return pack(Math.min(255, r(c) * f), Math.min(255, g(c) * f), Math.min(255, b(c) * f))
}

export const css = (c: number) => '#' + c.toString(16).padStart(6, '0')

/** Seeded random so the world looks the same on every load. */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Dirt is the one derived color: regolith warmed with a little ore.
 * Depth shifts toward warmer, darker values (spec section 2), so it stays inside the six tokens.
 */
export const DIRT = mix(TOKENS.regolith, TOKENS.ore, 0.3)
