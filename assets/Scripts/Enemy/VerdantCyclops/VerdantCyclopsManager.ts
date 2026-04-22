import { _decorator, Collider2D, Color, director, UITransform } from 'cc'
import { IEnemyStats, IEntity } from '../../../Maps'
import { COLLIDER_TYPE_ENUM, ENTITY_STATE_ENUM, EVENT_ENUM } from '../../Enums'
import DataManager from '../../Runtime/DataManager'
import EventManager from '../../Runtime/EventManager'
import { PlayerManager } from '../../Player/PlayerManager'
import { VerdantCyclopsStateMachine } from './VerdantCyclopsStateMachine'
import { EnemyManager } from '../EnemyManager'
import EnemyStats from '../../Stats/EnemyStats'
import UiBlink from '../../UI/ui_blink'
const { ccclass } = _decorator

const MOVE_INSET_TILES = 0.5
const FACE_SWITCH_THRESHOLD = 0.05
const MIN_DISTANCE_TO_PLAYER = 2
const POS_MAX_TRY = 30

const BODY_WIDTH = 150
const BODY_HEIGHT = 150
const BODY_COLLIDER_WIDTH = BODY_WIDTH * 0.6
const BODY_COLLIDER_HEIGHT = BODY_HEIGHT * 0.6
const ATTACK_COOLDOWN = 4
const ATTACK_RADIUS = 0.25
const MOVE_SPEED = 0.35
const BASE_EXP = 18

@ccclass('VerdantCyclopsManager')
export class VerdantCyclopsManager extends EnemyManager {

  private isInited = false
  private stats: EnemyStats = null
  private blink = null

  async init(params: IEntity, stats: IEnemyStats): Promise<void> {
    this.isInited = false

    this.bodyWidth = BODY_WIDTH
    this.bodyHeight = BODY_HEIGHT
    this.bodyColliderWidth = BODY_COLLIDER_WIDTH
    this.bodyColliderHeight = BODY_COLLIDER_HEIGHT
    this.attackRadius = ATTACK_RADIUS
    this.attackCooldown = ATTACK_COOLDOWN
    this.moveSpeed = MOVE_SPEED
    this.moveInsetTiles = MOVE_INSET_TILES
    this.faceSwitchThreshold = FACE_SWITCH_THRESHOLD
    this.minDistanceToPlayer = MIN_DISTANCE_TO_PLAYER
    this.posMaxTry = POS_MAX_TRY
    this.isDrawCollider = false
    this.baseExp = BASE_EXP

    this.mapCols = DataManager.Instance.mapColumnCount
    this.mapRows = DataManager.Instance.mapRowCount
    const spawnPos = this.randomEnemySpawnPos()

    this.blink = this.getComponent(UiBlink) || this.addComponent(UiBlink)

    const transform = this.getComponent(UITransform)
    transform?.setContentSize(this.bodyWidth, this.bodyHeight)
    transform?.setAnchorPoint(0.5, 0.4)

    this.fsm = this.addComponent(VerdantCyclopsStateMachine)
    await this.fsm.init()
    await super.init({ ...params, x: spawnPos.x, y: spawnPos.y }, stats)

    this.stats = this.addComponent(EnemyStats)
    this.stats.init(stats)

    this.initPhysics()
    this.updatePosition(this.moveInsetTiles)
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
    if (!dt || dt <= 0) return

    const timeScale = director.getScheduler().getTimeScale()
    if (timeScale <= 0) return
    const scaledDt = dt * timeScale

    this.loadPlayer()
    if (this.player && this.player.isDead) {
      this.stopToIdle()
      return
    }

    this.attackTimer = Math.max(0, this.attackTimer - scaledDt)

    if (this.stopToIdleIfNoPlayer()) return
    this.updateState(scaledDt)
    this.updatePosition(this.moveInsetTiles)
    this.drawCollider()
  }

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

  onAttackHit() {
    if (!this.isInited) return
    if (this.state !== ENTITY_STATE_ENUM.ATTACK) return
    if (!this.target) return
    EventManager.Instance.emit(EVENT_ENUM.PLAYER_TAKE_DAMAGE, this.stats.doDamage(), this.id)
  }

  protected onAttackBeginContact(self: Collider2D, other: Collider2D) {
    if (other?.tag !== COLLIDER_TYPE_ENUM.PLAYER_BODY || !other?.node?.getComponent(PlayerManager)) return
    this.target = other.node.getComponent(PlayerManager)
  }

  protected onAttackEndContact(self: Collider2D, other: Collider2D) {
    if (other?.tag !== COLLIDER_TYPE_ENUM.PLAYER_BODY || !other?.node?.getComponent(PlayerManager)) return
    this.target = null
  }
}
