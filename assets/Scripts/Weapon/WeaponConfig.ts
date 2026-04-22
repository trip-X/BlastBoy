import { Weapon } from './Weapon'
import { FlySword } from './FlySword/FlySword'
import { BlastGun } from './BlastGun/BlastGun'
import { ToxicZone } from './ToxicZone/ToxicZone'
import { OnionSword } from './OnionSword/OnionSword'
import { Shotgun } from './Shotgun/Shotgun'
import { ThunderFist } from './ThunderFist/ThunderFist'
import { WEAPON_TYPE_ENUM } from '../Enums'

// IWeapon：外部“创建武器”时传入的参数
export interface IWeapon {
    weaponId: string// 武器类型/唯一标识
    weaponAttach: boolean// 是否吸附在玩家身上
    weaponDamage: number// 伤害倍率（最终伤害 = playerAttack * weaponDamage）
    weaponOnceAttackCooldown: number// 攻击间隔（秒）
    weaponOnceAttackSingleTimes: number// 每次攻击会结算几次（连发/多段伤害）
    weaponOnceAttackDuration: number// 一次攻击持续时间（秒）
    weaponBulletSpeed: number// 子弹速度
    weaponAttackRange: number// 攻击范围
}


export interface WeaponConfig<T extends Weapon = Weapon> {
    id: string
    prefabUrl: string
    weaponClass: { new(): T }
    params: IWeapon
}

export const WEAPON_CONFIG_MAP: Record<WEAPON_TYPE_ENUM, WeaponConfig> = {
    ['FLY_SWORD']: {
        id: 'FLY_SWORD',
        prefabUrl: 'texture/Weapon/FlySword/FlySword',
        weaponClass: FlySword,
        params: {
            weaponId: 'FLY_SWORD',
            weaponAttach: true,
            weaponDamage: 1,
            weaponOnceAttackCooldown: 2,
            weaponOnceAttackSingleTimes: 2,
            weaponOnceAttackDuration: 0.2,
            weaponBulletSpeed: 10,
            weaponAttackRange: -1,// 攻击范围, -1代表使用角色默认攻击距离
        },
    },
    ['BLAST_GUN']: {
        id: 'BLAST_GUN',
        prefabUrl: 'texture/Weapon/BlastGun/BlastGun',
        weaponClass: BlastGun,
        params: {
            weaponId: 'BLAST_GUN',
            weaponAttach: true,
            weaponDamage: 1,
            weaponOnceAttackCooldown: 1.5,
            weaponOnceAttackSingleTimes: 1,
            weaponOnceAttackDuration: 0.1,
            weaponBulletSpeed:5,
            weaponAttackRange: -1,
        },
    },
    ['TOXIC_ZONE']: {
        id: 'TOXIC_ZONE',
        prefabUrl: 'texture/Weapon/ToxicZone/ToxicZone',
        weaponClass: ToxicZone,
        params: {
            weaponId: 'TOXIC_ZONE',
            weaponAttach: false, 
            weaponDamage: 1, 
            weaponOnceAttackCooldown: 1, 
            weaponOnceAttackSingleTimes: 1,
            weaponOnceAttackDuration: 0.1,
            weaponBulletSpeed: 0,
            weaponAttackRange: 300, // 毒圈的半径大小
        },
    },
    ['ONION_SWORD']: {
        id: 'ONION_SWORD',
        prefabUrl: 'texture/Weapon/OnionSword/OnionSword',
        weaponClass: OnionSword,
        params: {
            weaponId: 'ONION_SWORD',
            weaponAttach: true,
            weaponDamage: 1,
            weaponOnceAttackCooldown: 2,
            weaponOnceAttackSingleTimes: 1,
            weaponOnceAttackDuration: 0.2,
            weaponBulletSpeed: 10,
            weaponAttackRange: -1,
        },
    },
    ['SHOTGUN']: {
        id: 'SHOTGUN',
        prefabUrl: 'texture/Weapon/Shotgun/Shotgun',
        weaponClass: Shotgun,
        params: {
            weaponId: 'SHOTGUN',
            weaponAttach: true,
            weaponDamage: 1,
            weaponOnceAttackCooldown: 1.2,
            weaponOnceAttackSingleTimes: 1,
            weaponOnceAttackDuration: 0.1,
            weaponBulletSpeed: 20,
            weaponAttackRange: -1,
        },
    },
    ['THUNDER_FIST']: {
        id: 'THUNDER_FIST',
        prefabUrl: 'texture/Weapon/ThunderFist/ThunderFist',
        weaponClass: ThunderFist,
        params: {
            weaponId: 'THUNDER_FIST',
            weaponAttach: true,
            weaponDamage: 1,
            weaponOnceAttackCooldown: 2,
            weaponOnceAttackSingleTimes: 1,
            weaponOnceAttackDuration: 0.1,
            weaponBulletSpeed: 10,
            weaponAttackRange: -1,
        },
    },
}

export function getWeaponConfig(weaponType: WEAPON_TYPE_ENUM) {
    return WEAPON_CONFIG_MAP[weaponType]
}
