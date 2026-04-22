import {
  _decorator,
  BoxCollider2D,
  CircleCollider2D,
  Collider2D,
  Color,
  Component,
  Contact2DType,
  ERigidBody2DType,
  Graphics,
  Node,
  PhysicsSystem2D,
  RigidBody2D,
  Size,
  Sprite,
  Vec3,
  math,
} from 'cc'
import { COLLIDER_TYPE_ENUM, ENTITY_STATE_ENUM, ENTITY_TYPE_ENUM } from '../Enums'
import { StateMachine } from './StateMachine'
import { randomByLen } from '../Utils/utils'
import { IEnemyStats, IEntity, IPlayerStats } from '../../Maps'
import DataManager from '../Runtime/DataManager'
import { TILE_HEIGHT, TILE_WIDTH } from '../Tile/TileManager'
const { ccclass } = _decorator




@ccclass('EntityManager')
export class EntityManager extends Component {
  id: string = randomByLen(12) //12位随机id
  x: number = 0 // 当前X坐标
  y: number = 0 // 当前Y坐标
  fsm: StateMachine // 状态机实例

  type: ENTITY_TYPE_ENUM // 实体类型
  private _state: ENTITY_STATE_ENUM // 实体当前状态
  canChangeState = true// 是否可以切换状态

  bodyWidth = -1// 宽度
  bodyHeight = -1// 高度
  bodyColliderWidth = -1// 身体盒子宽度
  bodyColliderHeight = -1// 身体盒子高度
  attackRadius = -1// 攻击半径
  moveSpeed = -1// 移动速度
  isMoving = false //移动标志
  isDead = false// 是否死亡
  isFacingLeft = false // 当前是否朝左
  moveInsetTiles = -1// 限制敌人移动内边距（逻辑坐标）
  faceSwitchThreshold = -1// 朝向判定阈值，防止频繁切换朝向
  tmpScale = new Vec3()// 临时缩放向量（逻辑坐标）

  bodyCollider: BoxCollider2D = null// 身体碰撞器
  attackCollider: CircleCollider2D = null// 攻击碰撞器
  graphicLine: Graphics = null// 攻击辅助线（调试用）
  isDrawCollider = false

  get state() {
    return this._state
  }

  set state(newState: ENTITY_STATE_ENUM) {
    this._state = newState
    if (!this.fsm) return
    this.fsm.setParams(this._state, true)
  }

  async init(params: IEntity, stats: IPlayerStats | IEnemyStats) {
    const sprite = this.addComponent(Sprite)
    sprite.sizeMode = Sprite.SizeMode.CUSTOM // 尺寸模式为自定义
    sprite.trim = false

    this.x = params.x
    this.y = params.y
    this.type = params.type
    this.state = params.state
  }

  onDestroy() {
    if (this.attackCollider) {
      this.attackCollider.off(Contact2DType.BEGIN_CONTACT, this.onAttackBeginContact, this)
      this.attackCollider.off(Contact2DType.END_CONTACT, this.onAttackEndContact, this)
    }
  }

  // 设置是否可以切换状态
  setCanChangeState(canChange: boolean) {
    this.canChangeState = canChange
  }

  // 切换状态：根据当前状态和目标状态，判断是否可以切换
  changeState(newState: ENTITY_STATE_ENUM) {
    if (!this.canChangeState) return
    this.state = newState
  }

  // 强制切换状态：忽略 canChangeState（用于受伤/死亡等强制状态）
  forceChangeState(newState: ENTITY_STATE_ENUM) {
    this.setCanChangeState(false)
    this.state = newState
  }

  // 死亡通知
  onDead() {
    this.node.destroy()
  }

  // 更新实体位置，确保与逻辑坐标一致
  protected updatePosition(insetTiles: number = 0) {
    this.clampPositionInMap(insetTiles)
    this.applyGridPositionToNode()
  }

  // 限制实体位置在地图范围内
  private clampPositionInMap(insetTiles: number = 0) {
    const cols = DataManager.Instance.mapColumnCount
    const rows = DataManager.Instance.mapRowCount
    if (cols <= 0 || rows <= 0) return

    const inset = Math.max(0, insetTiles)
    const minX = inset
    const maxX = cols - 1 - inset
    const minY = inset
    const maxY = rows - 1 - inset

    this.x = minX <= maxX ? math.clamp(this.x, minX, maxX) : (cols - 1) / 2
    this.y = minY <= maxY ? math.clamp(this.y, minY, maxY) : (rows - 1) / 2
  }

