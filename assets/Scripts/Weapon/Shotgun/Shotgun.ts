import { _decorator, Node, instantiate, UITransform, Vec3 } from 'cc'
import { EnemyManager } from '../../Enemy/EnemyManager'
import { PlayerManager } from '../../Player/PlayerManager'
import DataManager from '../../Runtime/DataManager'
import ResourceManager from '../../Runtime/ResourceManager'
import { Weapon } from '../Weapon'
import { IWeapon } from '../WeaponConfig'
import { ShotgunBullet } from './ShotgunBullet'


const { ccclass } = _decorator

const BulletPrefab_URL = 'texture/Bullet/Shotgun/Shotgun'
const WEAPON_WIDTH = 120
const WEAPON_HEIGHT = 60
const AIM_OFFSET_DEG = -18// 枪口默认朝向补偿：若方向反了可改为 -90 或 180
const PELLET_COUNT = 4// 散弹枪一次射出的子弹数量（默认4发）
const SPREAD_ANGLE_DEG = 30// 总夹角：最左到最右一共多少度（默认30度）
const SHOT_TARGET_DISTANCE = 1000// 用于计算散射方向的虚拟目标距离（足够远即可）

@ccclass('Shotgun')
export class Shotgun extends Weapon {
    async init(params: IWeapon) {
        super.init(params)
        this.weaponWidth = WEAPON_WIDTH
        this.weaponHeight = WEAPON_HEIGHT
        this.aimOffsetDeg = AIM_OFFSET_DEG
        this.bulletPrefab = await ResourceManager.Instance.loadPrefab(BulletPrefab_URL)

        let visualNode = this.node.getChildByName('Visual')
        if (!visualNode) {
            visualNode = new Node('Visual')
            visualNode.layer = this.node.layer
            this.node.addChild(visualNode)
        }

        const transform = visualNode.getComponent(UITransform) || visualNode.addComponent(UITransform)
        transform.setContentSize(this.weaponWidth, this.weaponHeight)
        transform.setAnchorPoint(0.5, 0.5)
    }

    protected canHitTarget(player: PlayerManager, target: EnemyManager): boolean {
        if (!target) return false
        if (!target.node || !target.node.isValid) return false
        if (target.isDead) return false
        if (!this.bulletPrefab) return false
        return true
    }

    protected bulletAttack(dt: number, player: PlayerManager, target: EnemyManager): void {
        if (!this.bulletPrefab) return
        const damage = this.getFinalDamage(player)
        const visualNode = this.node.getChildByName('Visual') || this.node
        const startPos = visualNode.worldPosition
        const aimPos = target.node.worldPosition

        // 1) 先计算“朝向目标”的基础角度（弧度）
        const baseRad = Math.atan2(aimPos.y - startPos.y, aimPos.x - startPos.x)
        // 2) 总夹角与发射数量做安全钳制，避免异常参数
        const pelletCount = Math.max(1, PELLET_COUNT)
        const spreadDeg = Math.max(0, SPREAD_ANGLE_DEG)
        // 3) 均匀散布：例如 4 发、30 度 => -15, -5, 5, 15
        const startOffsetDeg = -spreadDeg / 2
        const stepDeg = pelletCount > 1 ? spreadDeg / (pelletCount - 1) : 0

        const stage = DataManager.Instance.stage || this.node.parent
        if (!stage) return

        for (let i = 0; i < pelletCount; i++) {
            const offsetDeg = startOffsetDeg + stepDeg * i
            const shotRad = baseRad + offsetDeg * (Math.PI / 180)

            // 用“足够远”的点定义这一发的飞行方向，Bullet 会做归一化
            const shotTargetPos = new Vec3(
                startPos.x + Math.cos(shotRad) * SHOT_TARGET_DISTANCE,
                startPos.y + Math.sin(shotRad) * SHOT_TARGET_DISTANCE,
                startPos.z
            )

            const bulletNode = instantiate(this.bulletPrefab)
            bulletNode.layer = this.node.layer
            stage.addChild(bulletNode)

            const bullet = bulletNode.getComponent(ShotgunBullet) || bulletNode.addComponent(ShotgunBullet)
            bullet.init(damage, this.weaponBulletSpeed, startPos, shotTargetPos)
        }
    }
}
