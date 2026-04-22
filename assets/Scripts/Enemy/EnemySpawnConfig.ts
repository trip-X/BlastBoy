import { ENTITY_TYPE_ENUM } from '../Enums'

export type EnemyGrowthParams = {
  hpGrow: number
  atkGrow: number
  defGrow: number
  defCap: number
}

export type SpawnEntry = {
  type: ENTITY_TYPE_ENUM
  unlockTime: number
  weight: number
}

export const ENEMY_LEVEL_INTERVAL_SECONDS = 30
export const ENEMY_LEVEL_MAX = 30

export const SPAWN_COUNT_INTERVAL_SECONDS = 60

export const SPAWN_BASE_MAX_ALIVE = 25
export const SPAWN_ADD_ALIVE_PER_MIN = 8

export const SPAWN_BASE_INTERVAL = 1.0
export const SPAWN_MIN_INTERVAL = 0.25
export const SPAWN_INTERVAL_MULT_PER_MIN = 0.92

export const SPAWN_BASE_BATCH = 1
export const SPAWN_ADD_BATCH_PER_MIN = 1
export const SPAWN_MAX_BATCH = 6

export const DEFAULT_GROWTH_PARAMS: Record<ENTITY_TYPE_ENUM, EnemyGrowthParams> = {
  [ENTITY_TYPE_ENUM.BLUEHORN]: { hpGrow: 0.18, atkGrow: 0.10, defGrow: 0.4, defCap: 10 },
  [ENTITY_TYPE_ENUM.GREENFUZZ]: { hpGrow: 0.14, atkGrow: 0.12, defGrow: 0.3, defCap: 8 },
  [ENTITY_TYPE_ENUM.MUMMY]: { hpGrow: 0.16, atkGrow: 0.14, defGrow: 0.4, defCap: 10 },
  [ENTITY_TYPE_ENUM.OBSIDIANSLICER]: { hpGrow: 0.20, atkGrow: 0.16, defGrow: 0.5, defCap: 12 },
  [ENTITY_TYPE_ENUM.VERDANTCYCLOPS]: { hpGrow: 0.24, atkGrow: 0.18, defGrow: 0.6, defCap: 14 },
  [ENTITY_TYPE_ENUM.PLAYER]: { hpGrow: 0, atkGrow: 0, defGrow: 0, defCap: 0 },
}

export const DEFAULT_SPAWN_ENTRIES: SpawnEntry[] = [
  { type: ENTITY_TYPE_ENUM.BLUEHORN, unlockTime: 0, weight: 100 },
  { type: ENTITY_TYPE_ENUM.GREENFUZZ, unlockTime: 60, weight: 80 },
  { type: ENTITY_TYPE_ENUM.MUMMY, unlockTime: 120, weight: 70 },
  { type: ENTITY_TYPE_ENUM.OBSIDIANSLICER, unlockTime: 180, weight: 50 },
  { type: ENTITY_TYPE_ENUM.VERDANTCYCLOPS, unlockTime: 240, weight: 35 },
]

export const DEFAULT_PER_TYPE_MAX_ALIVE: Partial<Record<ENTITY_TYPE_ENUM, number>> = {
  [ENTITY_TYPE_ENUM.OBSIDIANSLICER]: 8,
  [ENTITY_TYPE_ENUM.VERDANTCYCLOPS]: 6,
}