  // 应用逻辑坐标到节点位置
  private applyGridPositionToNode() {
    const mapWidth = DataManager.Instance.mapColumnCount * TILE_WIDTH
    const mapHeight = DataManager.Instance.mapRowCount * TILE_HEIGHT

    const px = (this.x + 0.5) * TILE_WIDTH - mapWidth / 2
    const py = mapHeight / 2 - (this.y + 0.5) * TILE_HEIGHT
    this.node.setPosition(px, py)
  }

  // 设置是否朝左，通过改变 node 的 scaleX 实现水平镜像
  setFacingLeft(isLeft: boolean) {
    if (this.isFacingLeft === isLeft) return
    this.isFacingLeft = isLeft

    const s = this.node.scale
    const absX = Math.abs(s.x) || 1
    const nextX = isLeft ? -absX : absX
    this.tmpScale.set(nextX, s.y, s.z)
    this.node.setScale(this.tmpScale)
  }

  // 初始化物理引擎
  protected initPhysics() {
    const system = PhysicsSystem2D.instance
    if (system && !system.enable) {
      system.enable = true
    }

    let rb = this.getComponent(RigidBody2D)
    if (!rb) {
      rb = this.addComponent(RigidBody2D)
    }
    rb.type = ERigidBody2DType.Kinematic  //  kinematic 类型，不会响应物理力，也不会响应碰撞
    rb.enabledContactListener = true
    rb.allowSleep = false  //  不允许休眠
    rb.gravityScale = 0  //  不响应重力

    let body = this.getComponent(BoxCollider2D)
    if (!body) {
      body = this.addComponent(BoxCollider2D)
    }
    body.sensor = true  //  传感器碰撞器，不会响应物理力，也不会响应碰撞，用于检测与玩家的碰撞
    body.tag = this.type === ENTITY_TYPE_ENUM.PLAYER ? COLLIDER_TYPE_ENUM.PLAYER_BODY : COLLIDER_TYPE_ENUM.ENEMY_BODY
    body.size = new Size(this.bodyColliderWidth, this.bodyColliderHeight)
    body.apply()
    this.bodyCollider = body

    let attack = this.getComponent(CircleCollider2D)
    if (!attack) {
      attack = this.addComponent(CircleCollider2D)
    }
    attack.sensor = true
    attack.tag = this.type === ENTITY_TYPE_ENUM.PLAYER ? COLLIDER_TYPE_ENUM.PLAYER_ATTACK : COLLIDER_TYPE_ENUM.ENEMY_ATTACK
    attack.radius = this.attackRadius * TILE_WIDTH
    attack.apply()
    attack.off(Contact2DType.BEGIN_CONTACT, this.onAttackBeginContact, this)
    attack.off(Contact2DType.END_CONTACT, this.onAttackEndContact, this)
    attack.on(Contact2DType.BEGIN_CONTACT, this.onAttackBeginContact, this)
    attack.on(Contact2DType.END_CONTACT, this.onAttackEndContact, this)
    this.attackCollider = attack
  }

  // 攻击盒子与玩家碰撞开始
  protected onAttackBeginContact(self: Collider2D, other: Collider2D) {

  }
  // 攻击盒子与玩家碰撞结束
  protected onAttackEndContact(self: Collider2D, other: Collider2D) {

  }

  protected drawCollider() {
    if (!this.isDrawCollider) return
    if (!this.graphicLine) {
      let graphicNode = this.node.getChildByName('GraphicCollider')
      if (!graphicNode) {
        graphicNode = new Node('GraphicCollider')
        graphicNode.layer = this.node.layer
        graphicNode.setPosition(0, 0)
        this.node.addChild(graphicNode)
        graphicNode.setSiblingIndex(this.node.children.length - 1)
      }

      this.graphicLine = graphicNode.getComponent(Graphics)
      if (!this.graphicLine) {
        this.graphicLine = graphicNode.addComponent(Graphics)
      }
      this.graphicLine.lineWidth = 5
      this.graphicLine.strokeColor = new Color(0, 255, 0, 255)
    }

    const g = this.graphicLine
    g.clear()

    if (this.bodyCollider) {
      const size = this.bodyCollider.size
      const offset = this.bodyCollider.offset
      g.rect(offset.x - size.width / 2, offset.y - size.height / 2, size.width, size.height)
    }
    if (this.attackCollider) {
      const offset = this.attackCollider.offset
      g.circle(offset.x, offset.y, this.attackCollider.radius)
    }

    g.stroke()//  绘制辅助线
  }
}
