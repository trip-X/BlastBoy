import { _decorator, Component, EventTouch, Node, Sprite, UITransform, Widget, Label, Color, TTFFont, Layout } from 'cc'
import GameManager from '../Runtime/GameManager'
import ResourceManager from '../Runtime/ResourceManager'
import { createUINode } from '../Utils/utils'

const { ccclass } = _decorator

const FONT_URL = 'texture/UI/font/text'

type EndSpriteName = 'bg' | 'ui_restart_game' | 'ui_exit_game'

@ccclass('UiGameOver')
export class UiGameOver extends Component {
  
  // ================== 配置参数区 ==================
  // 遮罩透明度（0~255，255为完全不透明纯黑）
  maskAlpha = 255
  
  // 背景底板
  bgOffsetX = 0
  bgOffsetY = 0

  // 标题文本 (GAME OVER)
  titleFontSize = 60
  titleOffsetX = -120
  titleOffsetY = 150

  // 战报数据文本 (时间、击杀、等级)
  statsFontSize = 36
  statsOffsetX = -110
  statsOffsetY = -10
  statsSpacingY = 15

  // 底部按钮 (重开、退出)
  restartBtnScale = 0.08
  restartBtnOffsetX = -150
  restartBtnOffsetY = -180
  
  exitBtnScale = 1
  exitBtnOffsetX = 150
  exitBtnOffsetY = -180
  // ================================================

  private panelNode: Node | null = null
  private titleLabel: Label | null = null
  private timeLabel: Label | null = null
  private killLabel: Label | null = null
  private levelLabel: Label | null = null

  async init() {
    this.fitToParentSize() // 根节点全屏拦截

    const spriteFrames = await ResourceManager.Instance.loadDir('texture/UI/End')
    const getFrame = (name: EndSpriteName) => spriteFrames.find(v => v.name === name) || null

    // 1. 创建全屏遮罩与事件拦截面板
    this.panelNode = createUINode('GameOverPanel')
    this.panelNode.setParent(this.node)
    this.panelNode.active = false
    this.fitChildToParentSize(this.panelNode)
    
    // 拦截一切触摸事件，实现类似 ui_Pause 的效果
    this.panelNode.on(Node.EventType.TOUCH_START, this.stopTouch, this)
    this.panelNode.on(Node.EventType.TOUCH_MOVE, this.stopTouch, this)
    this.panelNode.on(Node.EventType.TOUCH_END, this.stopTouch, this)
    this.panelNode.on(Node.EventType.TOUCH_CANCEL, this.stopTouch, this)

    // 黑色背景遮罩 (支持修改透明度)
    const maskSprite = this.panelNode.addComponent(Sprite)
    maskSprite.color = new Color(0, 0, 0, this.maskAlpha)

    // 2. 结算框底板
    const bgNode = this.createSpriteNode('EndBg', getFrame('bg'))
    bgNode.setParent(this.panelNode)
    this.alignCenter(bgNode, this.bgOffsetX, this.bgOffsetY)

    // 加载字体
    let textFont: TTFFont | null = null
    try {
      textFont = await ResourceManager.Instance.loadAsset<TTFFont>(FONT_URL, TTFFont as any)
    } catch (e) {
      console.warn('Load textFont error in UiGameOver')
    }

    // 3. 大标题 (GAME OVER)
    const titleNode = createUINode('TitleText')
    titleNode.setParent(bgNode)
    this.titleLabel = this.createLabel(titleNode, textFont, this.titleFontSize, new Color(220, 20, 60, 255))
    this.alignCenter(titleNode, this.titleOffsetX, this.titleOffsetY)

    // 4. 战报信息 Layout 容器
    const statsNode = createUINode('StatsLayout')
    statsNode.setParent(bgNode)
    this.alignCenter(statsNode, this.statsOffsetX, this.statsOffsetY)
    const statsLayout = statsNode.addComponent(Layout)
    statsLayout.type = Layout.Type.VERTICAL
    statsLayout.spacingY = this.statsSpacingY
    statsLayout.resizeMode = Layout.ResizeMode.CONTAINER

    // 创建存活时间文本
    const timeNode = createUINode('TimeText')
    timeNode.setParent(statsNode)
    this.timeLabel = this.createLabel(timeNode, textFont, this.statsFontSize, new Color(255, 255, 255, 255))

    // 创建击杀数量文本
    const killNode = createUINode('KillText')
    killNode.setParent(statsNode)
    this.killLabel = this.createLabel(killNode, textFont, this.statsFontSize, new Color(255, 255, 255, 255))

    // 创建最终等级文本
    const levelNode = createUINode('LevelText')
    levelNode.setParent(statsNode)
    this.levelLabel = this.createLabel(levelNode, textFont, this.statsFontSize, new Color(255, 255, 255, 255))

    // 5. 按钮布局 (取消 Layout，直接使用 Widget 控制独立位置)
    const restartBtn = this.createSpriteNode('BtnRestart', getFrame('ui_restart_game'))
    restartBtn.setParent(bgNode)
    this.alignCenter(restartBtn, this.restartBtnOffsetX, this.restartBtnOffsetY)
    restartBtn.on(Node.EventType.TOUCH_END, this.onClickRestart, this)

    const exitBtn = this.createSpriteNode('BtnExit', getFrame('ui_exit_game'))
    exitBtn.setParent(bgNode)
    this.alignCenter(exitBtn, this.exitBtnOffsetX, this.exitBtnOffsetY)
    exitBtn.on(Node.EventType.TOUCH_END, this.onClickExit, this)
    
    // 独立控制缩放比例
    restartBtn.setScale(this.restartBtnScale, this.restartBtnScale, 1)
    exitBtn.setScale(this.exitBtnScale, this.exitBtnScale, 1)
  }

