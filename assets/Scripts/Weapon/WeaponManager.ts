import { _decorator, Component, director, instantiate } from 'cc'
import DataManager from '../Runtime/DataManager'
import { EnemyManager } from '../Enemy/EnemyManager'
import { PlayerManager } from '../Player/PlayerManager'
import { Weapon } from './Weapon'
import ResourceManager from '../Runtime/ResourceManager'
import { getWeaponConfig } from './WeaponConfig'
import type { IWeapon } from './WeaponTypes'
import { WEAPON_TYPE_ENUM } from '../Enums'

const { ccclass } = _decorator

const DEFAULT_ORBIT_RADIUS_PX = 120// 武器圆周吸附半径（像素）
const DEFAULT_ORBIT_ANGLE_OFFSET = 0// 武器角度偏移（弧度）：用于不同武器的初始分布/相位

// WeaponManager：挂在 Player 节点上的“武器系统入口”
// 职责边界：
// 1) 管理玩家身上的武器列表（增/删/清空）
// 2) 每帧更新武器的位置分布（圆周吸附）
// 3) 选择目标（当前版本：最近敌人 = DataManager.blueHorn，未来替换敌人列表只改 getNearestEnemy）
// 4) 驱动每把 Weapon 的攻击计时/连发结算（对外只表现为：向 EventManager 派发 ENEMY_TAKE_DAMAGE）
@ccclass('WeaponManager')
export class WeaponManager extends Component {
    private player: PlayerManager = null 
    private weaponList: Weapon[] = []// 玩家身上的武器实例列表
    private isInited = false// 初始化标记
    private circleBaseAngleRad = 0// 圆周吸附的基准角（弧度）：用于统一旋转所有武器的分布
    private circleRotateSpeedRad = 0// 圆周吸附的旋转速度（弧度/秒）：=0 则不绕圈
    private orbitRadius = DEFAULT_ORBIT_RADIUS_PX// 武器圆周吸附半径（像素）
    private orbitAngleOffset = DEFAULT_ORBIT_ANGLE_OFFSET// 武器角度偏移（弧度）：用于不同武器的初始分布/相位

    onLoad() {
        this.player = this.getComponent(PlayerManager)
    }

    start() {
        this.isInited = true
    }

    // 添加指定类型的武器
    async addWeapon(weaponType: WEAPON_TYPE_ENUM, overrideParams: Partial<IWeapon> = {}) {
        const config = getWeaponConfig(weaponType)
        if (!config) return null

        const prefab = await ResourceManager.Instance.loadPrefab(config.prefabUrl)
        if (!prefab) return null

        const params: IWeapon = {
            ...config.params,
            ...overrideParams,
        }
        const newWeaponNode = instantiate(prefab)
        newWeaponNode.layer = this.node.layer
        const parent = params.weaponAttach ? this.node : (DataManager.Instance.stage || this.node)
        parent.addChild(newWeaponNode)

        const weapon = newWeaponNode.addComponent(config.weaponClass)
        weapon.init(params)
        this.weaponList.push(weapon)
    }

    // 移除指定类型的武器
    removeWeapon(weaponType: WEAPON_TYPE_ENUM) {
        const config = getWeaponConfig(weaponType)
        if (!config) return

        const weaponId = config.id
        if (!weaponId) return

        if (this.weaponList.length === 0) return

        const remainList: Weapon[] = []
        for (const w of this.weaponList) {
            if (!w) continue
            if (w.weaponId !== weaponId) {
                remainList.push(w)
                continue
            }
            if (w.weaponNode && w.weaponNode.isValid) w.weaponNode.destroy()
        }
        this.weaponList = remainList
    }

    // 更新指定类型的武器参数
    updateWeapon(weaponType: WEAPON_TYPE_ENUM, patch: Partial<IWeapon>) {
        if (!patch) return false

        const config = getWeaponConfig(weaponType)
        if (!config) return false

        const weaponId = config.id
        if (!weaponId) return false

        if (this.weaponList.length === 0) return false

        for (const w of this.weaponList) {
            if (!w) continue
            if (w.weaponId !== weaponId) continue

            if (patch.weaponDamage != null) w.weaponDamage = patch.weaponDamage
            if (patch.weaponOnceAttackCooldown != null) w.weaponOnceAttackCooldown = Math.max(0.01, patch.weaponOnceAttackCooldown)
            if (patch.weaponOnceAttackSingleTimes != null) w.weaponOnceAttackSingleTimes = Math.max(1, patch.weaponOnceAttackSingleTimes)
            if (patch.weaponOnceAttackDuration != null) w.weaponOnceAttackDuration = Math.max(0.01, patch.weaponOnceAttackDuration)
            if (patch.weaponBulletSpeed != null) w.weaponBulletSpeed = Math.max(0, patch.weaponBulletSpeed)
            if (patch.weaponAttach != null) w.weaponAttach = patch.weaponAttach

            if (w.weaponAttach) {
                w.weaponAttackRange = -1
            } else if (patch.weaponAttackRange != null) {
                w.weaponAttackRange = patch.weaponAttackRange
            }

            w.onParamsUpdated(patch)
        }
    }

