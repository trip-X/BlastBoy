import { Node } from 'cc'
import { IEnemyStats, IEntity, IMap } from '../../Maps'
import { ENTITY_TYPE_ENUM } from '../Enums'
import { createUINode } from '../Utils/utils'
import { BlueHornManager } from '../Enemy/BlueHron/BlueHornManager'
import { GreenFuzzManager } from '../Enemy/GreenFuzz/GreenFuzzManager'
import { MummyManager } from '../Enemy/Mummy/MummyManager'
import { ObsidianSlicerManager } from '../Enemy/ObsidianSlicer/ObsidianSlicerManager'
import { VerdantCyclopsManager } from '../Enemy/VerdantCyclops/VerdantCyclopsManager'
import { EnemyManager } from './EnemyManager'
import EnemyStats from '../Stats/EnemyStats'
import EnemyPool from './EnemyPool'
import { DEFAULT_GROWTH_PARAMS, type EnemyGrowthParams } from './EnemySpawnConfig'

type EnemyTemplate = {
  entity: IEntity
  stats: IEnemyStats
  managerClass: new (...args: any[]) => EnemyManager
  spawn: (node: Node, entity: IEntity, stats: IEnemyStats) => Promise<void>
}

export default class EnemyFactory {
  private map: IMap = null

  init(map: IMap) {
    this.map = map
  }

  async spawn(stage: Node, enemyType: ENTITY_TYPE_ENUM, enemyLevel: number, growthParams?: EnemyGrowthParams) {
    if (!stage || !stage.isValid) return null
    if (!this.map) return null

    const tpl = this.getTemplate(enemyType)
    if (!tpl) return null

    const params = growthParams || DEFAULT_GROWTH_PARAMS[enemyType]
    const scaledStats = this.scaleStats(tpl.stats, enemyLevel, params)

    let enemyNode = EnemyPool.Instance.acquire(enemyType)
    if (enemyNode) {
      enemyNode.setParent(stage)
      enemyNode.active = true
      const manager = enemyNode.getComponent(tpl.managerClass)
      if (manager) {
        manager.reset(tpl.entity, scaledStats)
      } else {
        await tpl.spawn(enemyNode, tpl.entity, scaledStats)
      }
    } else {
      enemyNode = createUINode()
      enemyNode.setParent(stage)
      await tpl.spawn(enemyNode, tpl.entity, scaledStats)
    }

    const s = enemyNode.getComponent(EnemyStats)
    if (s) s.level = enemyLevel

    return enemyNode
  }

  private getTemplate(enemyType: ENTITY_TYPE_ENUM): EnemyTemplate | null {
    const map = this.map
    if (!map) return null

    switch (enemyType) {
      case ENTITY_TYPE_ENUM.BLUEHORN:
        return {
          entity: map.blueHorn,
          stats: map.blueHornStats,
          managerClass: BlueHornManager,
          spawn: async (node, entity, stats) => {
            const m = node.addComponent(BlueHornManager)
            await m.init(entity, stats)
          },
        }
      case ENTITY_TYPE_ENUM.GREENFUZZ:
        return {
          entity: map.greenFuzz,
          stats: map.greenFuzzStats,
          managerClass: GreenFuzzManager,
          spawn: async (node, entity, stats) => {
            const m = node.addComponent(GreenFuzzManager)
            await m.init(entity, stats)
          },
        }
      case ENTITY_TYPE_ENUM.MUMMY:
        return {
          entity: map.mummy,
          stats: map.mummyStats,
          managerClass: MummyManager,
          spawn: async (node, entity, stats) => {
            const m = node.addComponent(MummyManager)
            await m.init(entity, stats)
          },
        }
      case ENTITY_TYPE_ENUM.OBSIDIANSLICER:
        return {
          entity: map.obsidianSlicer,
          stats: map.obsidianSlicerStats,
          managerClass: ObsidianSlicerManager,
          spawn: async (node, entity, stats) => {
            const m = node.addComponent(ObsidianSlicerManager)
            await m.init(entity, stats)
          },
        }
      case ENTITY_TYPE_ENUM.VERDANTCYCLOPS:
        return {
          entity: map.verdantCyclops,
          stats: map.verdantCyclopsStats,
          managerClass: VerdantCyclopsManager,
          spawn: async (node, entity, stats) => {
            const m = node.addComponent(VerdantCyclopsManager)
            await m.init(entity, stats)
          },
        }
      default:
        return null
    }
  }

  private scaleStats(baseStats: IEnemyStats, level: number, params: EnemyGrowthParams): IEnemyStats {
    const lv = Math.max(1, Math.floor(level || 1))
    const k = Math.max(0, lv - 1)

    const baseHP = Math.max(1, baseStats?.maxHP || 1)
    const baseAtk = Math.max(1, baseStats?.attack || 1)
    const baseDef = Math.max(0, baseStats?.defense || 0)

    const hpGrow = Math.max(0, params?.hpGrow || 0)
    const atkGrow = Math.max(0, params?.atkGrow || 0)
    const defGrow = Math.max(0, params?.defGrow || 0)
    const defCap = Math.max(0, params?.defCap || 0)

    const maxHP = Math.max(1, Math.round(baseHP * (1 + hpGrow * k)))
    const attack = Math.max(1, Math.round(baseAtk * (1 + atkGrow * k)))
    const defenseRaw = Math.round(baseDef + defGrow * k)
    const defense = defCap > 0 ? Math.min(defenseRaw, baseDef + defCap) : defenseRaw

    return { maxHP, attack, defense }
  }
}
