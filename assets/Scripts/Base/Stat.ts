import { _decorator } from 'cc'

const { ccclass } = _decorator

@ccclass('Stat')
export class Stat {
    private baseValue = 0// 基础值
    private buffModifiers: number[] = []// 临时值

    // 获取基础值
    getBaseValue() {
        return this.baseValue
    }

    // 设置基础值
    setBaseValue(value: number) {
        this.baseValue = value
    }

    // 获取临时值
    getBuffValue() {
        return this.getBaseValue() + this.sum(this.buffModifiers)
    }

    // 添加临时值
    addBuffModifier(value: number) {
        this.buffModifiers.push(value)
    }

    // 移除临时值
    removeBuffModifier(value: number) {
        return this.removeOnce(this.buffModifiers, value)
    }

    // 清除临时值
    clearBuffModifiers() {
        this.buffModifiers.length = 0
    }

    // 计算总值
    private sum(list: number[]) {
        let total = 0
        for (const v of list) {
            total += v
        }
        return total
    }

    // 移除值
    private removeOnce(list: number[], value: number) {
        const index = list.indexOf(value)
        if (index < 0) return false
        list.splice(index, 1)
        return true
    }
}

export default Stat
