import Singleton from '../Base/Singleton'
import DataManager from '../Runtime/DataManager'
import { WEAPON_TYPE_ENUM } from '../Enums'
import { WeaponManager } from '../Weapon/WeaponManager'
import { PlayerStats } from '../Stats/PlayerStats'
import type { IWeapon } from '../Weapon/WeaponTypes'
import type { StatKey, UpgradeCategory, UpgradeDisplayLevel, UpgradeMode } from './UpgradeConfig'
import { STAT_LEVEL_BONUS, STAT_NAME_MAP, UPGRADE_LIMITS, UPGRADE_WEIGHT_POLICY, WEAPON_ENHANCE_PATCH, WEAPON_NAME_MAP } from './UpgradeConfig'


// 升级选项
export type UpgradeOption = {
  optionId: string
  category: UpgradeCategory
  displayLevel: UpgradeDisplayLevel
  title: string
  desc: string
  weight: number
  apply: () => Promise<boolean>
}

export default class UpgradeManager extends Singleton {
  static get Instance() {
    return super.GetInstance<UpgradeManager>()
  }

  private weaponTypeList: WEAPON_TYPE_ENUM[] | null = null// 武器类型列表
  private weaponLevelMap: Record<string, number> = {}// 武器等级映射
  private statLevelMap: Record<string, number> = {}// 属性等级映射

  reset() {
    this.weaponLevelMap = {}
    this.statLevelMap = {}

    for (const w of this.getWeaponTypeList()) {
      this.weaponLevelMap[w] = -1
    }

    const statKeys: StatKey[] = ['attack', 'maxHP', 'attackRange', 'defense']
    for (const k of statKeys) {
      this.statLevelMap[k] = 0
    }
  }

  getWeaponLevel(weaponType: WEAPON_TYPE_ENUM) {
    return this.weaponLevelMap[weaponType] ?? -1
  }

  getStatLevel(statKey: StatKey) {
    return this.statLevelMap[statKey] ?? 0
  }

  getOwnedWeaponCount() {
    let count = 0
    for (const w of this.getWeaponTypeList()) {
      const lv = this.getWeaponLevel(w)
      if (lv >= 0) count += 1
    }
    return count
  }

  async roll3(mode: UpgradeMode, playerLevel: number) {
    const list = this.buildCandidates(mode, playerLevel)
    if (list.length <= 3) return list

    const result: UpgradeOption[] = []
    const pickedIds = new Set<string>()
    const categoryCount: Record<UpgradeCategory, number> = {
      weapon_get: 0,
      weapon_up: 0,
      stat_up: 0,
    }
    const maxSameCategory = mode === 'levelUp' ? UPGRADE_WEIGHT_POLICY.levelUp.limitSameCategoryMaxCount : 99

    if (mode === 'levelUp') {
      const ensureOwnedLessThan = UPGRADE_WEIGHT_POLICY.levelUp.ensureWeaponGetIfOwnedLessThan
      if (this.getOwnedWeaponCount() < ensureOwnedLessThan) {
        const force = this.pickOneWeighted(list.filter(v => v.category === 'weapon_get'), pickedIds, categoryCount, maxSameCategory, true)
        if (force) {
          result.push(force)
          pickedIds.add(force.optionId)
          categoryCount[force.category] += 1
        }
      }
    }

    while (result.length < 3) {
      const next = this.pickOneWeighted(list, pickedIds, categoryCount, maxSameCategory, false)
      if (!next) break
      result.push(next)
      pickedIds.add(next.optionId)
      categoryCount[next.category] += 1
    }

    return result
  }

  private buildCandidates(mode: UpgradeMode, playerLevel: number) {
    const list: UpgradeOption[] = []

    const categoryWeight = mode === 'levelUp' ? UPGRADE_WEIGHT_POLICY.levelUp.categoryWeight : { weapon_get: 1, weapon_up: 0, stat_up: 0 }
    const earlyBoost = mode === 'levelUp' ? UPGRADE_WEIGHT_POLICY.levelUp.earlyBoost : null

    for (const weaponType of this.getWeaponTypeList()) {
      const name = WEAPON_NAME_MAP[weaponType] || weaponType
      const lv = this.getWeaponLevel(weaponType)

      if (lv < 0) {
        const baseWeight = mode === 'start' ? UPGRADE_WEIGHT_POLICY.start.weaponGetBaseWeight : categoryWeight.weapon_get
        const weight = (earlyBoost && playerLevel <= earlyBoost.levelMax) ? baseWeight * earlyBoost.weaponGetMultiplier : baseWeight
        list.push(this.makeWeaponGetOption(weaponType, name, weight))
        continue
      }

      if (mode === 'start') continue

      if (lv >= 0 && lv < UPGRADE_LIMITS.weaponMaxEnhanceLevel) {
        const nextLevel = (lv + 1) as 1 | 2 | 3
        list.push(this.makeWeaponUpOption(weaponType, name, lv, nextLevel, categoryWeight.weapon_up))
      }
    }

    if (mode === 'levelUp') {
      const statKeys: StatKey[] = ['attack', 'maxHP', 'attackRange', 'defense']
      for (const k of statKeys) {
        const current = this.getStatLevel(k)
        if (current >= UPGRADE_LIMITS.statMaxLevel) continue
        const next = (current + 1) as 1 | 2 | 3
        list.push(this.makeStatUpOption(k, current, next, categoryWeight.stat_up))
      }
    }

    return list
  }

