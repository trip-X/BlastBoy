import { _decorator, Node, UITransform, CircleCollider2D, RigidBody2D, ERigidBody2DType, Contact2DType, Collider2D, PhysicsSystem2D, Color, Graphics, Sprite } from 'cc'
import { EnemyManager } from '../../Enemy/EnemyManager'
import { PlayerManager } from '../../Player/PlayerManager'
import EventManager from '../../Runtime/EventManager'
import { TileMapManager } from '../../Tile/TileMapManager'
import { Weapon } from '../Weapon'
import { IWeapon } from '../WeaponConfig'
import { COLLIDER_TYPE_ENUM, EVENT_ENUM } from '../../Enums'

const { ccclass } = _decorator

const WEAPON_WIDTH = 900// 武器宽度
const WEAPON_HEIGHT = 900// 武器高度

@ccclass('ToxicZone')
export class ToxicZone extends Weapon {
    private activeEnemies: Set<string> = new Set()
    private graphicLine: Graphics = null
    private isDrawCollider: boolean = false
    private tileMapNode: Node = null
    private initialAttackRange: number = 0

    async init(params: IWeapon) {
        super.init(params)

        this.weaponWidth = WEAPON_WIDTH
        this.weaponHeight = WEAPON_HEIGHT
        this.initialAttackRange = this.weaponAttackRange

        let visualNode = this.node.getChildByName('Visual')
        if (!visualNode) {
            visualNode = new Node('Visual')
            visualNode.layer = this.node.layer
            this.node.addChild(visualNode)
        }

        const transform = visualNode.getComponent(UITransform) || visualNode.addComponent(UITransform)
        transform.setContentSize(this.weaponWidth, this.weaponHeight)
        transform.setAnchorPoint(0.5, 0.5)

        // 初始化物理碰撞体（Sensor光环）
        this.initPhysics()
    }

    private initPhysics() {
        if (!PhysicsSystem2D.instance.enable) PhysicsSystem2D.instance.enable = true
        
        let rb = this.getComponent(RigidBody2D) || this.addComponent(RigidBody2D)
        rb.type = ERigidBody2DType.Kinematic // 运动学类型，不受力影响但可以移动
        rb.enabledContactListener = true     // 必须开启，否则不会派发 contact 事件
        rb.gravityScale = 0

        let collider = this.getComponent(CircleCollider2D) || this.addComponent(CircleCollider2D)
        collider.sensor = true // 传感器模式，只检测重叠不产生物理推挤
        collider.radius = this.weaponAttackRange
        collider.tag = COLLIDER_TYPE_ENUM.BULLET_DAMAGE // 采用伤害标签
        collider.apply() // 应用修改

        // 注册碰撞回调
        collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this)
        collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this)
        collider.off(Contact2DType.END_CONTACT, this.onEndContact, this)
        collider.on(Contact2DType.END_CONTACT, this.onEndContact, this)
    }

    onDestroy() {
        let collider = this.getComponent(CircleCollider2D)
        if (collider) {
            collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this)
            collider.off(Contact2DType.END_CONTACT, this.onEndContact, this)
        }
        this.activeEnemies.clear()
    }

    onParamsUpdated(patch: Partial<IWeapon>) {
        if (patch.weaponAttackRange == null || this.initialAttackRange <= 0) return

        const scale = this.weaponAttackRange / this.initialAttackRange

        const visualNode = this.node.getChildByName('Visual')
        if (visualNode && visualNode.isValid) {
            visualNode.setScale(scale, scale, 1)
        }

        const collider = this.getComponent(CircleCollider2D)
        if (collider && collider.isValid) {
            collider.radius = this.weaponAttackRange
            collider.apply()
        }
    }

    // 碰撞进入：记录敌人
    protected onBeginContact(self: Collider2D, other: Collider2D) {
        if (other.tag !== COLLIDER_TYPE_ENUM.ENEMY_BODY) return
        const enemy = other.node.getComponent(EnemyManager)
        if (enemy && !enemy.isDead) {
            this.activeEnemies.add(enemy.id)
        }
    }

    // 碰撞离开：移除敌人
    protected onEndContact(self: Collider2D, other: Collider2D) {
        if (other.tag !== COLLIDER_TYPE_ENUM.ENEMY_BODY) return
        const enemy = other.node.getComponent(EnemyManager)
        if (enemy) {
            this.activeEnemies.delete(enemy.id)
        }
    }

    // 绘制调试辅助线
    protected drawCollider() {
        if (!this.isDrawCollider) return

        if (!this.graphicLine) {
            let graphicNode = this.node.getChildByName('GraphicCollider')
            if (!graphicNode) {
                graphicNode = new Node('GraphicCollider')
                graphicNode.layer = this.node.layer
                graphicNode.setPosition(0, 0)
                this.node.addChild(graphicNode)
                graphicNode.setSiblingIndex(this.node.children.length - 1)
            }
            this.graphicLine = graphicNode.getComponent(Graphics) || graphicNode.addComponent(Graphics)
            this.graphicLine.lineWidth = 5
            this.graphicLine.strokeColor = Color.GREEN // 毒圈用绿色表示
        }

        const g = this.graphicLine
        g.clear()
        
        // 绘制圆形光环
        g.circle(0, 0, this.weaponAttackRange)
        g.stroke()
    }

    // 重写 Weapon 的 updateOnceAttack，让它在执行原逻辑前，先同步玩家坐标
    updateOnceAttack(dt: number, player: PlayerManager, target: EnemyManager) {
        if (player && player.node) {
            const playerPos = player.node.position
            this.node.setPosition(playerPos.x, playerPos.y, playerPos.z)
        }

        this.updateRenderOrder()
        this.drawCollider()

        super.updateOnceAttack(dt, player, target)
    }

    private updateRenderOrder() {
        const parent = this.node.parent
        if (!parent || !parent.isValid) return

        if (!this.tileMapNode || !this.tileMapNode.isValid || this.tileMapNode.parent !== parent) {
            this.tileMapNode = parent.children.find(n => !!n.getComponent(TileMapManager)) || null
        }

        if (!this.tileMapNode || !this.tileMapNode.isValid) return

        if (this.tileMapNode.getSiblingIndex() !== 0) {
            this.tileMapNode.setSiblingIndex(0)
        }
        if (this.node.getSiblingIndex() !== 1) {
            this.node.setSiblingIndex(1)
        }
    }

    // 判断目标是否可以被攻击：只要敌人列表不为空，且冷却到了，就允许“开火”（派发伤害）
    protected canHitTarget(player: PlayerManager, target: EnemyManager): boolean {
        return this.activeEnemies.size > 0
    }

    // 每次“开火”结算：给当前圈内的所有存活敌人派发伤害事件
    protected bulletAttack(dt: number, player: PlayerManager, target: EnemyManager): void {
        if (this.activeEnemies.size === 0) return
        const damage = this.getFinalDamage(player)

        // 遍历所有圈内敌人
        for (const enemyId of this.activeEnemies) {
            // 通过事件机制通知对应 ID 的敌人扣血
            EventManager.Instance.emit(EVENT_ENUM.ENEMY_TAKE_DAMAGE, damage, enemyId)
        }
    }
}
