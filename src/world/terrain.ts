import * as THREE from 'three'
import { rng } from './palette'
import { BLOCK_BOTTOM, strataAt } from './layers'
import type { Textures } from './textures'

export interface Column {
  x: number
  z: number
  /** Vertical offset used by the drop-in. 0 = resting position. */
  offset: number
}

type BlockType = 'grass' | 'dirt' | 'stone' | 'ore' | 'shaft' | 'deep' | 'core'

interface Block {
  type: BlockType
  col: Column
  y: number
}

const X_RANGE = 22
const Z_MIN = -3
const Z_MAX = 3

/** Ore chance per front-row block, by layer. The stone layer is the rich one. */
const ORE_RATE = { stone: 0.1, shaft: 0.03, deep: 0.03 } as const

/** Surface height. Flat around the crew, a few one-block bumps far on the left. */
function surfaceTop(x: number, rand: () => number): number {
  const bump = rand()
  return x < -14 && bump > 0.8 ? 1 : 0
}

/**
 * The whole planet column as voxels: one InstancedMesh per block type.
 * Only blocks the fixed camera can see are created: the top layers across all rows,
 * and the two front rows all the way down.
 */
export function createTerrain(tex: Textures) {
  const rand = rng(42)
  const columns: Column[] = []
  const blocks: Block[] = []

  for (let x = -X_RANGE; x <= X_RANGE; x++) {
    for (let z = Z_MIN; z <= Z_MAX; z++) {
      const col: Column = { x, z, offset: 0 }
      columns.push(col)
      const top = surfaceTop(x, rand)
      for (let y = top; y >= BLOCK_BOTTOM; y--) {
        if (!(y >= top - 2 || z >= Z_MAX - 1)) continue
        const layer = strataAt(y)
        let type: BlockType
        if (y === top) type = 'grass'
        else if (y >= top - 2 || layer === 'dirt') type = 'dirt'
        else if (layer === 'core') type = 'core'
        else {
          const rate = ORE_RATE[layer as keyof typeof ORE_RATE] ?? 0
          type = z === Z_MAX && rand() < rate ? 'ore' : layer
        }
        blocks.push({ type, col, y })
      }
    }
  }

  const geometry = new THREE.BoxGeometry(1, 1, 1)
  const mat = (map: THREE.Texture) => new THREE.MeshLambertMaterial({ map })
  const materials: Record<BlockType, THREE.Material | THREE.Material[]> = {
    // BoxGeometry face order: +x, -x, +y, -y, +z, -z
    grass: [
      mat(tex.grassSide),
      mat(tex.grassSide),
      mat(tex.grassTop),
      mat(tex.dirt),
      mat(tex.grassSide),
      mat(tex.grassSide),
    ],
    dirt: mat(tex.dirt),
    stone: mat(tex.stone),
    ore: mat(tex.ore),
    shaft: mat(tex.shaft),
    deep: mat(tex.deep),
    core: mat(tex.core),
  }

  const group = new THREE.Group()
  const meshes = {} as Record<BlockType, THREE.InstancedMesh>
  const members = {} as Record<BlockType, Block[]>
  for (const type of Object.keys(materials) as BlockType[]) {
    members[type] = blocks.filter((b) => b.type === type)
    const mesh = new THREE.InstancedMesh(geometry, materials[type], members[type].length)
    mesh.frustumCulled = false
    meshes[type] = mesh
    group.add(mesh)
  }

  const m = new THREE.Matrix4()
  function update() {
    for (const type of Object.keys(meshes) as BlockType[]) {
      const list = members[type]
      for (let i = 0; i < list.length; i++) {
        const b = list[i]
        m.setPosition(b.col.x, b.y + b.col.offset, b.col.z)
        meshes[type].setMatrixAt(i, m)
      }
      meshes[type].instanceMatrix.needsUpdate = true
    }
  }
  update()

  // Left to right, then front to back, so the drop-in sweeps across the planet.
  const ordered = [...columns].sort((a, b) => a.x - b.x || b.z - a.z)

  return { group, columns: ordered, update }
}