  private getWeaponTypeList() {
    if (this.weaponTypeList) return this.weaponTypeList
    const list: WEAPON_TYPE_ENUM[] = []
    for (const k in WEAPON_TYPE_ENUM) {
      const v = (WEAPON_TYPE_ENUM as any)[k]
      if (typeof v === 'string') list.push(v as WEAPON_TYPE_ENUM)
    }
    this.weaponTypeList = list
    return list
  }

  private pickOneWeighted(list: UpgradeOption[], pickedIds: Set<string>, categoryCount: Record<UpgradeCategory, number>, maxSameCategory: number, isForce: boolean) {
    const candidates = list.filter(v => {
      if (pickedIds.has(v.optionId)) return false
      if (!isForce && categoryCount[v.category] >= maxSameCategory) return false
      return true
    })
    if (candidates.length === 0) return null

    let total = 0
    for (const c of candidates) total += Math.max(0, c.weight || 0)
    if (total <= 0) return candidates[Math.floor(Math.random() * candidates.length)]

    let r = Math.random() * total
    for (const c of candidates) {
      r -= Math.max(0, c.weight || 0)
      if (r <= 0) return c
    }
    return candidates[candidates.length - 1]
  }

  private makeWeaponGetOption(weaponType: WEAPON_TYPE_ENUM, weaponName: string, weight: number): UpgradeOption {
    return {
      optionId: `weapon_get:${weaponType}`,
      category: 'weapon_get',
      displayLevel: 0,
      title: `获得：${weaponName}（0级）`,
      desc: '解锁新武器',
      weight,
      apply: async () => {
        const player = DataManager.Instance.player
        const wm = player?.getComponent(WeaponManager)
        if (!player || !wm) return false
        await wm.addWeapon(weaponType)
        this.weaponLevelMap[weaponType] = 0
        return true
      }
    }
  }

  private makeWeaponUpOption(weaponType: WEAPON_TYPE_ENUM, weaponName: string, currentLevel: number, nextLevel: 1 | 2 | 3, weight: number): UpgradeOption {
    const patch = WEAPON_ENHANCE_PATCH[weaponType]?.[nextLevel] || {}
    return {
      optionId: `weapon_up:${weaponType}:${nextLevel}`,
      category: 'weapon_up',
      displayLevel: nextLevel,
      title: `强化：${weaponName} ${currentLevel}→${nextLevel}级`,
      desc: this.makeWeaponPatchDesc(patch),
      weight,
      apply: async () => {
        const player = DataManager.Instance.player
        const wm = player?.getComponent(WeaponManager)
        if (!player || !wm) return false
        wm.updateWeapon(weaponType, patch)
        this.weaponLevelMap[weaponType] = nextLevel
        return true
      }
    }
  }

  private makeStatUpOption(statKey: StatKey, currentLevel: number, nextLevel: 1 | 2 | 3, weight: number): UpgradeOption {
    const name = STAT_NAME_MAP[statKey] || statKey
    const bonus = STAT_LEVEL_BONUS[statKey]?.[nextLevel] ?? 0
    const title = currentLevel <= 0 ? `${name}提升：获得1级` : `${name}提升：${currentLevel}→${nextLevel}级`
    return {
      optionId: `stat_up:${statKey}:${nextLevel}`,
      category: 'stat_up',
      displayLevel: nextLevel,
      title,
      desc: `${name} +${bonus}`,
      weight,
      apply: async () => {
        const player = DataManager.Instance.player
        if (!player) return false
        const stats = player.getComponent(PlayerStats)
        if (!stats) return false

        if (statKey === 'attack') stats.attack.addBuffModifier(bonus)
        if (statKey === 'defense') stats.defense.addBuffModifier(bonus)
        if (statKey === 'attackRange') stats.attackRange.addBuffModifier(bonus)
        if (statKey === 'maxHP') {
          stats.maxHP.addBuffModifier(bonus)
          const nextMax = stats.maxHP.getBuffValue()
          stats.curHP = Math.min(nextMax, stats.curHP + bonus)
        }

        this.statLevelMap[statKey] = nextLevel
        if (statKey === 'attackRange') {
          const anyPlayer = player as any
          if (anyPlayer.refreshAttackRadiusFromStats) anyPlayer.refreshAttackRadiusFromStats()
        }
        return true
      }
    }
  }

  private makeWeaponPatchDesc(patch: Partial<IWeapon>) {
    const parts: string[] = []
    if (patch.weaponDamage != null) parts.push(`伤害倍率 x${this.toFixedSmart(patch.weaponDamage)}`)
    if (patch.weaponOnceAttackCooldown != null) parts.push(`冷却 ${this.toFixedSmart(patch.weaponOnceAttackCooldown)}s`)
    if (patch.weaponOnceAttackSingleTimes != null) parts.push(`连发 ${patch.weaponOnceAttackSingleTimes}`)
    if (patch.weaponOnceAttackDuration != null) parts.push(`持续 ${this.toFixedSmart(patch.weaponOnceAttackDuration)}s`)
    if (patch.weaponBulletSpeed != null) parts.push(`弹速 ${this.toFixedSmart(patch.weaponBulletSpeed)}`)
    if (patch.weaponAttackRange != null) parts.push(`范围 ${this.toFixedSmart(patch.weaponAttackRange)}`)
    return parts.length > 0 ? parts.join('，') : '强化武器属性'
  }

  private toFixedSmart(n: number) {
    if (!Number.isFinite(n)) return `${n}`
    const abs = Math.abs(n)
    if (abs >= 100) return `${Math.round(n)}`
    if (abs >= 10) return `${Math.round(n * 10) / 10}`
    return `${Math.round(n * 100) / 100}`
  }
}
