import { _decorator, Component, Node, UITransform, EventTouch, Vec2, Vec3, math, Sprite, SpriteFrame } from 'cc'

import { EVENT_ENUM } from '../Enums'
import EventManager from '../Runtime/EventManager'
import ResourceManager from '../Runtime/ResourceManager'
import { createUINode } from '../Utils/utils'
const { ccclass, property } = _decorator

const RADIUS = 100 // 摇杆最大拖拽半径（视觉限制）,摇杆盘大小为RADIUS*2.5
const DEADZONE = 0.15 // 死区：拖拽距离小于此比例时认为没推
const IS_EIGHT_DIRECTION = false // 是否限制为八方向（建议关闭，保持连续方向）
const SNAP_DIRECTIONSS = 0 // 吸附方向数（0为不吸附）
const USE_CONSTANT_SPEED = true // 是否恒定速度输出：若为true，超出死区后axis的模始终为1
const AXIS_SMOOTHING = 0.1 // 摇杆方向的平滑过渡系数，0为立即响应，1为完全平滑过渡
const RETURN_TO_CENTER_ON_RELEASE = true // 松手后是否自动回中
const KNOB_SIZE = 70 // 控制块大小

// 控制盘UI脚本：处理触摸输入、更新控制块位置，并发送摇杆事件
@ccclass('UiCtrl')
export class UiCtrl extends Component {
  knobNode: Node | null = null // 控制块节点

  radius = RADIUS
  deadzone = DEADZONE
  isEightDirection = IS_EIGHT_DIRECTION 
  snapDirections = SNAP_DIRECTIONSS
  useConstantSpeed = USE_CONSTANT_SPEED
  axisSmoothing = AXIS_SMOOTHING
  returnToCenterOnRelease = RETURN_TO_CENTER_ON_RELEASE

  knobAxis = new Vec2() // 当前摇杆的输出方向（单位向量或受速度影响的向量）
  private bgTransform: UITransform | null = null // 背景节点的UI变换组件，用于坐标转换
  private knobCenterPos = new Vec3() // 控制块的初始中心点位置
  private tmpV3 = new Vec3() // 临时三维向量
  private tmpAxis = new Vec2() // 临时二维向量
  private isTouching = false // 是否正在被触摸
  private knobOffset = new Vec2() // 控制块相对于中心点的偏移量

  // 异步初始化：代码动态生成子节点、加载资源、设置尺寸
  async init() {
    this.bgTransform = this.getComponent(UITransform)
    if (this.bgTransform) {
      // 背景尺寸设定为与半径匹配的合适大小（假设背景图应覆盖摇杆活动区域）
      this.bgTransform.setContentSize(this.radius * 2.5, this.radius * 2.5)
      // 修改锚点居中，方便摇杆内部坐标计算
      this.bgTransform.setAnchorPoint(0.5, 0.5)
    }

    // 动态生成摇杆背景的Sprite
    const bgSprite = this.addComponent(Sprite)
    bgSprite.sizeMode = Sprite.SizeMode.CUSTOM
    bgSprite.trim = false

    // 动态生成内部的控制块（Knob）节点
    this.knobNode = createUINode('CtrlKnob')
    this.knobNode.setParent(this.node)
    const knobTransform = this.knobNode.getComponent(UITransform)
    if (knobTransform) {
      knobTransform.setContentSize(KNOB_SIZE, KNOB_SIZE) // 控制块固定尺寸
      knobTransform.setAnchorPoint(0.5, 0.5)
    }
    const knobSprite = this.knobNode.addComponent(Sprite)
    knobSprite.sizeMode = Sprite.SizeMode.CUSTOM
    knobSprite.trim = false

    // 加载UI资源目录
    try {
      const spriteFrames = await ResourceManager.Instance.loadDir('texture/UI/Control')
      // 匹配摇杆背景与控制块的图片（基于已有素材命名）
      const bgFrame = spriteFrames.find(v => v.name === 'ctrl_bg')
      const knobFrame = spriteFrames.find(v => v.name === 'ctrl_block')

      if (bgFrame) bgSprite.spriteFrame = bgFrame
      if (knobFrame) knobSprite.spriteFrame = knobFrame
    } catch (error) {
      console.warn('UI Control资源加载失败:', error)
    }

    this.refreshCenter() // 记录初始中心点
    this.applyAxis(0, 0, 0, 0, true) // 初始化摇杆位置归零
  }

