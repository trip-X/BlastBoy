import { _decorator, director, Vec3, Collider2D, IPhysics2DContact } from 'cc'
import { EnemyManager } from '../../Enemy/EnemyManager'
import EventManager from '../../Runtime/EventManager'
import { COLLIDER_TYPE_ENUM, EVENT_ENUM } from '../../Enums'
import { Bullet } from '../Bullet'

const { ccclass } = _decorator

const VISUAL_WIDTH = 120
const VISUAL_HEIGHT = 200
const COLLIDER_WIDTH = 80
const COLLIDER_HEIGHT = 200
const LIFETIME = 5

@ccclass('OnionSwordBullet')
export class OnionSwordBullet extends Bullet {
    init(damage: number, speed: number, startPos: Vec3, targetPos: Vec3) {
        this.visualWidth = VISUAL_WIDTH
        this.visualHeight = VISUAL_HEIGHT
        this.colliderWidth = COLLIDER_WIDTH
        this.colliderHeight = COLLIDER_HEIGHT
        this.lifeTimer = LIFETIME

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
        if (other.tag !== COLLIDER_TYPE_ENUM.ENEMY_BODY) return
        const enemy = other.node.getComponent(EnemyManager)
        if (enemy && !enemy.isDead) {
            EventManager.Instance.emit(EVENT_ENUM.ENEMY_TAKE_DAMAGE, this.damage, enemy.id)
        }
    }
}
