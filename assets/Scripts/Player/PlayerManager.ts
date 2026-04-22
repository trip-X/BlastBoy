import { PlayerStateMachine } from './PlayerStateMachine'
import { EntityManager } from '../Base/EntityManager'
import { IEntity, IPlayerStats } from '../../Maps'
import { COLLIDER_TYPE_ENUM, ENTITY_STATE_ENUM, EVENT_ENUM, } from '../Enums'
import { _decorator, Collider2D, Color, director, Tween, tween, UITransform, Vec2, find } from 'cc';
import EventManager from '../Runtime/EventManager';
import DataManager from '../Runtime/DataManager';
import { PlayerStats } from '../Stats/PlayerStats'
import UiBlink from '../UI/ui_blink'
import { EnemyManager } from '../Enemy/EnemyManager';
import { TILE_WIDTH } from '../Tile/TileManager'
import { UiGameOver } from '../UI/ui_GameOver'

const { ccclass, property } = _decorator;

const BODY_WIDTH = 200// 宽度
const BODY_HEIGHT = 200// 高度
const BODY_COLLIDER_WIDTH = BODY_WIDTH * 0.5 // 身体盒子宽度
const BODY_COLLIDER_HEIGHT = BODY_HEIGHT * 0.6 // 身体盒子高度
const HURT_INVINCIBLE_TIME = 3// 受伤无敌无敌时间

const MOVE_INSET_TILES = 0.5// 移动内边距
const FACE_SWITCH_THRESHOLD = 0.05// 朝向判定阈值：摇杆 x 轴绝对值超过该值，才会切换左右朝向


@ccclass('PlayerManager')
export class PlayerManager extends EntityManager {
  private isInited = false // 是否初始化完成
  private moveAxis = new Vec2()// 移动轴向量
  private stats: PlayerStats = null// 玩家属性
  private isInvincible = false// 是否无敌
  private hurtInvincibleContinue = HURT_INVINCIBLE_TIME// 受伤无敌时间

  private targets: EntityManager[] = []// 目标列表
  private targetIdSet: Set<string> = new Set()// 目标 id 集合
  private attackCoolDown = 2// 攻击冷却时间时器
  private attackTimer = this.attackCoolDown// 攻击冷却时间计时器

  async init(params: IEntity, stats: IPlayerStats) {
    this.isInited = false

    this.bodyWidth = BODY_WIDTH// 宽度
    this.bodyHeight = BODY_HEIGHT// 高度
    this.bodyColliderWidth = BODY_COLLIDER_WIDTH// 身体盒子宽度
    this.bodyColliderHeight = BODY_COLLIDER_HEIGHT// 身体盒子高度
    this.moveInsetTiles = MOVE_INSET_TILES// 移动内边距
    this.faceSwitchThreshold = FACE_SWITCH_THRESHOLD// 朝向判定阈值
    this.isDrawCollider = false

    const transform = this.getComponent(UITransform)
    transform?.setContentSize(this.bodyWidth, this.bodyHeight)
    transform.setAnchorPoint(0.5, 0.5)

    this.fsm = this.addComponent(PlayerStateMachine)
    await this.fsm.init() // 异步初始化状态机（等待资源加载完成）
    await super.init(params, stats)

    this.stats = this.addComponent(PlayerStats)
    this.stats.init(stats)
    this.attackRadius = this.stats.attackRange.getBaseValue()// 攻击半径
    this.moveSpeed = this.stats.speed.getBaseValue()// 移动速度

    this.initPhysics()// 初始化物理系统
    this.updatePosition(this.moveInsetTiles) // 初始化时立刻把玩家放到正确像素坐标，避免第一帧出现“闪一下/偏一下”
    this.isInited = true
    EventManager.Instance.on(EVENT_ENUM.JOYSTICK_AXIS, this.onJoystickAxis, this)
    EventManager.Instance.on(EVENT_ENUM.PLAYER_TAKE_DAMAGE, this.onTakeDamage, this)
  }

