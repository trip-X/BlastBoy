import { WEAPON_TYPE_ENUM } from '../Enums'
import type { IWeapon } from '../Weapon/WeaponConfig'

export type UpgradeMode = 'start' | 'levelUp'// 升级模式

export type UpgradeCategory = 'weapon_get' | 'weapon_up' | 'stat_up'// 升级分类

export type StatKey = 'attack' | 'maxHP' | 'attackRange' | 'defense'// 属性键

export type UpgradeDisplayLevel = 0 | 1 | 2 | 3// 用于显示颜色的等级

export const STAT_KEY_LIST: StatKey[] = ['attack', 'maxHP', 'attackRange', 'defense']

export const WEAPON_TYPE_LIST: WEAPON_TYPE_ENUM[] = (() => {
  const list: WEAPON_TYPE_ENUM[] = []
  for (const k in WEAPON_TYPE_ENUM) {
    const v = (WEAPON_TYPE_ENUM as any)[k]
    if (typeof v === 'string') list.push(v as WEAPON_TYPE_ENUM)
  }
  return list
})()

// 武器名称映射
export const WEAPON_NAME_MAP: Record<WEAPON_TYPE_ENUM, string> = {
  [WEAPON_TYPE_ENUM.FLY_SWORD]: '飞剑',
  [WEAPON_TYPE_ENUM.BLAST_GUN]: '爆裂枪',
  [WEAPON_TYPE_ENUM.TOXIC_ZONE]: '毒圈',
  [WEAPON_TYPE_ENUM.ONION_SWORD]: '洋葱剑',
  [WEAPON_TYPE_ENUM.SHOTGUN]: '散弹枪',
  [WEAPON_TYPE_ENUM.THUNDER_FIST]: '雷拳',
}

// 属性名称映射
export const STAT_NAME_MAP: Record<StatKey, string> = {
  attack: '攻击',
  maxHP: '最大生命值',
  attackRange: '攻击半径',
  defense: '防御',
}

// 升级限制
export const UPGRADE_LIMITS = {
  weaponMaxEnhanceLevel: 3,
  statMaxLevel: 3,
}

export const MAX_PLAYER_LEVEL = (() => {
  const weaponCount = Math.max(0, WEAPON_TYPE_LIST.length)
  const statCount = Math.max(0, STAT_KEY_LIST.length)
  const remainWeaponGet = Math.max(0, weaponCount - 1)
  const weaponEnhancePick = weaponCount * UPGRADE_LIMITS.weaponMaxEnhanceLevel
  const statPick = statCount * UPGRADE_LIMITS.statMaxLevel
  return 1 + remainWeaponGet + weaponEnhancePick + statPick
})()

// 升级等级颜色（0白 1绿 2蓝 3红）
// 这里用 RGBA 数组，UiUpgrade 里再转成 Color，方便你后续直接改数值
export const UPGRADE_LEVEL_COLOR_RGBA: Record<UpgradeDisplayLevel, [number, number, number, number]> = {
  0: [255, 255, 255, 255],
  1: [0, 255, 0, 255],
  2: [0, 160, 255, 255],
  3: [255, 0, 0, 255],
}

// 属性等级奖励映射
export const STAT_LEVEL_BONUS: Record<StatKey, Record<1 | 2 | 3, number>> = {
  attack: {
    1: 3,
    2: 4,
    3: 5,
  },
  maxHP: {
    1: 2,
    2: 2,
    3: 3,
  },
  attackRange: {
    1: 0.2,
    2: 0.2,
    3: 0.2,
  },
  defense: {
    1: 1,
    2: 1,
    3: 2,
  },
}

