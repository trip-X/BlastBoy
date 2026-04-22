import { _decorator, Node, Prefab, instantiate, UITransform } from 'cc'
import { EnemyManager } from '../../Enemy/EnemyManager'
import { PlayerManager } from '../../Player/PlayerManager'
import { Weapon } from '../Weapon'
import ResourceManager from '../../Runtime/ResourceManager'
import DataManager from '../../Runtime/DataManager'
import { IWeapon } from '../WeaponConfig'
import { OnionSwordBullet } from './OnionSwordBullet'

const { ccclass } = _decorator

const BulletPrefab_URL = 'texture/Bullet/OnionSword/OnionSword'
const WEAPON_WIDTH = 120
const WEAPON_HEIGHT = 60

@ccclass('OnionSword')
export class OnionSword extends Weapon {
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
        const damage = this.getFinalDamage(player)
        const bulletNode = instantiate(this.bulletPrefab)
        bulletNode.layer = this.node.layer

        const stage = DataManager.Instance.stage || this.node.parent
        if (stage) stage.addChild(bulletNode)

        const bullet = bulletNode.getComponent(OnionSwordBullet) || bulletNode.addComponent(OnionSwordBullet)
        const visualNode = this.node.getChildByName('Visual') || this.node
        const startPos = visualNode.worldPosition
        const targetPos = target.node.worldPosition

        bullet.init(damage, this.weaponBulletSpeed, startPos, targetPos)
    }
}
