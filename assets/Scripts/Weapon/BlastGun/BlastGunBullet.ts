import { _decorator, director, Vec3, Collider2D, IPhysics2DContact, PhysicsSystem2D, Rect, Animation, AnimationClip, Sprite, UITransform, resources } from 'cc'
import { EnemyManager } from '../../Enemy/EnemyManager'
import DataManager from '../../Runtime/DataManager'
import EventManager from '../../Runtime/EventManager'
import { COLLIDER_TYPE_ENUM, EVENT_ENUM } from '../../Enums'
import { Bullet } from '../Bullet'
import { createUINode } from '../../Utils/utils'

const { ccclass } = _decorator

const VISUAL_WIDTH = 150
const VISUAL_HEIGHT = 90
const COLLIDER_WIDTH = 60
const COLLIDER_HEIGHT = 90
const LIFETIME = 5
const BLAST_RADIUS = 200
const BLAST_EXPLOSION_ANIMATION_CLIP_URL = 'texture/Hit/BlastGun/BlastGun'
const BLAST_EXPLOSION_SCALE = 3

@ccclass('BlastGunBullet')
export class BlastGunBullet extends Bullet {
    private aoeHitIdSet: Set<string> = new Set()
    private isExploding = false
    private tmpWorldPos: Vec3 = new Vec3()
    private tmpEnemyWorldPos: Vec3 = new Vec3()
    private tmpAabb: Rect = new Rect()

    init(damage: number, speed: number, startPos: Vec3, targetPos: Vec3) {
        this.visualWidth = VISUAL_WIDTH
        this.visualHeight = VISUAL_HEIGHT
        this.colliderWidth = COLLIDER_WIDTH
        this.colliderHeight = COLLIDER_HEIGHT
        this.lifeTimer = LIFETIME

        super.init(damage, speed, startPos, targetPos)
    }


    // 更新子弹方向和旋转
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
        if (this.isExploding) return

        const moveStep = new Vec3()
        Vec3.multiplyScalar(moveStep, this.direction, this.speed * scaledDt * 100)
        const currentPos = this.node.position
        this.node.setPosition(currentPos.x + moveStep.x, currentPos.y + moveStep.y, currentPos.z)

        this.drawCollider()

        this.lifeTimer -= scaledDt
        if (this.lifeTimer <= 0) this.node.destroy()
    }

    // 爆炸一次（AOE伤害）
    private explodeOnce() {
        if (this.isExploding) return
        this.isExploding = true

        const stage = DataManager.Instance.stage
        if (!stage) {
            this.node.destroy()
            return
        }

        this.aoeHitIdSet.clear()

        // 以子弹“爆炸瞬间”的世界坐标作为爆炸中心
        const center = this.node.getWorldPosition(this.tmpWorldPos)
        this.playExplosionAnimation(center)

        // 先用 AABB（轴对齐包围盒）做一次粗筛：边长 = 2 * BLAST_RADIUS
        this.tmpAabb.x = center.x - BLAST_RADIUS
        this.tmpAabb.y = center.y - BLAST_RADIUS
        this.tmpAabb.width = BLAST_RADIUS * 2
        this.tmpAabb.height = BLAST_RADIUS * 2

        // 物理范围查询：拿到 AABB 覆盖范围内的 Collider2D
        // - 不同 Cocos 版本可能对查询 API 有差异，这里做了存在性判断，避免运行时报错
        const system: any = PhysicsSystem2D.instance
        const colliderList: Collider2D[] = system?.testAABB ? system.testAABB(this.tmpAabb) : []
        for (let i = 0; i < colliderList.length; i++) {
            const c = colliderList[i]
            if (!c) continue
            if (c.tag !== COLLIDER_TYPE_ENUM.ENEMY_BODY) continue// 只处理敌人的身体碰撞器

            const enemy = c.node.getComponent(EnemyManager)// 通过碰撞器所在节点拿到 EnemyManager
            if (!enemy || enemy.isDead) continue

            if (this.aoeHitIdSet.has(enemy.id)) continue// 同一敌人只结算一次伤害

            // 二次过滤：计算敌人到爆炸中心的真实距离
            enemy.node.getWorldPosition(this.tmpEnemyWorldPos)
            const dist = Vec3.distance(center, this.tmpEnemyWorldPos)
            if (dist > BLAST_RADIUS) continue

            // 到这里说明该敌人在爆炸半径内：记入去重集合，并派发伤害事件
            this.aoeHitIdSet.add(enemy.id)
            EventManager.Instance.emit(EVENT_ENUM.ENEMY_TAKE_DAMAGE, this.damage, enemy.id)
        }
        this.node.destroy()
    }

    // 播放爆炸特效
    private playExplosionAnimation(centerWorldPos: Vec3) {
        const stage = DataManager.Instance.stage
        if (!stage) return

        const effectNode = createUINode('BlastGunExplosion')
        effectNode.setParent(stage)
        effectNode.setWorldPosition(centerWorldPos)
        effectNode.setScale(BLAST_EXPLOSION_SCALE, BLAST_EXPLOSION_SCALE, 1)

        const transform = effectNode.getComponent(UITransform)
        transform?.setAnchorPoint(0.5, 0.5)

        const sprite = effectNode.addComponent(Sprite)
        sprite.sizeMode = Sprite.SizeMode.CUSTOM
        sprite.trim = false

        const anim = effectNode.addComponent(Animation)
        anim.on(Animation.EventType.FINISHED, () => {
            if (!effectNode.isValid) return
            effectNode.destroy()
        })

        resources.load(BLAST_EXPLOSION_ANIMATION_CLIP_URL, AnimationClip, (err, clip) => {
            if (!effectNode.isValid) return

            if (err || !clip) {
                effectNode.destroy()
                return
            }

            clip.wrapMode = AnimationClip.WrapMode.Normal

            const clips = anim.clips ?? []
            if (!clips.some(c => c === clip)) {
                anim.clips = [...clips, clip]
            }

            anim.defaultClip = clip
            anim.clips = anim.clips
            anim.play(clip.name)
        })
    }

    // 碰撞回调（方案A：命中瞬间做一次范围检索，然后销毁）
    onBeginContact(self: Collider2D, other: Collider2D, contact: IPhysics2DContact | null) {
        if (self.tag !== COLLIDER_TYPE_ENUM.BULLET) return
        if (other.tag !== COLLIDER_TYPE_ENUM.ENEMY_BODY) return

        const enemy = other.node.getComponent(EnemyManager)
        if (!enemy || enemy.isDead) return

        this.explodeOnce()
    }
}