    update(dt: number) {
        if (!this.isInited) return
        if (!this.player) return
        if (this.player.isDead) return
        if (!dt || dt <= 0) return

        const timeScale = director.getScheduler().getTimeScale()
        if (timeScale <= 0) return
        const scaledDt = dt * timeScale

        this.cleanInvalidWeapons()// 清理已销毁的武器节点

        // 如果开启绕圈，就推进基准角度，让武器整体做圆周运动
        if (this.circleRotateSpeedRad !== 0) {
            this.circleBaseAngleRad += this.circleRotateSpeedRad * scaledDt
        }

        const target = this.player.getNearestTarget()// 选择目标：直接从玩家维护的 targets 中取最近可攻击目标
        const weaponCount = this.weaponList.length
        let attachCount = 0
        for (let i = 0; i < weaponCount; i++) {
            const w = this.weaponList[i]
            if (w && w.weaponAttach) attachCount += 1
        }

        let attachIndex = 0
        for (let i = 0; i < weaponCount; i++) {
            const weapon = this.weaponList[i]
            if (weapon && weapon.weaponAttach) {
                this.updateWeaponTransform(weapon, attachIndex, attachCount, target)// 先更新位置与朝向（纯表现层，不结算伤害）
                attachIndex += 1
            } else {
                this.updateWeaponTransform(weapon, 0, 1, target)
            }
            weapon.updateOnceAttack(scaledDt, this.player, target)// 再更新攻速计时与伤害结算（纯逻辑层：通过事件派发伤害）
        }
    }

    // 清除所有武器：根据参数是否销毁节点，destroyNodes=true：同时销毁节点；false：只清数据（例如做对象池时会用到）
    clearWeapons(destroyNodes: boolean = true) {
        if (destroyNodes) {
            for (const w of this.weaponList) {
                if (w.weaponNode && w.weaponNode.isValid) w.weaponNode.destroy()
            }
        }
        this.weaponList.length = 0
    }

    // 设置绕圈速度：允许外部控制绕圈速度，0：不绕圈，>0：逆时针，<0：顺时针
    setCircleRotateSpeed(radPerSec: number) {
        this.circleRotateSpeedRad = radPerSec
    }

    // 更新武器位置与朝向（纯表现，不涉及伤害结算）
    private updateWeaponTransform(weapon: Weapon, index: number, count: number, target: EnemyManager) {
        const weaponNode = weapon.weaponNode
        if (!weaponNode || !weaponNode.isValid) return

        if (!weapon.weaponAttach) {
            weaponNode.setRotationFromEuler(0, 0, 0)
            const visualNode = weaponNode.getChildByName('Visual')
            if (visualNode && visualNode.isValid) {
                visualNode.setRotationFromEuler(0, 0, 0)
            }
            return
        }

        const n = Math.max(1, count)// 武器数量：至少 1 只，避免除零错误
        const angle = this.circleBaseAngleRad + this.orbitAngleOffset + index * (Math.PI * 2 / n)// 计算武器角度：基准角度 + 偏移角度 + 索引 * 每个武器角度间隔
        const offsetX = this.orbitRadius * Math.cos(angle)// 计算武器 X 轴偏移：半径 * 余弦角度
        const offsetY = this.orbitRadius * Math.sin(angle)// 计算武器 Y 轴偏移：半径 * 正弦角度

        if (weapon.weaponAttach) {
            const isMirrored = this.node.scale.x < 0
            weaponNode.setPosition(isMirrored ? -offsetX : offsetX, offsetY, 0)

            const expectedX = isMirrored ? -1 : 1
            const s = weaponNode.scale
            const nextY = Math.abs(s.y) || 1
            const nextZ = Math.abs(s.z) || 1
            if (s.x !== expectedX || s.y !== nextY || s.z !== nextZ) {
                weaponNode.setScale(expectedX, nextY, nextZ)
            }
        }

        const visualNode = weaponNode.getChildByName('Visual')
        if (!visualNode || !visualNode.isValid) return

        const vs = visualNode.scale
        if (vs.x !== 1 || vs.y !== 1 || vs.z !== 1) visualNode.setScale(1, 1, 1)

        const hasTarget = !!target && !!target.node && target.node.isValid && !target.isDead
        if (!hasTarget) {
            visualNode.setRotationFromEuler(0, 0, weapon.aimOffsetDeg)
            return
        }

        const wp = visualNode.worldPosition
        const tp = target.node.worldPosition
        const deg = Math.atan2(tp.y - wp.y, tp.x - wp.x) * (180 / Math.PI) + weapon.aimOffsetDeg
        visualNode.setRotationFromEuler(0, 0, deg)
    }

    // 清理无效武器节点
    private cleanInvalidWeapons() {
        if (this.weaponList.length === 0) return
        this.weaponList = this.weaponList.filter(w => w.weaponNode && w.weaponNode.isValid)
    }
}
