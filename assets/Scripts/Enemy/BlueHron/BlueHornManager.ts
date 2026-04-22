import { _decorator, Collider2D, Color, Contact2DType, director, UITransform } from 'cc'
import { IEnemyStats, IEntity } from '../../../Maps'
import { COLLIDER_TYPE_ENUM, ENTITY_STATE_ENUM, EVENT_ENUM } from '../../Enums'
import DataManager from '../../Runtime/DataManager'
import EventManager from '../../Runtime/EventManager'
import { PlayerManager } from '../../Player/PlayerManager'
import { BlueHornStateMachine } from './BlueHornStateMachine'
import { EnemyManager } from '../EnemyManager'
import EnemyStats from '../../Stats/EnemyStats'
import UiBlink from '../../UI/ui_blink'
const { ccclass, property } = _decorator

const MOVE_INSET_TILES = 0.5 // 限制敌人移动内边距
const FACE_SWITCH_THRESHOLD = 0.05 // 朝向判定阈值，防止频繁切换朝向
const MIN_DISTANCE_TO_PLAYER = 2 // 敌人生成地点与玩家最小距离
const POS_MAX_TRY = 30 // 生成敌人最大尝试次数（避免无限循环）  

const BODY_WIDTH = 100 // 敌人宽度
const BODY_HEIGHT = 100 // 敌人高度
const BODY_COLLIDER_WIDTH = BODY_WIDTH * 0.9 // 身体盒子宽度
const BODY_COLLIDER_HEIGHT = BODY_HEIGHT * 0.9 // 身体盒子高度
const ATTACK_COOLDOWN = 2.5 // 攻击冷却时间
const ATTACK_RADIUS = 0.15// 攻击半径
const MOVE_SPEED = 0.6 // 敌人移动速度
const BASE_EXP = 8

@ccclass('BlueHornManager')
export class BlueHornManager extends EnemyManager {

  private isInited = false // 是否初始化完成
  private stats: EnemyStats = null // 敌人属性
  private blink = null // 闪烁组件

  async init(params: IEntity, stats: IEnemyStats): Promise<void> {
    this.isInited = false

    this.bodyWidth = BODY_WIDTH// 宽度
    this.bodyHeight = BODY_HEIGHT// 高度
    this.bodyColliderWidth = BODY_COLLIDER_WIDTH// 身体盒子宽度
    this.bodyColliderHeight = BODY_COLLIDER_HEIGHT// 身体盒子高度
    this.attackRadius = ATTACK_RADIUS// 攻击半径
    this.attackCooldown = ATTACK_COOLDOWN// 攻击冷却时间
    this.moveSpeed = MOVE_SPEED// 移动速度
    this.moveInsetTiles = MOVE_INSET_TILES// 限制敌人移动内边距
    this.faceSwitchThreshold = FACE_SWITCH_THRESHOLD// 朝向判定阈值，防止频繁切换朝向
    this.minDistanceToPlayer = MIN_DISTANCE_TO_PLAYER// 敌人生成地点与玩家最小距离（逻辑坐标）
    this.posMaxTry = POS_MAX_TRY// 生成敌人最大尝试次数（避免无限循环）  
    this.isDrawCollider = false
    this.baseExp = BASE_EXP

    this.mapCols = DataManager.Instance.mapColumnCount
    this.mapRows = DataManager.Instance.mapRowCount
    const spawnPos = this.randomEnemySpawnPos()// 随机生成敌人位置

    this.blink = this.getComponent(UiBlink) || this.addComponent(UiBlink)

    const transform = this.getComponent(UITransform)
    transform?.setContentSize(this.bodyWidth, this.bodyHeight)
    transform?.setAnchorPoint(0.5, 0.5)

    this.fsm = this.addComponent(BlueHornStateMachine)
    await this.fsm.init()
    await super.init({ ...params, x: spawnPos.x, y: spawnPos.y }, stats)

    this.stats = this.addComponent(EnemyStats)
    this.stats.init(stats)

    this.initPhysics()// 初始化物理系统
    this.updatePosition(this.moveInsetTiles)// 初始化时立刻把玩家放到正确像素坐标，避免第一帧出现“闪一下/偏一下”
    EventManager.Instance.on(EVENT_ENUM.ENEMY_TAKE_DAMAGE, this.onTakeDamage, this)
    this.isInited = true
  }

  onDestroy() {
    EventManager.Instance.off(EVENT_ENUM.ENEMY_TAKE_DAMAGE, this.onTakeDamage, this)
  }

  reset(entity: IEntity, stats: IEnemyStats) {
    this.isInited = false
    this.unscheduleAllCallbacks()

    this.stats.reset(stats)

    super.reset(entity, stats)

    this.isInited = true
  }

  update(dt?: number) {
    if (!this.isInited) return
    if (!dt || dt <= 0) return// 避免dt为0时的错误更新

    const timeScale = director.getScheduler().getTimeScale()
    if (timeScale <= 0) return
    const scaledDt = dt * timeScale

    this.loadPlayer()
    if (this.player && this.player.isDead) {
      this.stopToIdle()
      return
    }

    this.attackTimer = Math.max(0, this.attackTimer - scaledDt)// 更新攻击冷却计时器

    if (this.stopToIdleIfNoPlayer()) return// 玩家不存在时，切换到空闲状态
    this.updateState(scaledDt)// 更新状态
    this.updatePosition(this.moveInsetTiles)// 更新位置
    this.drawCollider()// 绘制碰撞器（调试用）

  }

  // 状态更新逻辑
  private updateState(dt: number) {
    if (this.attackTimer > 0) {
      this.changeState(ENTITY_STATE_ENUM.IDLE)
      this.isMoving = false
    } else {
      if (this.target === null) {
        this.changeState(ENTITY_STATE_ENUM.MOVE)
        const dx = this.player.x - this.x
        const dy = this.player.y - this.y
        const distSq = dx * dx + dy * dy
        this.chaseByDelta(dt, dx, dy, distSq)
        this.isMoving = true
      } else {
        this.changeState(ENTITY_STATE_ENUM.ATTACK)
        this.isMoving = false
        this.attackTimer = this.attackCooldown
      }
    }
  }

  onTakeDamage(damage: number, targetId?: string) {
    if (targetId && targetId !== this.id) return
    if (this.isDead) return
    this.stats.takeDamage(damage)
    this.blink.blink(0.4, 0.4, Color.RED)
    if (this.stats.isDead()) {
      this.stopToDead()
      DataManager.Instance.addKillCount(1) // 记录击杀
    }
  }

  // 帧事件函数:攻击击中玩家
  onAttackHit() {
    if (!this.isInited) return
    if (this.state !== ENTITY_STATE_ENUM.ATTACK) return
    if (!this.target) return
    EventManager.Instance.emit(EVENT_ENUM.PLAYER_TAKE_DAMAGE, this.stats.doDamage(), this.id)
  }

  // 攻击盒子与玩家碰撞开始
  protected onAttackBeginContact(self: Collider2D, other: Collider2D) {
    if (other?.tag !== COLLIDER_TYPE_ENUM.PLAYER_BODY || !other?.node?.getComponent(PlayerManager)) return
    this.target = other.node.getComponent(PlayerManager)
  }

  // 攻击盒子与玩家碰撞结束
  protected onAttackEndContact(self: Collider2D, other: Collider2D) {
    if (other?.tag !== COLLIDER_TYPE_ENUM.PLAYER_BODY || !other?.node?.getComponent(PlayerManager)) return
    this.target = null
  }
}
