import { _decorator, director, Vec3, Collider2D, IPhysics2DContact } from 'cc'
import EventManager from '../../Runtime/EventManager'
import { COLLIDER_TYPE_ENUM, EVENT_ENUM } from '../../Enums'
import { Bullet } from '../../Weapon/Bullet'

const { ccclass } = _decorator

const VISUAL_WIDTH = 50
const VISUAL_HEIGHT = 50
const COLLIDER_WIDTH = 40
const COLLIDER_HEIGHT = 40
const LIFETIME = 5

@ccclass('MummyBullet')
export class MummyBullet extends Bullet {
  private sourceId: string = ''

  init(damage: number, speed: number, startPos: Vec3, targetPos: Vec3, sourceId: string = '') {
    this.visualWidth = VISUAL_WIDTH
    this.visualHeight = VISUAL_HEIGHT
    this.colliderWidth = COLLIDER_WIDTH
    this.colliderHeight = COLLIDER_HEIGHT
    this.lifeTimer = LIFETIME
    this.sourceId = sourceId

    super.init(damage, speed, startPos, targetPos)
  }

  updateDirectionAndRotation(startPos: Vec3, targetPos: Vec3) {
    Vec3.subtract(this.direction, targetPos, startPos)
    this.direction.normalize()
    const angle = Math.atan2(this.direction.y, this.direction.x) * (180 / Math.PI)
    this.node.setRotationFromEuler(0, 0, angle)
  }

  update(dt: number) {
    if (!dt || dt <= 0) return
    const timeScale = director.getScheduler().getTimeScale()
    if (timeScale <= 0) return
    const scaledDt = dt * timeScale

    const moveStep = new Vec3()
    Vec3.multiplyScalar(moveStep, this.direction, this.speed * scaledDt * 100)
    const currentPos = this.node.position
    this.node.setPosition(currentPos.x + moveStep.x, currentPos.y + moveStep.y, currentPos.z)

    this.drawCollider()

    this.lifeTimer -= scaledDt
    if (this.lifeTimer <= 0) this.node.destroy()
  }

  onBeginContact(self: Collider2D, other: Collider2D, contact: IPhysics2DContact | null) {
    if (other?.tag !== COLLIDER_TYPE_ENUM.PLAYER_BODY) return
    EventManager.Instance.emit(EVENT_ENUM.PLAYER_TAKE_DAMAGE, this.damage, this.sourceId)
    this.node.destroy()
  }
}
