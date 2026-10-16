import * as THREE from 'three'

/**
 * One InstancedMesh for every chip, spark and dust puff (a single draw call).
 * Particles are plain cubes that fly out, fall, and shrink to nothing.
 */
export function createParticles(max = 64) {
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial(), max)
  mesh.frustumCulled = false
  const pos = Array.from({ length: max }, () => new THREE.Vector3())
  const vel = Array.from({ length: max }, () => new THREE.Vector3())
  const life = new Float32Array(max)
  const maxLife = new Float32Array(max)
  const size = new Float32Array(max)
  const white = new THREE.Color(0xffffff)
  for (let i = 0; i < max; i++) mesh.setColorAt(i, white)

  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const s = new THREE.Vector3()
  const hide = new THREE.Matrix4().makeScale(0, 0, 0)
  for (let i = 0; i < max; i++) mesh.setMatrixAt(i, hide)

  let cursor = 0
  const c = new THREE.Color()

  function emit(origin: THREE.Vector3, color: number, count: number, speed: number, lift = 2, spread = 1) {
    for (let k = 0; k < count; k++) {
      const i = cursor++ % max
      pos[i].copy(origin)
      vel[i].set(
        (Math.random() - 0.5) * speed * spread,
        Math.random() * speed * 0.7 + lift,
        (Math.random() - 0.5) * speed * 0.5,
      )
      life[i] = maxLife[i] = 0.5 + Math.random() * 0.35
      size[i] = 0.1 + Math.random() * 0.1
      mesh.setColorAt(i, c.set(color))
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }

  function update(dt: number) {
    for (let i = 0; i < max; i++) {
      if (life[i] <= 0) continue
      life[i] -= dt
      if (life[i] <= 0) {
        mesh.setMatrixAt(i, hide)
        continue
      }
      vel[i].y -= 9 * dt
      pos[i].addScaledVector(vel[i], dt)
      s.setScalar(size[i] * (life[i] / maxLife[i]))
      m.compose(pos[i], q, s)
      mesh.setMatrixAt(i, m)
    }
    mesh.instanceMatrix.needsUpdate = true
  }

  return { mesh, emit, update }
}
