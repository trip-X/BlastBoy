import { _decorator, BoxCollider2D, Collider2D, Component, Contact2DType, IPhysics2DContact } from 'cc'
import { COLLIDER_TYPE_ENUM } from '../Enums'
import DataManager from '../Runtime/DataManager'
import PlayerStats from '../Stats/PlayerStats'

const { ccclass } = _decorator

const HEAL_RATIO = 0.3
const PICKUP_RADIUS = 80

@ccclass('Life')
export class Life extends Component {
  private isConsumed = false
  private colliderList: BoxCollider2D[] = []

  onEnable() {
    this.colliderList = this.node.getComponentsInChildren(BoxCollider2D)
    for (const c of this.colliderList) {
      c.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this)
    }
  }

  onDisable() {
    for (const c of this.colliderList) {
      c.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this)
    }
    this.colliderList.length = 0
  }

  update() {
    if (this.isConsumed) return
    const player = DataManager.Instance.player
    if (!player || !player.node) return

    const playerPos = player.node.position
    const curPos = this.node.position
    const dx = playerPos.x - curPos.x
    const dy = playerPos.y - curPos.y
    const distSq = dx * dx + dy * dy

    if (distSq <= PICKUP_RADIUS * PICKUP_RADIUS) {
      const stats = player.node.getComponent(PlayerStats)
      if (!stats) return
      this.consume(stats)
    }
  }

  private onBeginContact(self: Collider2D, other: Collider2D, contact: IPhysics2DContact | null) {
    if (other.tag !== COLLIDER_TYPE_ENUM.PLAYER_BODY) return
    const stats = other.node.getComponent(PlayerStats)
    if (!stats) return

    this.consume(stats)
  }

  private consume(stats: PlayerStats) {
    if (this.isConsumed) return
    this.isConsumed = true

    const maxHp = stats.maxHP.getBuffValue()
    const heal = Math.max(1, Math.round(maxHp * HEAL_RATIO))
    stats.curHP = Math.min(maxHp, stats.curHP + heal)
    this.node.destroy()
  }
}
