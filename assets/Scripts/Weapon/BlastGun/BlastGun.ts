import { _decorator, Node, instantiate, UITransform, Vec3 } from 'cc'
import { EnemyManager } from '../../Enemy/EnemyManager'
import { PlayerManager } from '../../Player/PlayerManager'
import ResourceManager from '../../Runtime/ResourceManager'
import DataManager from '../../Runtime/DataManager'
import { Weapon } from '../Weapon'
import type { IWeapon } from '../WeaponTypes'
import { BlastGunBullet } from './BlastGunBullet'


const { ccclass } = _decorator

const BULLET_PREFAB_URL = 'texture/Bullet/BlastGun/BlastGun'
const WEAPON_WIDTH = 120
const WEAPON_HEIGHT = 120

@ccclass('BlastGun')
export class BlastGun extends Weapon {
    async init(params: IWeapon) {
        super.init(params)

        this.weaponWidth = WEAPON_WIDTH
        this.weaponHeight = WEAPON_HEIGHT
        this.bulletPrefab = await ResourceManager.Instance.loadPrefab(BULLET_PREFAB_URL)

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

        if (this.weaponAttackRange != null && this.weaponAttackRange > 0) {
            if (!player || !player.node || !player.node.isValid) return false
            const d = Vec3.distance(player.node.worldPosition, target.node.worldPosition)
            if (d > this.weaponAttackRange) return false
        }

        return true
    }

    protected bulletAttack(dt: number, player: PlayerManager, target: EnemyManager): void {
        if (!this.bulletPrefab) return
        if (!target || !target.node || !target.node.isValid) return
        const damage = this.getFinalDamage(player)

        const bulletNode = instantiate(this.bulletPrefab)
        bulletNode.layer = this.node.layer

        const stage = DataManager.Instance.stage || this.node.parent
        if (stage) stage.addChild(bulletNode)

        const bullet = bulletNode.getComponent(BlastGunBullet) || bulletNode.addComponent(BlastGunBullet)
        const visualNode = this.node.getChildByName('Visual') || this.node
        const startPos = visualNode.worldPosition
        const targetPos = target.node.worldPosition

        bullet.init(damage, this.weaponBulletSpeed, startPos, targetPos)
    }
}