  onEnable() {
    // 监听触摸事件：按住、移动、松手、取消
    this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this)
    this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this)
    this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this)
    this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this)
  }

  onDisable() {
    // 取消触摸事件监听
    this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this)
    this.node.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this)
    this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this)
    this.node.off(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this)
  }

  // 刷新记录控制块的中心位置
  refreshCenter() {
    if (!this.knobNode) {
      return
    }
    this.knobCenterPos.set(this.knobNode.position.x, this.knobNode.position.y, this.knobNode.position.z)
  }

  // 触摸开始回调
  private onTouchStart(event: EventTouch) {
    if (!this.knobNode || !this.bgTransform) {
      return
    }
    this.isTouching = true
    this.updateByTouch(event)
  }

  // 触摸移动回调
  private onTouchMove(event: EventTouch) {
    if (!this.isTouching) {
      return
    }
    this.updateByTouch(event) // 跟随触摸位置更新
  }

  // 触摸结束/取消回调
  private onTouchEnd() {
    this.isTouching = false
    if (this.returnToCenterOnRelease) {
      this.applyAxis(0, 0, 0, 0, true) // 松手强制回中
    }
  }

  // 根据触摸位置计算偏移与输出向量
  private updateByTouch(event: EventTouch) {
    if (!this.knobNode || !this.bgTransform) {
      return
    }

    const uiPos = event.getUILocation() // 获取屏幕触摸坐标
    this.tmpV3.set(uiPos.x, uiPos.y, 0)
    // 将屏幕坐标转为相对于摇杆背景节点的本地坐标
    this.bgTransform.convertToNodeSpaceAR(this.tmpV3, this.tmpV3)

    // 计算相对中心的差值
    let dx = this.tmpV3.x - this.knobCenterPos.x
    let dy = this.tmpV3.y - this.knobCenterPos.y

    const maxLen = Math.max(1, this.radius)
    const deadLen = math.clamp01(this.deadzone) * maxLen
    const len = Math.sqrt(dx * dx + dy * dy) // 触摸点距离中心长度

    // 如果未推出死区范围，则视为归零
    if (len <= deadLen) {
      this.applyAxis(0, 0, 0, 0, true)
      return
    }

    // 限制视觉上控制块不能飞出摇杆半径
    if (len > maxLen) {
      const s = maxLen / len
      dx *= s
      dy *= s
    }

    this.knobOffset.set(dx, dy) // 保存视觉偏移

    let ax = 0
    let ay = 0

    // 计算输出向量（axis）
    if (this.useConstantSpeed) {
      const l = Math.sqrt(dx * dx + dy * dy)
      if (l > 0.0001) {
        ax = dx / l // 取单位向量（长度为1），使移动速度恒定
        ay = dy / l
      }
    } else {
      ax = dx / maxLen // 取受半径比例影响的向量，速度会随推的力度变化
      ay = dy / maxLen
    }

    // 是否开启方向吸附（如八向控制）
    const snapCount = this.snapDirections > 0 ? this.snapDirections : (this.isEightDirection ? 8 : 0)
    if (snapCount >= 2) {
      const angle = Math.atan2(ay, ax)
      const step = (Math.PI * 2) / snapCount
      const snapped = Math.round(angle / step) * step // 按照设定的份数计算最近的角度
      ax = Math.cos(snapped)
      ay = Math.sin(snapped)
    }

    // 应用算出的输出向量与视觉偏移
    this.applyAxis(ax, ay, this.knobOffset.x, this.knobOffset.y, false)
  }

  // 应用轴输出与更新视觉节点位置，并派发全局事件
  private applyAxis(ax: number, ay: number, knobOffsetX: number, knobOffsetY: number, forceCenter: boolean) {
    if (!this.knobNode) {
      return
    }

    // 强制回中分支
    if (forceCenter) {
      this.knobAxis.set(0, 0)
    } else {
      const s = math.clamp01(this.axisSmoothing)
      // 若无平滑直接赋值，有平滑则按比例渐近
      if (s <= 0) {
        this.knobAxis.set(ax, ay)
      } else {
        const nx = this.knobAxis.x + (ax - this.knobAxis.x) * s
        const ny = this.knobAxis.y + (ay - this.knobAxis.y) * s
        if (Math.abs(nx) < 0.0001 && Math.abs(ny) < 0.0001) {
          this.knobAxis.set(0, 0)
        } else if (this.useConstantSpeed) {
          const l = Math.sqrt(nx * nx + ny * ny)
          if (l > 0.0001) {
            this.knobAxis.set(nx / l, ny / l) // 平滑后也要维持单位向量
          } else {
            this.knobAxis.set(0, 0)
          }
        } else {
          this.knobAxis.set(nx, ny)
        }
      }
    }

    // 强制归位时重置节点位置并触发事件
    if (forceCenter) {
      this.knobNode.setPosition(this.knobCenterPos)
      EventManager.Instance.emit(EVENT_ENUM.JOYSTICK_AXIS, this.knobAxis.x, this.knobAxis.y)
      return
    }

    // 应用拖拽后的视觉位置并触发事件
    const px = this.knobCenterPos.x + knobOffsetX
    const py = this.knobCenterPos.y + knobOffsetY
    this.knobNode.setPosition(px, py, this.knobCenterPos.z)
    // 通过事件总线将算好的 x/y 轴数据广播出去
    EventManager.Instance.emit(EVENT_ENUM.JOYSTICK_AXIS, this.knobAxis.x, this.knobAxis.y)
  }
}