  // 刷新攻击半径（根据属性更新）
  refreshAttackRadiusFromStats() {
    const stats = this.getComponent(PlayerStats)
    if (!stats) return
    this.attackRadius = stats.attackRange.getBuffValue()
    if (this.attackCollider) {
      this.attackCollider.radius = this.attackRadius * TILE_WIDTH
      this.attackCollider.apply()
    }
  }

  onDestroy() {
    EventManager.Instance.off(EVENT_ENUM.JOYSTICK_AXIS, this.onJoystickAxis, this)
    EventManager.Instance.off(EVENT_ENUM.PLAYER_TAKE_DAMAGE, this.onTakeDamage, this)
    super.onDestroy()
  }

  update(dt?: number) {
    if (!this.isInited) return
    if (this.isDead) return // 死亡后不更新
    if (!dt || dt <= 0) return

    const timeScale = director.getScheduler().getTimeScale()
    if (timeScale <= 0) return
    const scaledDt = dt * timeScale

    this.attackTimer -= scaledDt

    this.updateMoveByJoystick(scaledDt) // 每帧根据摇杆方向更新逻辑坐标
    this.updatePosition(this.moveInsetTiles) // 把逻辑坐标换算成像素坐标并应用到节点
    this.drawCollider()// 绘制碰撞器（调试用）
  }

  // 接收摇杆事件的回调：仅记录摇杆方向，不在此处直接改变坐标（避免跳帧或手感不平滑）
  private onJoystickAxis(ax: number, ay: number) {
    if (this.isDead) return
    if (this.state === ENTITY_STATE_ENUM.HURT) return
    this.moveAxis.set(ax, ay)
    // 根据输入轴更新朝向（仅处理左右翻转）
    if (ax < -this.faceSwitchThreshold) {
      this.setFacingLeft(true)
      return
    }
    if (ax > this.faceSwitchThreshold) {
      this.setFacingLeft(false)
    }
  }

  // 根据摇杆方向更新逻辑坐标（dt用于保证不同帧率下移动速度一致）
  private updateMoveByJoystick(dt: number) {
    if (dt <= 0) return
    if (this.state === ENTITY_STATE_ENUM.HURT) return
    // 用摇杆轴值判断是否“正在移动”
    const isAxisZero = (this.moveAxis.x === 0 && this.moveAxis.y === 0)
    if (isAxisZero) {
      // 只有从“移动”切回“静止”这一刻才切状态，避免每帧重复 set state
      if (this.isMoving) {
        this.isMoving = false
        this.changeState(ENTITY_STATE_ENUM.IDLE)
      }
      return
    }
    // 状态机的参数目前是 TRIGGER，会在一次 run 后 reset
    // 所以“持续移动”需要每帧持续触发 MOVE，才能稳定保持 Move 动画
    this.isMoving = true
    this.changeState(ENTITY_STATE_ENUM.MOVE)
    // 更新逻辑坐标。由于Cocos坐标y轴向上为正，而逻辑格子y轴向下为正，所以y使用减号
    this.x += this.moveAxis.x * this.moveSpeed * dt
    this.y -= this.moveAxis.y * this.moveSpeed * dt
  }



