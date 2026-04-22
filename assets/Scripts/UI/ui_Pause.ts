import { _decorator, Component, EventTouch, Game, game, Node, Sprite, UITransform, Widget } from 'cc'
import { EVENT_ENUM } from '../Enums'
import EventManager from '../Runtime/EventManager'
import GameManager from '../Runtime/GameManager'
import ResourceManager from '../Runtime/ResourceManager'
import { createUINode } from '../Utils/utils'
const { ccclass, property } = _decorator

type PauseSpriteName = 'ui_pause' | 'ui_pause_bg' | 'ui_go_game' | 'ui_restart_game' | 'ui_exit_game'

@ccclass('UiPause')
export class UiPause extends Component {

  pauseButtonTop = 250// 暂停按钮顶部偏移量
  pauseButtonLeft = 10// 暂停按钮左侧偏移量
  pauseBgOffsetX = 0// 暂停背景中心偏移量
  pauseBgOffsetY = 0// 暂停背景中心偏移量
  continueBtnYRatio = 0.2// 继续按钮Y轴比例
  continueBtnOffsetX = 0// 继续按钮中心偏移量
  continueBtnOffsetY = 0// 继续按钮中心偏移量
  restartBtnYRatio = -0.05// 重新开始按钮Y轴比例
  restartBtnOffsetX = 0// 重新开始按钮中心偏移量
  restartBtnOffsetY = 0// 重新开始按钮中心偏移量
  exitBtnYRatio = -0.3// 退出按钮Y轴比例
  exitBtnOffsetX = 0// 退出按钮中心偏移量
  exitBtnOffsetY = 0// 退出按钮中心偏移量

  private joystickNode: Node | null = null// 操作杆节点

  private pauseButtonNode: Node | null = null// 暂停按钮节点
  private pausePanelNode: Node | null = null// 暂停面板节点

  async init() {
    this.joystickNode = this.node.parent?.getChildByName('CtrlBg') || null

    this.fitToParentSize()// 自适应父节点大小
    const spriteFrames = await ResourceManager.Instance.loadDir('texture/UI/Pause')

    const getFrame = (name: PauseSpriteName) => spriteFrames.find(v => v.name === name) || null

    this.pauseButtonNode = this.createSpriteNode('PauseButton', getFrame('ui_pause'))
    this.pauseButtonNode.setParent(this.node)
    this.pauseButtonNode.on(Node.EventType.TOUCH_END, this.onClickPause, this)
    this.alignTopLeft(this.pauseButtonNode, this.pauseButtonTop, this.pauseButtonLeft)

    this.pausePanelNode = createUINode('PausePanel')
    this.pausePanelNode.setParent(this.node)
    this.pausePanelNode.active = false
    this.fitChildToParentSize(this.pausePanelNode)
    this.pausePanelNode.on(Node.EventType.TOUCH_START, this.stopTouch, this)
    this.pausePanelNode.on(Node.EventType.TOUCH_MOVE, this.stopTouch, this)
    this.pausePanelNode.on(Node.EventType.TOUCH_END, this.stopTouch, this)
    this.pausePanelNode.on(Node.EventType.TOUCH_CANCEL, this.stopTouch, this)

    const bgNode = this.createSpriteNode('PauseBg', getFrame('ui_pause_bg'))
    bgNode.setParent(this.pausePanelNode)
    this.alignCenter(bgNode, this.pauseBgOffsetX, this.pauseBgOffsetY)

    const continueBtn = this.createSpriteNode('BtnContinue', getFrame('ui_go_game'))
    continueBtn.setParent(bgNode)
    continueBtn.on(Node.EventType.TOUCH_END, this.onClickResume, this)

    const restartBtn = this.createSpriteNode('BtnRestart', getFrame('ui_restart_game'))
    restartBtn.setParent(bgNode)
    restartBtn.on(Node.EventType.TOUCH_END, this.onClickRestart, this)
    this.matchNodeSizeByScale(continueBtn, restartBtn)

    const exitBtn = this.createSpriteNode('BtnExit', getFrame('ui_exit_game'))
    exitBtn.setParent(bgNode)
    exitBtn.on(Node.EventType.TOUCH_END, this.onClickExit, this)

    this.layoutButtons(bgNode, continueBtn, restartBtn, exitBtn)
  }

  onEnable() {
    game.on(Game.EVENT_HIDE, this.onGameHide, this)
  }

