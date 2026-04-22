import { _decorator, Collider2D, Contact2DType, UITransform } from 'cc'
import { IEnemyStats, IEntity } from '../../Maps'
import { PlayerManager } from '../Player/PlayerManager'
import { EntityManager } from '../Base/EntityManager'
import { randomByLen, randomByRange } from '../Utils/utils'
import { ENTITY_STATE_ENUM, EVENT_ENUM } from '../Enums'
import DataManager from '../Runtime/DataManager'
import EventManager from '../Runtime/EventManager'
import PlayerStats from '../Stats/PlayerStats'
import EnemyPool from './EnemyPool'

const { ccclass, property } = _decorator

const EXP_LEVEL_MULT_PER_LEVEL = 0.08// 每升级一级，经验奖励增加 8%
const EXP_RANDOM_MIN = 0.9// 经验奖励随机范围最小值
const EXP_RANDOM_MAX = 1.1// 经验奖励随机范围最大值 
const DEAD_DESTROY_DELAY = 1.2// 死亡后销毁延迟时间


@ccclass('EnemyManager')
export class EnemyManager extends EntityManager {
  mapCols = -1// 地图列数
  mapRows = -1// 地图行数
  player: PlayerManager = null// 玩家
  target: PlayerManager = null// 目标
  minDistanceToPlayer = -1// 敌人生成地点与玩家最小距离（逻辑坐标）
  posMaxTry = -1// 生成敌人最大尝试次数（避免无限循环）  
  attackTimer = 0// 攻击冷却计时器
  attackCooldown = -1// 攻击冷却时间
  isStopped = false
  protected baseExp = 0

  // 停止移动并切换到空闲状态
  stopToIdle() {
    if (this.isDead) return
    this.isStopped = true
    this.isMoving = false
    this.forceChangeState(ENTITY_STATE_ENUM.IDLE)
  }

  reset(entity: IEntity, stats: IEnemyStats) {
    this.id = randomByLen(12)
    this.isDead = false
    this.isStopped = false
    this.isMoving = false
    this.isFacingLeft = false
    this.canChangeState = true
    this.attackTimer = 0
    this.target = null
    this.player = null

    this.mapCols = DataManager.Instance.mapColumnCount
    this.mapRows = DataManager.Instance.mapRowCount
    const spawnPos = this.randomEnemySpawnPos()
    this.x = spawnPos.x
    this.y = spawnPos.y
    this.type = entity.type

    this.fsm.reset()
    this.state = ENTITY_STATE_ENUM.IDLE

    this.updatePosition(this.moveInsetTiles)
    this.node.active = true
  }

  // 停止移动并切换到死亡状态
  stopToDead() {
    if (this.isDead) return
    this.isStopped = true
    this.isMoving = false
    this.isDead = true
    this.tryDropExp()
    this.forceChangeState(ENTITY_STATE_ENUM.DEAD)
    EventManager.Instance.emit(EVENT_ENUM.ENEMY_DIED, this.type)
    this.scheduleOnce(() => {
      if (!this.node || !this.node.isValid) return
      EnemyPool.Instance.release(this.type, this.node)
    }, DEAD_DESTROY_DELAY)
  }

  // 玩家不存在时，切换到空闲状态
  stopToIdleIfNoPlayer(): boolean {
    if (this.player) return false
    this.changeState(ENTITY_STATE_ENUM.IDLE)
    this.isMoving = false
    this.updatePosition(this.moveInsetTiles)
    return true
  }

  // 加载玩家
  protected loadPlayer() {
    if (this.player) return
    this.player = DataManager.Instance.player
  }
  
  // 追击：根据 dx/dy 方向向量推进逻辑坐标
  // - 这里传入 distSq，避免重复 sqrt 计算
  protected chaseByDelta(dt: number, dx: number, dy: number, distSq: number) {
    if (this.isStopped || this.isDead) return
    if (distSq <= 0.000001) return
    const invLen = 1 / Math.sqrt(distSq)
    const dirX = dx * invLen
    const dirY = dy * invLen

    this.x += dirX * this.moveSpeed * dt
    this.y += dirY * this.moveSpeed * dt

    // 朝向：只要有向左分量（左/左上/左下），就翻转成朝左
    if (dx < -this.faceSwitchThreshold) {
      this.setFacingLeft(true)
    } else if (dx > this.faceSwitchThreshold) {
      this.setFacingLeft(false)
    }
  }

  // 随机生成敌人出生点
  randomEnemySpawnPos() {
    // 地图还没初始化时，避免报错
    if (this.mapCols <= 0 || this.mapRows <= 0) {
      return { x: 0, y: 0 }
    }

    const inset = Math.max(0, this.moveInsetTiles)
    const minX = inset
    const maxX = this.mapCols - 1 - inset
    const minY = inset
    const maxY = this.mapRows - 1 - inset

    // inset 过大导致没有可用范围：返回地图中心（至少保证在地图内）
    if (minX > maxX || minY > maxY) {
      return { x: (this.mapCols - 1) / 2, y: (this.mapRows - 1) / 2 }
    }

    const minDist = Math.max(0, this.minDistanceToPlayer)

    // 如果还没有 player（例如生成顺序问题），就只保证“在地图内随机”
    if (!this.player) {
      return {
        x: randomByRange(minX, maxX + 1),
        y: randomByRange(minY, maxY + 1),
      }
    }

    const tryCount = Math.max(1, this.posMaxTry)
    for (let i = 0; i < tryCount; i++) {
      // 先随机一个“在地图内”的点（满足敌人自身不出界）
      const x = randomByRange(minX, maxX + 1)
      const y = randomByRange(minY, maxY + 1)

      // 再判断与玩家距离
      const dx = x - this.player.x
      const dy = y - this.player.y
      // 切比雪夫距离：只看 x/y 两个方向上的“最大格差”
      // - 这样 minDist 表示：x/y 任一方向至少要离开玩家 minDist 格
      // - 判定形状是正方形（不是圆），你已确认采用这个口径
      const cheb = Math.max(Math.abs(dx), Math.abs(dy))
      if (cheb >= minDist) {
        return { x, y }
      }
    }

    // 多次尝试都不满足：兜底返回一个地图内点（避免卡死）
    return {
      x: randomByRange(minX, maxX + 1),
      y: randomByRange(minY, maxY + 1),
    }
  }

  // 尝试掉落经验
  private tryDropExp() {
    if (this.baseExp <= 0) return
    const dropManager = DataManager.Instance.dropManager
    if (!dropManager) return

    const player = DataManager.Instance.player
    const stats = player?.node?.getComponent(PlayerStats)
    const level = stats?.level || 1

    const mult = 1 + EXP_LEVEL_MULT_PER_LEVEL * Math.max(0, level - 1)
    const rand = EXP_RANDOM_MIN + Math.random() * (EXP_RANDOM_MAX - EXP_RANDOM_MIN)
    const expDrop = Math.round(this.baseExp * mult * rand)
    if (expDrop <= 0) return

    dropManager.spawnExp(this.node.worldPosition, expDrop)
    dropManager.trySpawnDropItem(this.node.worldPosition)
  }
}
