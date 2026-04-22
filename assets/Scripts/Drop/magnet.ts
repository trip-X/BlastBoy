import { _decorator, BoxCollider2D, Collider2D, Component, Contact2DType, IPhysics2DContact } from 'cc'
import { COLLIDER_TYPE_ENUM } from '../Enums'
import DataManager from '../Runtime/DataManager'
import { Exp } from './Exp'

const { ccclass } = _decorator

const PICKUP_RADIUS = 120

@ccclass('magnet')
export class magnet extends Component {
  private colliderList: BoxCollider2D[] = []
  private isConsumed = false

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
      this.consume()
    }
  }

  private onBeginContact(self: Collider2D, other: Collider2D, contact: IPhysics2DContact | null) {
    if (other.tag !== COLLIDER_TYPE_ENUM.PLAYER_BODY) return
    this.consume()
  }

  private consume() {
    if (this.isConsumed) return
    this.isConsumed = true

    const stage = DataManager.Instance.stage
    if (stage) {
      const expList = stage.getComponentsInChildren(Exp)
      for (const exp of expList) {
        exp.forceMagnet()
      }
    }
    this.node.destroy()
  }
}