// 武器强化补丁
export const WEAPON_ENHANCE_PATCH: Record<WEAPON_TYPE_ENUM, Record<1 | 2 | 3, Partial<IWeapon>>> = {
  [WEAPON_TYPE_ENUM.FLY_SWORD]: {
    1: { weaponDamage: 1.10, weaponOnceAttackCooldown: 1.8, weaponOnceAttackSingleTimes: 3, weaponOnceAttackDuration: 0.25 },
    2: { weaponDamage: 1.25, weaponOnceAttackCooldown: 1.6, weaponOnceAttackSingleTimes: 3, weaponOnceAttackDuration: 0.30 },
    3: { weaponDamage: 1.45, weaponOnceAttackCooldown: 1.4, weaponOnceAttackSingleTimes: 4, weaponOnceAttackDuration: 0.35 },
  },
  [WEAPON_TYPE_ENUM.BLAST_GUN]: {
    1: { weaponDamage: 1.20, weaponOnceAttackCooldown: 1.35, weaponBulletSpeed: 6 },
    2: { weaponDamage: 1.45, weaponOnceAttackCooldown: 1.20, weaponBulletSpeed: 7 },
    3: { weaponDamage: 1.75, weaponOnceAttackCooldown: 1.05, weaponBulletSpeed: 8 },
  },
  [WEAPON_TYPE_ENUM.TOXIC_ZONE]: {
    1: { weaponAttackRange: 340, weaponDamage: 1.15, weaponOnceAttackCooldown: 0.90 },
    2: { weaponAttackRange: 390, weaponDamage: 1.35, weaponOnceAttackCooldown: 0.80 },
    3: { weaponAttackRange: 450, weaponDamage: 1.60, weaponOnceAttackCooldown: 0.70 },
  },
  [WEAPON_TYPE_ENUM.ONION_SWORD]: {
    1: { weaponDamage: 1.20, weaponOnceAttackCooldown: 1.80, weaponOnceAttackSingleTimes: 2, weaponOnceAttackDuration: 0.25 },
    2: { weaponDamage: 1.45, weaponOnceAttackCooldown: 1.60, weaponOnceAttackSingleTimes: 2, weaponOnceAttackDuration: 0.30 },
    3: { weaponDamage: 1.75, weaponOnceAttackCooldown: 1.40, weaponOnceAttackSingleTimes: 3, weaponOnceAttackDuration: 0.35 },
  },
  [WEAPON_TYPE_ENUM.SHOTGUN]: {
    1: { weaponDamage: 1.10, weaponOnceAttackCooldown: 1.15, weaponOnceAttackSingleTimes: 2, weaponOnceAttackDuration: 0.20, weaponBulletSpeed: 22 },
    2: { weaponDamage: 1.25, weaponOnceAttackCooldown: 1.05, weaponOnceAttackSingleTimes: 2, weaponOnceAttackDuration: 0.22, weaponBulletSpeed: 24 },
    3: { weaponDamage: 1.45, weaponOnceAttackCooldown: 0.95, weaponOnceAttackSingleTimes: 3, weaponOnceAttackDuration: 0.30, weaponBulletSpeed: 25 },
  },
  [WEAPON_TYPE_ENUM.THUNDER_FIST]: {
    1: { weaponDamage: 1.25, weaponOnceAttackCooldown: 1.80, weaponBulletSpeed: 12 },
    2: { weaponDamage: 1.55, weaponOnceAttackCooldown: 1.60, weaponBulletSpeed: 14 },
    3: { weaponDamage: 1.90, weaponOnceAttackCooldown: 1.40, weaponBulletSpeed: 16 },
  },
}

// 升级权重策略
export const UPGRADE_WEIGHT_POLICY = {
  start: {
    weaponGetBaseWeight: 1,
  },
  levelUp: {
    categoryWeight: {
      weapon_get: 1.0,
      weapon_up: 1.0,
      stat_up: 1.0,
    },
    earlyBoost: {
      levelMax: 5,
      weaponGetMultiplier: 1.6,
    },
    ensureWeaponGetIfOwnedLessThan: 2,
    limitSameCategoryMaxCount: 2,
  },
}
