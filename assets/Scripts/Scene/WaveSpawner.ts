import { _decorator, Component, director } from 'cc'
import type { IMap } from '../../Maps'
import { ENTITY_TYPE_ENUM, EVENT_ENUM } from '../Enums'
import DataManager from '../Runtime/DataManager'
import EventManager from '../Runtime/EventManager'
import EnemyFactory from '../Enemy/EnemyFactory'
import EnemyPool from '../Enemy/EnemyPool'

import {
  DEFAULT_PER_TYPE_MAX_ALIVE,
  DEFAULT_SPAWN_ENTRIES,
  ENEMY_LEVEL_INTERVAL_SECONDS,
  ENEMY_LEVEL_MAX,
  SPAWN_ADD_ALIVE_PER_MIN,
  SPAWN_ADD_BATCH_PER_MIN,
  SPAWN_BASE_BATCH,
  SPAWN_BASE_INTERVAL,
  SPAWN_BASE_MAX_ALIVE,
  SPAWN_COUNT_INTERVAL_SECONDS,
  SPAWN_INTERVAL_MULT_PER_MIN,
  SPAWN_MAX_BATCH,
  SPAWN_MIN_INTERVAL,
  type SpawnEntry,
} from '../Enemy/EnemySpawnConfig'

const { ccclass } = _decorator

type PendingSpawn = {
  type: ENTITY_TYPE_ENUM
  level: number
}

@ccclass('WaveSpawner')
export class WaveSpawner extends Component {
  private map: IMap = null
  private factory: EnemyFactory = new EnemyFactory()

  private isInited = false
  private elapsedSeconds = 0
  private spawnAcc = 0

  private maxAlive = SPAWN_BASE_MAX_ALIVE
  private spawnInterval = SPAWN_BASE_INTERVAL
  private batchCount = SPAWN_BASE_BATCH

  private entries: SpawnEntry[] = DEFAULT_SPAWN_ENTRIES
  private pendingList: PendingSpawn[] = []
  private isSpawning = false

  private aliveCountMap: Map<ENTITY_TYPE_ENUM, number> = new Map()
  private totalAlive = 0

  async init(map: IMap) {
    this.map = map
    this.factory.init(map)
    EventManager.Instance.on(EVENT_ENUM.ENEMY_DIED, this.onEnemyDied, this)
    this.isInited = true
  }

  onDestroy() {
    EventManager.Instance.off(EVENT_ENUM.ENEMY_DIED, this.onEnemyDied, this)
    EnemyPool.Instance.clear()
  }

  private onEnemySpawned(type: ENTITY_TYPE_ENUM) {
    this.totalAlive++
    this.aliveCountMap.set(type, (this.aliveCountMap.get(type) || 0) + 1)
  }

  private onEnemyDied(type: ENTITY_TYPE_ENUM) {
    this.totalAlive = Math.max(0, this.totalAlive - 1)
    this.aliveCountMap.set(type, Math.max(0, (this.aliveCountMap.get(type) || 0) - 1))
  }

  update(dt: number) {
    if (!this.isInited) return
    if (!dt || dt <= 0) return

    const timeScale = director.getScheduler().getTimeScale()
    if (timeScale <= 0) return
    const scaledDt = dt * timeScale

    this.elapsedSeconds += scaledDt
    this.refreshDifficultyParams()

    const stage = DataManager.Instance.stage
    if (!stage || !stage.isValid) return
    const player = DataManager.Instance.player
    if (!player || player.isDead) return

    this.spawnAcc += scaledDt

    const aliveCount = this.getAliveCount()
    if (aliveCount + this.pendingList.length >= this.maxAlive) {
      this.tryFlushSpawnQueue()
      return
    }

    const interval = Math.max(0.01, this.spawnInterval)
    while (this.spawnAcc >= interval) {
      this.spawnAcc -= interval

      const nowAlive = this.getAliveCount()
      if (nowAlive + this.pendingList.length >= this.maxAlive) break

      const type = this.rollEnemyType(this.elapsedSeconds)
      if (!type) continue

      const perTypeMax = DEFAULT_PER_TYPE_MAX_ALIVE[type] ?? -1
      if (perTypeMax > 0) {
        const perTypeAlive = this.getAliveCountByType(type)
        if (perTypeAlive >= perTypeMax) continue
      }

      const level = this.getCurrentEnemyLevel()
      const batch = Math.max(1, Math.min(this.batchCount, SPAWN_MAX_BATCH))
      for (let i = 0; i < batch; i++) {
        const nextAlive = this.getAliveCount()
        if (nextAlive + this.pendingList.length >= this.maxAlive) break
        this.pendingList.push({ type, level })
      }
    }

    this.tryFlushSpawnQueue()
  }

  private refreshDifficultyParams() {
    const countTier = Math.max(0, Math.floor(this.elapsedSeconds / SPAWN_COUNT_INTERVAL_SECONDS))
    this.maxAlive = SPAWN_BASE_MAX_ALIVE + countTier * SPAWN_ADD_ALIVE_PER_MIN
    this.batchCount = SPAWN_BASE_BATCH + countTier * SPAWN_ADD_BATCH_PER_MIN
    const interval = SPAWN_BASE_INTERVAL * Math.pow(SPAWN_INTERVAL_MULT_PER_MIN, countTier)
    this.spawnInterval = Math.max(SPAWN_MIN_INTERVAL, interval)
  }

  private getCurrentEnemyLevel() {
    const tier = Math.max(0, Math.floor(this.elapsedSeconds / ENEMY_LEVEL_INTERVAL_SECONDS))
    return Math.min(ENEMY_LEVEL_MAX, 1 + tier)
  }

  private rollEnemyType(elapsedSeconds: number) {
    const list = this.entries.filter(e => elapsedSeconds >= e.unlockTime && e.weight > 0)
    if (list.length === 0) return null

    let total = 0
    for (const e of list) total += e.weight
    if (total <= 0) return null

    let r = Math.random() * total
    for (const e of list) {
      r -= e.weight
      if (r <= 0) return e.type
    }
    return list[list.length - 1].type
  }

  private getAliveCount() {
    return this.totalAlive
  }

  private getAliveCountByType(type: ENTITY_TYPE_ENUM) {
    return this.aliveCountMap.get(type) || 0
  }

  private tryFlushSpawnQueue() {
    if (this.isSpawning) return
    if (this.pendingList.length === 0) return

    void this.flushSpawnQueue()
  }

  private async flushSpawnQueue() {
    if (this.isSpawning) return
    this.isSpawning = true

    try {
      const stage = DataManager.Instance.stage
      while (this.pendingList.length > 0) {
        if (!stage || !stage.isValid) break

        const aliveCount = this.getAliveCount()
        if (aliveCount >= this.maxAlive) break

        const pending = this.pendingList.shift()
        if (!pending) continue

        const node = await this.factory.spawn(stage, pending.type, pending.level)
        if (!node || !node.isValid) continue

        this.onEnemySpawned(pending.type)
      }
    } finally {
      this.isSpawning = false
    }
  }
}

export default WaveSpawner
