import { Weapon } from './Weapon'
import { FlySword } from './FlySword/FlySword'
import { BlastGun } from './BlastGun/BlastGun'
import { ToxicZone } from './ToxicZone/ToxicZone'
import { OnionSword } from './OnionSword/OnionSword'
import { Shotgun } from './Shotgun/Shotgun'
import { ThunderFist } from './ThunderFist/ThunderFist'
import { WEAPON_TYPE_ENUM } from '../Enums'
import type { IWeapon } from './WeaponTypes'
import { WEAPON_TUNING } from '../Tuning/generated/weaponTuning'

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
        params: WEAPON_TUNING[WEAPON_TYPE_ENUM.FLY_SWORD],
    },
    ['BLAST_GUN']: {
        id: 'BLAST_GUN',
        prefabUrl: 'texture/Weapon/BlastGun/BlastGun',
        weaponClass: BlastGun,
        params: WEAPON_TUNING[WEAPON_TYPE_ENUM.BLAST_GUN],
    },
    ['TOXIC_ZONE']: {
        id: 'TOXIC_ZONE',
        prefabUrl: 'texture/Weapon/ToxicZone/ToxicZone',
        weaponClass: ToxicZone,
        params: WEAPON_TUNING[WEAPON_TYPE_ENUM.TOXIC_ZONE],
    },
    ['ONION_SWORD']: {
        id: 'ONION_SWORD',
        prefabUrl: 'texture/Weapon/OnionSword/OnionSword',
        weaponClass: OnionSword,
        params: WEAPON_TUNING[WEAPON_TYPE_ENUM.ONION_SWORD],
    },
    ['SHOTGUN']: {
        id: 'SHOTGUN',
        prefabUrl: 'texture/Weapon/Shotgun/Shotgun',
        weaponClass: Shotgun,
        params: WEAPON_TUNING[WEAPON_TYPE_ENUM.SHOTGUN],
    },
    ['THUNDER_FIST']: {
        id: 'THUNDER_FIST',
        prefabUrl: 'texture/Weapon/ThunderFist/ThunderFist',
        weaponClass: ThunderFist,
        params: WEAPON_TUNING[WEAPON_TYPE_ENUM.THUNDER_FIST],
    },
}

export function getWeaponConfig(weaponType: WEAPON_TYPE_ENUM) {
    return WEAPON_CONFIG_MAP[weaponType]
}