  // 收到敌人命中帧结算的伤害事件
  private onTakeDamage(damage: number, sourceId: number) {
    if (this.isDead) return
    if (this.isInvincible) return
    this.stats.takeDamage(damage)
    if (!this.stats.isDead()) {
      // 受伤需要立即打断移动：如果这一帧继续触发 MOVE，会把 HURT 顶掉
      // 所以这里先锁住状态切换，让接下来 updateMoveByJoystick() 的 changeState(MOVE) 失效
      this.isMoving = false
      this.moveAxis.set(0, 0)
      this.InvincibleFor(this.hurtInvincibleContinue)
      this.forceChangeState(ENTITY_STATE_ENUM.HURT)
    } else {
      this.isDead = true
      this.isMoving = false
      this.moveAxis.set(0, 0)
      this.forceChangeState(ENTITY_STATE_ENUM.DEAD)
      
      // 关闭身体碰撞器防止死后被鞭尸
      if (this.bodyCollider) {
        this.bodyCollider.enabled = false
      }
      
      // 延时 2 秒后弹出结算面板
      setTimeout(() => {
        const gameOverNode = find('Canvas/UI_GameOver') || find('Stage/UI_GameOver') || find('UI_GameOver')
        if (gameOverNode) {
          const gameOverUI = gameOverNode.getComponent(UiGameOver)
          if (gameOverUI) {
            // 获取最终数据
            // 由于 Timer 节点在 BattleManager 中生成时挂载在 this.node (即 Canvas/BattleManager节点) 下，且名字为 'Timer'
            const battleNode = find('Canvas') || find('BattleManager')
            const uiTimerNode = battleNode?.getChildByName('Timer')
            const uiTimer = uiTimerNode?.getComponent('UiTimer') as any
            const survivalTime = uiTimer ? uiTimer.getSurvivalTimeStr() : '00:00'
            
            const killCount = DataManager.Instance.killCount
            const finalLevel = this.stats.level
            
            gameOverUI.show(false, survivalTime, killCount, finalLevel)
          }
        }
      }, 2000)
    }

  }

  //无敌时间
  InvincibleFor(duration: number) {
    if (this.isDead) return
    if (duration <= 0) {
      this.isInvincible = false
      Tween.stopAllByTarget(this)
      return
    }
    this.isInvincible = true
    Tween.stopAllByTarget(this)
    const blink = this.getComponent(UiBlink) || this.addComponent(UiBlink)
    blink.blink(0.2, duration, Color.WHITE, 40)
    tween(this)
      .delay(duration)
      .call(() => {
        this.isInvincible = false
      })
      .start()
  }

  // 攻击盒子与玩家碰撞开始
  protected onAttackBeginContact(self: Collider2D, other: Collider2D) {
    if (other?.tag !== COLLIDER_TYPE_ENUM.ENEMY_BODY) return
    const target = other.node.getComponent(EnemyManager)
    if (target && !target.isDead && !this.targetIdSet.has(target.id)) {
      this.targets.push(target)
      this.targetIdSet.add(target.id)
    }
  }

  // 攻击盒子与玩家碰撞结束
  protected onAttackEndContact(self: Collider2D, other: Collider2D) {
    if (other?.tag !== COLLIDER_TYPE_ENUM.ENEMY_BODY) return
    const target = other.node.getComponent(EnemyManager)
    if (target) {
      this.targets = this.targets.filter(t => t !== target)// 移除目标
      this.targetIdSet.delete(target.id)
    }
  }

  // 更新目标列表
  updateTargets() {
    if (this.targets.length === 0) {
      this.targetIdSet.clear()
      return
    }

    const nextTargets: EntityManager[] = []
    this.targetIdSet.clear()

    for (const t of this.targets) {
      const enemy = t as EnemyManager
      if (!enemy) continue
      if (enemy.isDead) continue
      if (!enemy.node || !enemy.node.isValid) continue
      if (this.targetIdSet.has(enemy.id)) continue
      nextTargets.push(enemy)
      this.targetIdSet.add(enemy.id)
    }

    this.targets = nextTargets
  }

  // 获取所有目标
  getAllTargets() {
    this.updateTargets()
    return this.targets
  }

  // 获取附近目标
  getNearestTarget() {
    this.updateTargets()
    if (this.targets.length === 0) return null

    let nearest: EnemyManager = null
    let nearestDistSq = Number.POSITIVE_INFINITY

    for (const t of this.targets) {
      const enemy = t as EnemyManager
      if (!enemy) continue
      if (!enemy.node || !enemy.node.isValid) continue

      const dx = enemy.x - this.x
      const dy = enemy.y - this.y
      const distSq = dx * dx + dy * dy
      if (distSq < nearestDistSq) {
        nearestDistSq = distSq
        nearest = enemy
      }
    }
    return nearest
  }

}

