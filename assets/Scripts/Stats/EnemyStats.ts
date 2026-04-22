import { Component } from "cc"
import Stat from "../Base/Stat"
import { IEnemyStats } from "../../Maps"

export class EnemyStats extends Component {
    maxHP: Stat = new Stat()// 最大生命值
    curHP: number = 0// 当前生命值
    attack: Stat = new Stat()// 攻击力
    defense: Stat = new Stat()// 防御
    level: number = 1// 等级

    init(stats: IEnemyStats){
        this.maxHP.setBaseValue(stats.maxHP)
        this.attack.setBaseValue(stats.attack)
        this.defense.setBaseValue(stats.defense)
        this.curHP = this.maxHP.getBuffValue()
    }

    reset(stats: IEnemyStats) {
        this.maxHP.clearBuffModifiers()
        this.attack.clearBuffModifiers()
        this.defense.clearBuffModifiers()
        this.init(stats)
        this.level = 1
    }

    // 攻击
    doDamage(){
        return this.attack.getBuffValue()
    }

    takeDamage(damage: number) {
        damage -= this.defense.getBuffValue()// 防御判定
        this.curHP -= Math.floor(damage) > 0 ? Math.floor(damage) : 1// 伤害值向下取整，至少伤害1点生命值
    }

    // 判断是否死亡
    isDead() {
        if (this.curHP <= 0) return true
        return false
    }
}

export default EnemyStats
