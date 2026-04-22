import { Component } from "cc"
import { IPlayerStats } from "../../Maps"
import Stat from "../Base/Stat"
import EventManager from "../Runtime/EventManager"
import { EVENT_ENUM } from "../Enums"
import { MAX_PLAYER_LEVEL } from "../Upgrade/UpgradeConfig"

export class PlayerStats extends Component {
    maxHP: Stat = new Stat()// 最大生命值
    curHP: number = 0// 当前生命值
    attack: Stat = new Stat()// 攻击力
    attackRange: Stat = new Stat()// 攻击半径
    evasion: Stat = new Stat()// 闪避
    defense: Stat = new Stat()// 防御
    speed: Stat = new Stat()// 速度
    vampiric: Stat = new Stat()// 吸血
    vampiricChance: Stat = new Stat()// 吸血几率

    level: number = 1
    currentExp: number = 0
    needExp: number = 0


    init(stats: IPlayerStats) {
        this.maxHP.setBaseValue(stats.maxHP)
        this.attack.setBaseValue(stats.attack)
        this.attackRange.setBaseValue(stats.attackRange)
        this.evasion.setBaseValue(stats.evasion)
        this.defense.setBaseValue(stats.defense)
        this.speed.setBaseValue(stats.speed)
        this.vampiric.setBaseValue(stats.vampiric)
        this.vampiricChance.setBaseValue(stats.vampiricChance)
        this.curHP = this.maxHP.getBuffValue()

        this.level = 1
        this.currentExp = 0
        this.needExp = this.calcNeedExp(this.level)
    }

    addExp(amount: number) {
        const add = Math.floor(amount || 0)
        if (add <= 0) return
        if (this.level >= MAX_PLAYER_LEVEL) {
            this.currentExp = this.needExp
            return
        }
        this.currentExp += add
        while (this.currentExp >= this.needExp && this.level < MAX_PLAYER_LEVEL) {
            this.currentExp -= this.needExp
            this.level += 1
            this.needExp = this.calcNeedExp(this.level)
            EventManager.Instance.emit(EVENT_ENUM.PLAYER_LEVEL_UP, this.level)
        }
        if (this.level >= MAX_PLAYER_LEVEL) {
            this.currentExp = this.needExp
        }
    }

    // 攻击
    doDamage() {
        const damage = this.attack.getBuffValue()
        return damage
    }

    // 承受伤害
    takeDamage(damage: number) {
        if (this.evasion.getBuffValue() * 0.01 > Math.random()) return// 闪避判定
        damage -= this.defense.getBuffValue()// 防御判定
        this.curHP -= Math.floor(damage) > 0 ? Math.floor(damage) : 1// 伤害值向下取整，至少伤害1点生命值
    }

    // 判断是否死亡
    isDead() {
        if (this.curHP <= 0) return true
        return false
    }

    private calcNeedExp(level: number) {
        const lv = Math.max(1, Math.floor(level || 1))
        const n = lv - 1
        return Math.round(30 + 12 * n + 3 * n * n)
    }
}

export default PlayerStats
