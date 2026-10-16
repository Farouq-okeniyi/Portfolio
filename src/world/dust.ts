import * as THREE from 'three'
import { TOKENS } from './palette'

/**
 * Dust drifting up the screen as you descend. Position is driven by scroll depth, not by time,
 * so it stops when you stop. A single InstancedMesh, hidden near the surface.
 */
export function createDust(count = 56) {
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({ color: TOKENS.bone }),
    count,
  )
  mesh.frustumCulled = false

  const seeds = Array.from({ length: count }, (_, i) => ({
    u: (Math.sin(i * 12.9898) * 43758.5453) % 1,
    v: (Math.sin(i * 78.233) * 12345.6789) % 1,
    speed: 0.5 + ((i * 37) % 10) / 10, // each speck drifts at its own rate
    size: 0.05 + ((i * 13) % 5) * 0.015,
  }))

  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const p = new THREE.Vector3()
  const s = new THREE.Vector3()
  const frac = (n: number) => n - Math.floor(n)

  /** depth: negative below the surface. centre and half-size describe the camera's view. */
  function update(depth: number, cx: number, cy: number, halfW: number, halfH: number) {
    const fade = THREE.MathUtils.smoothstep(-depth, 3, 8)
    const H = halfH * 2
    for (let i = 0; i < count; i++) {
      const d = seeds[i]
      const x = cx + (frac(Math.abs(d.u)) - 0.5) * 2 * halfW
      const rel = frac(frac(Math.abs(d.v)) - (depth * d.speed) / H) * H - halfH
      p.set(x, cy + rel, 5.8)
      s.setScalar(d.size * fade)
      m.compose(p, q, s)
      mesh.setMatrixAt(i, m)
    }
    mesh.instanceMatrix.needsUpdate = true
  }

  return { mesh, update }
}
