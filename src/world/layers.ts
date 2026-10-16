/** The planet's layers, top to bottom. Each one is a section of the portfolio. */
export const LAYERS = [
  { id: 'surface', label: 'Surface', depth: 0 },
  { id: 'topsoil', label: 'Topsoil', depth: -8 },
  { id: 'stone', label: 'Stone', depth: -23 },
  { id: 'shaft', label: 'Shaft', depth: -37.5 },
  { id: 'deep', label: 'Deep rock', depth: -49.5 },
  { id: 'core', label: 'Core', depth: -60 },
] as const

export type LayerId = (typeof LAYERS)[number]['id']

/**
 * Camera depth (world units below the surface view) for each layer.
 * 1 unit reads as 1 metre on the depth gauge.
 */

/** Lowest block, below the core view even on tall phone screens. */
export const BLOCK_BOTTOM = -76

/** Which kind of block sits at height y. Surface is y = 0. */
export type StrataType = 'grass' | 'dirt' | 'stone' | 'shaft' | 'deep' | 'core'

export function strataAt(y: number): StrataType {
  if (y >= 0) return 'grass'
  if (y > -12) return 'dirt'
  if (y > -30) return 'stone'
  if (y > -42) return 'shaft'
  if (y > -54) return 'deep'
  return 'core'
}