  onDisable() {
    game.off(Game.EVENT_HIDE, this.onGameHide, this)
  }

  private onGameHide() {
    this.pause()
  }

  // 点击暂停按钮
  // @param event 触摸事件
  private onClickPause(event: EventTouch) {
    event.propagationStopped = true
    this.pause()
  }

  // 点击继续按钮
  // @param event 触摸事件
  private onClickResume(event: EventTouch) {
    event.propagationStopped = true
    this.resume()
  }
  // 点击重新开始按钮
  // @param event 触摸事件
  private onClickRestart(event: EventTouch) {

    event.propagationStopped = true
    GameManager.Instance.restartGame()
  }

  // 点击退出按钮
  // @param event 触摸事件
  private onClickExit(event: EventTouch) {
    event.propagationStopped = true
    GameManager.Instance.exitGame()
  }

  // 暂停游戏
  // @param event 触摸事件
  private pause() {
    GameManager.Instance.pause()
    this.setUIPaused(true)
  }

  // 恢复游戏
  // @param event 触摸事件
  private resume() {
    GameManager.Instance.resume()
    this.setUIPaused(false)
  }

  // 设置UI暂停状态
  // @param paused 是否暂停
  private setUIPaused(paused: boolean) {
    if (this.pausePanelNode) this.pausePanelNode.active = paused
    if (this.pauseButtonNode) this.pauseButtonNode.active = !paused
    if (this.joystickNode) this.joystickNode.active = !paused
    EventManager.Instance.emit(EVENT_ENUM.JOYSTICK_AXIS, 0, 0)
  }

  // 阻止触摸事件冒泡
  // @param event 触摸事件
  private stopTouch(event: EventTouch) {
    event.propagationStopped = true
  }

  // 自适应父节点大小
  private fitToParentSize() {
    const parentTransform = this.node.parent?.getComponent(UITransform)
    const rootTransform = this.node.getComponent(UITransform)
    if (parentTransform && rootTransform) {
      rootTransform.setContentSize(parentTransform.contentSize)
      rootTransform.setAnchorPoint(0.5, 0.5)
    }
    this.node.setPosition(0, 0)
  }

  // 自适应子节点大小
  private fitChildToParentSize(childNode: Node) {
    const parentTransform = this.node.getComponent(UITransform)
    const childTransform = childNode.getComponent(UITransform)
    if (parentTransform && childTransform) {
      childTransform.setContentSize(parentTransform.contentSize)
      childTransform.setAnchorPoint(0.5, 0.5)
    }
    childNode.setPosition(0, 0)
  }

  // 创建精灵节点
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

  // 匹配节点大小并缩放
  // @param refNode 参考节点
  // @param targetNode 目标节点
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

  // 对齐节点到顶部左侧
  // @param node 节点
  // @param top 顶部偏移量
  // @param left 左侧偏移量
  private alignTopLeft(node: Node, top: number, left: number) {
    const widget = node.addComponent(Widget)
    widget.isAlignTop = true
    widget.isAlignLeft = true
    widget.top = top
    widget.left = left
  }

  // 对齐节点到中心
  // @param node 节点
  // @param offsetX 水平偏移量
  // @param offsetY 垂直偏移量
  private alignCenter(node: Node, offsetX: number = 0, offsetY: number = 0) {
    const widget = node.addComponent(Widget)
    widget.isAlignHorizontalCenter = true
    widget.isAlignVerticalCenter = true
    widget.horizontalCenter = offsetX
    widget.verticalCenter = offsetY
  }

  // 布局按钮
  // @param bgNode 背景节点
  // @param continueBtn 继续按钮
  // @param restartBtn 重新开始按钮
  // @param exitBtn 退出按钮
  private layoutButtons(bgNode: Node, continueBtn: Node, restartBtn: Node, exitBtn: Node) {
    const bgTransform = bgNode.getComponent(UITransform)
    const h = bgTransform?.contentSize.height || 0

    continueBtn.setPosition(this.continueBtnOffsetX, h * this.continueBtnYRatio + this.continueBtnOffsetY)
    restartBtn.setPosition(this.restartBtnOffsetX, h * this.restartBtnYRatio + this.restartBtnOffsetY)
    exitBtn.setPosition(this.exitBtnOffsetX, h * this.exitBtnYRatio + this.exitBtnOffsetY)
  }
}
