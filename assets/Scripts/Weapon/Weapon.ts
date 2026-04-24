import { _decorator, Component, Node, Prefab } from 'cc'
import { EnemyManager } from '../Enemy/EnemyManager'
import { PlayerManager } from '../Player/PlayerManager'
import type { IWeapon } from './WeaponTypes'
import PlayerStats from '../Stats/PlayerStats'
const { ccclass } = _decorator



export abstract class Weapon extends Component {
    weaponId: string// 武器类型/唯一标识（用于：节点命名、调试、后续配置表映射）
    weaponNode: Node// 武器节点
    weaponAttach: boolean// 是否吸附在玩家身上
    weaponDamage: number// 伤害倍率（最终伤害 = playerAttack * weaponDamage）
    weaponOnceAttackCooldown: number// 攻击间隔（秒）
    weaponOnceAttackSingleTimes: number// 每次攻击会结算几次（连发/多段伤害）
    weaponOnceAttackDuration: number// 一次攻击持续时间（秒）
    weaponBulletSpeed: number// 子弹速度
    weaponOnceAttackTimer: number// 攻击冷却计时器
    weaponAttackRange: number// 攻击范围
    weaponSingleAttackRemain: number = 0// 剩余连发次数
    weaponSingleAttackTimer: number = 0// 连发状态计时器
    weaponWidth: number = -1// 武器宽度
    weaponHeight: number = -1// 武器高度
    aimOffsetDeg: number = 0// 瞄准角度补偿（美术资源默认朝向不是“朝右”时使用）
    bulletPrefab: Prefab = null// 子弹预制体

    // 初始化武器
    init(params: IWeapon) {
        this.weaponNode = this.node
        this.weaponId = params.weaponId
        this.weaponAttach = params.weaponAttach
        this.weaponDamage = params.weaponDamage
        this.weaponOnceAttackCooldown = Math.max(0.01, (params.weaponOnceAttackCooldown))
        this.weaponOnceAttackSingleTimes = Math.max(1, (params.weaponOnceAttackSingleTimes))
        this.weaponOnceAttackDuration = Math.max(0.01, (params.weaponOnceAttackDuration))
        this.weaponBulletSpeed = Math.max(0, (params.weaponBulletSpeed))
        this.weaponAttackRange = this.weaponAttach ? -1 : params.weaponAttackRange
        this.weaponOnceAttackTimer = 0
        this.weaponSingleAttackRemain = 0
        this.weaponSingleAttackTimer = 0
    }

    onParamsUpdated(patch: Partial<IWeapon>) {}

    protected getFinalDamage(player: PlayerManager) {
        const stats = player?.node?.getComponent(PlayerStats)
        const baseAttack = stats ? stats.attack.getBuffValue() : 0
        const rate = this.weaponDamage
        return Math.max(1, Math.round(baseAttack * rate))
    }

    // 更新武器一次攻击状态
    updateOnceAttack(dt: number, player: PlayerManager, target: EnemyManager) {
        if (!dt || dt <= 0) return
        // 若仍处于“本轮连发/多段”阶段：继续按节奏吐出剩余发数
        if (this.weaponSingleAttackRemain > 0) {
            this.updateSingleAttack(dt, player, target)
            return
        }

        this.weaponOnceAttackTimer -= dt // 不在连发阶段：推进宏观冷却计时器
        if (this.weaponOnceAttackTimer > 0) return // 冷却未结束：本帧不允许开火

        // 冷却结束但命中条件不满足：本帧不发射
        if (!this.canHitTarget(player, target)) {
            this.weaponOnceAttackTimer = 0// 重置冷却计时器，等待下一轮攻击
            return
        }

        // 只有 1 发/1 段：立刻触发一次 bulletAttack，然后进入下一轮冷却
        if (this.weaponOnceAttackSingleTimes <= 1) {
            // 有限次数的“补偿循环”：防止 dt 很大导致计时器为负而漏掉一次开火机会
            // 同时用上限避免极端情况下卡死
            for (let i = 0; i < 5; i++) {
                this.bulletAttack(dt, player, target)
                this.weaponOnceAttackTimer += this.weaponOnceAttackCooldown//进入冷却
                if (this.weaponOnceAttackTimer > 0) break
            }
            return
        }

        // 多段/连发：进入“连发状态”，由 updateSingleAttack 决定每一发的触发时机
        // 先把冷却推进到下一轮（让冷却在连发期间也流逝，避免整体攻速变慢）
        for (let i = 0; i < 5; i++) {
            this.weaponOnceAttackTimer += this.weaponOnceAttackCooldown//进入冷却
            if (this.weaponOnceAttackTimer > 0) break
        }

        // 记录本轮连发剩余发数，并把“下一发倒计时”置 0（表示下一帧立刻允许触发第一发）
        this.weaponSingleAttackRemain = this.weaponOnceAttackSingleTimes
        this.weaponSingleAttackTimer = 0
    }



    // 更新子弹一次攻击状态
    updateSingleAttack(dt: number, player: PlayerManager, target: EnemyManager) {
        if (!dt || dt <= 0) return

        // 连发过程中如果命中条件不再满足（目标没了/超距/死亡等），立刻中断本轮连发
        if (!this.canHitTarget(player, target)) {
            this.weaponSingleAttackRemain = 0
            this.weaponSingleAttackTimer = 0
            return
        }

        // 连发期间同时推进
        this.weaponOnceAttackTimer -= dt
        this.weaponSingleAttackTimer -= dt

        // 计算连发间隔
        const shotInterval = this.weaponOnceAttackSingleTimes > 1 ? this.weaponOnceAttackDuration / (this.weaponOnceAttackSingleTimes - 1) : 0

        // 当倒计时 <= 0 时就触发一发；单帧最多触发 10 次，避免 interval=0 或 dt 异常导致死循环
        for (let i = 0; i < 10 && this.weaponSingleAttackRemain > 0 && this.weaponSingleAttackTimer <= 0; i++) {
            this.bulletAttack(dt, player, target)
            this.weaponSingleAttackRemain -= 1
            this.weaponSingleAttackTimer += shotInterval
        }

        // 本轮连发结束：清空状态，回到“只等冷却结束再开下一轮”的状态
        if (this.weaponSingleAttackRemain <= 0) {
            this.weaponSingleAttackRemain = 0
            this.weaponSingleAttackTimer = 0
        }
    }

    // 子弹攻击
    protected abstract bulletAttack(dt: number, player: PlayerManager, target: EnemyManager): void

    // 是否命中目标
    protected abstract canHitTarget(player: PlayerManager, target: EnemyManager): boolean

}


