import { _decorator, Node, instantiate, UITransform } from 'cc'
import { EnemyManager } from '../../Enemy/EnemyManager'
import { PlayerManager } from '../../Player/PlayerManager'
import { Weapon } from '../Weapon'
import ResourceManager from '../../Runtime/ResourceManager'
import DataManager from '../../Runtime/DataManager'
import EventManager from '../../Runtime/EventManager'
import { EVENT_ENUM } from '../../Enums'

import type { IWeapon } from '../WeaponTypes'
import { ThunderFistBullet } from './ThunderFistBullet'

const { ccclass } = _decorator

const BulletPrefab_URL = 'texture/Bullet/ThunderFist/ThunderFist'
const WEAPON_WIDTH = 120
const WEAPON_HEIGHT = 120

@ccclass('ThunderFist')
export class ThunderFist extends Weapon {
    async init(params: IWeapon) {
        super.init(params)
        this.weaponWidth = WEAPON_WIDTH
        this.weaponHeight = WEAPON_HEIGHT
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
        if (!target || !target.node || !target.node.isValid || target.isDead) return
        const damage = this.getFinalDamage(player)

        // 即时伤害：雷击触发当帧直接结算，不走飞行碰撞
        EventManager.Instance.emit(EVENT_ENUM.ENEMY_TAKE_DAMAGE, damage, target.id)

        const bulletNode = instantiate(this.bulletPrefab)
        bulletNode.layer = this.node.layer

        const stage = DataManager.Instance.stage || this.node.parent
        if (stage) stage.addChild(bulletNode)

        const bullet = bulletNode.getComponent(ThunderFistBullet) || bulletNode.addComponent(ThunderFistBullet)
        const targetPos = target.node.worldPosition
        bullet.init(damage, this.weaponBulletSpeed, targetPos, targetPos)
    }
}
