import { Node } from 'cc'
import { ENTITY_TYPE_ENUM } from '../Enums'
import Singleton from '../Base/Singleton'

const MAX_POOL_SIZE_PER_TYPE = 20

export default class EnemyPool extends Singleton {
  static get Instance() {
    return super.GetInstance<EnemyPool>()
  }

  private poolMap: Map<ENTITY_TYPE_ENUM, Node[]> = new Map()

  acquire(type: ENTITY_TYPE_ENUM): Node | null {
    const pool = this.poolMap.get(type)
    if (!pool || pool.length === 0) return null

    while (pool.length > 0) {
      const node = pool.pop()
      if (node && node.isValid) return node
    }
    return null
  }

  release(type: ENTITY_TYPE_ENUM, node: Node) {
    if (!node || !node.isValid) return

    node.removeAllChildren()
    node.active = false

    if (!this.poolMap.has(type)) {
      this.poolMap.set(type, [])
    }
    const pool = this.poolMap.get(type)
    if (pool.length < MAX_POOL_SIZE_PER_TYPE) {
      pool.push(node)
    } else {
      node.destroy()
    }
  }

  clear() {
    for (const [_, pool] of this.poolMap) {
      for (const node of pool) {
        if (node && node.isValid) {
          node.destroy()
        }
      }
    }
    this.poolMap.clear()
  }
}