  /**
   * 触发显示结算界面
   * @param isWin 是否胜利
   * @param timeStr 存活时间字符串
   * @param killCount 击杀数量
   * @param level 最终等级
   */
  public show(isWin: boolean, timeStr: string, killCount: number, level: number) {
    if (!this.panelNode) return
    
    // 暂停游戏（封装了 director.pause() 并处理其他逻辑）
    GameManager.Instance.pause()
    this.panelNode.active = true

    // 设置大标题与颜色
    if (this.titleLabel) {
      this.titleLabel.string = isWin ? 'STAGE CLEAR' : 'GAME OVER'
      this.titleLabel.color = isWin ? new Color(50, 205, 50, 255) : new Color(220, 20, 60, 255)
    }

    if (this.timeLabel) this.timeLabel.string = `存活时间: ${timeStr}`
    if (this.killLabel) this.killLabel.string = `击杀数量: ${killCount}`
    if (this.levelLabel) this.levelLabel.string = `最终等级: Lv.${level}`
  }

  private onClickRestart(event: EventTouch) {
    event.propagationStopped = true
    // GameManager.Instance.restartGame() 内部会执行 resume() 和状态重置
    GameManager.Instance.restartGame()
  }

  private onClickExit(event: EventTouch) {
    event.propagationStopped = true
    // 同上，处理返回主菜单或退出
    GameManager.Instance.exitGame()
  }

  private stopTouch(event: EventTouch) {
    event.propagationStopped = true
  }

  // ---- 以下为复用的 UI 构建辅助方法 ----

  private fitToParentSize() {
    const parentTransform = this.node.parent?.getComponent(UITransform)
    const rootTransform = this.node.getComponent(UITransform)
    if (parentTransform && rootTransform) {
      rootTransform.setContentSize(parentTransform.contentSize)
      rootTransform.setAnchorPoint(0.5, 0.5)
    }
    this.node.setPosition(0, 0)
  }

  private fitChildToParentSize(childNode: Node) {
    const parentTransform = this.node.getComponent(UITransform)
    const childTransform = childNode.getComponent(UITransform)
    if (parentTransform && childTransform) {
      childTransform.setContentSize(parentTransform.contentSize)
      childTransform.setAnchorPoint(0.5, 0.5)
    }
    childNode.setPosition(0, 0)
  }

  private createSpriteNode(name: string, spriteFrame: any) {
    const node = createUINode(name)
    const transform = node.getComponent(UITransform)
    transform?.setAnchorPoint(0.5, 0.5)
    const sprite = node.addComponent(Sprite)
    sprite.sizeMode = Sprite.SizeMode.CUSTOM
    sprite.trim = false
    if (spriteFrame) {
      sprite.spriteFrame = spriteFrame
      transform?.setContentSize(spriteFrame.originalSize)
    }
    return node
  }

  private createLabel(node: Node, font: TTFFont | null, fontSize: number, color: Color) {
    const label = node.addComponent(Label)
    label.fontSize = fontSize
    label.lineHeight = fontSize + 10
    label.color = color
    if (font) {
      label.font = font
      const anyLabel = label as any
      if (anyLabel.useSystemFont != null) anyLabel.useSystemFont = false
    }
    return label
  }

  private alignCenter(node: Node, offsetX: number = 0, offsetY: number = 0) {
    const widget = node.addComponent(Widget)
    widget.isAlignHorizontalCenter = true
    widget.isAlignVerticalCenter = true
    widget.horizontalCenter = offsetX
    widget.verticalCenter = offsetY
  }

  private matchNodeSizeByScale(refNode: Node, targetNode: Node) {
    const refTransform = refNode.getComponent(UITransform)
    const targetTransform = targetNode.getComponent(UITransform)
    if (!refTransform || !targetTransform) return
    const refW = refTransform.contentSize.width
    const refH = refTransform.contentSize.height
    const targetW = targetTransform.contentSize.width
    const targetH = targetTransform.contentSize.height
    if (refW <= 0 || refH <= 0) return
    if (targetW <= 0 || targetH <= 0) return
    const scale = Math.min(refW / targetW, refH / targetH)
    targetNode.setScale(scale, scale, 1)
  }
}
