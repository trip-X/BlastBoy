import { _decorator, Node, Prefab, instantiate, UITransform } from 'cc'
import { EnemyManager } from '../../Enemy/EnemyManager'
import { PlayerManager } from '../../Player/PlayerManager'
import { Weapon } from '../Weapon'
import ResourceManager from '../../Runtime/ResourceManager'
import DataManager from '../../Runtime/DataManager'
import { FlySwordBullet } from './FlySwordBullet'
import type { IWeapon } from '../WeaponTypes'

const { ccclass } = _decorator

const BulletPrefab_URL = 'texture/Bullet/FlySword/FlySword' // 状态机动画资源路径
const WEAPON_WIDTH = 120// 武器宽度
const WEAPON_HEIGHT = 60// 武器高度



@ccclass('FlySword')
export class FlySword extends Weapon {
    
    async init(params: IWeapon) {
        super.init(params)
        this.weaponWidth = WEAPON_WIDTH
        this.weaponHeight = WEAPON_HEIGHT
        this.bulletPrefab = await ResourceManager.Instance.loadPrefab(BulletPrefab_URL)// 加载子弹预制体

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

    //判断目标是否可以被攻击
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
        bulletNode.layer = this.node.layer// 确保子弹图层与武器一致（用于渲染）

        const stage = DataManager.Instance.stage || this.node.parent
        if (stage) stage.addChild(bulletNode)
    
        const bullet = bulletNode.getComponent(FlySwordBullet) || bulletNode.addComponent(FlySwordBullet)
        const visualNode = this.node.getChildByName('Visual') || this.node
        const startPos = visualNode.worldPosition // 获取武器当前位置作为发射点
        const targetPos = target.node.worldPosition // 获取敌人当前位置作为目标点

        bullet.init(damage, this.weaponBulletSpeed, startPos, targetPos)
    }

}
