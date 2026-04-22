import { _decorator, Color, Component, EventTouch, HorizontalTextAlignment, Label, Node, Sprite, TTFFont, UITransform, VerticalTextAlignment, Widget } from 'cc'
import { EVENT_ENUM } from '../Enums'
import EventManager from '../Runtime/EventManager'
import GameManager from '../Runtime/GameManager'
import DataManager from '../Runtime/DataManager'
import ResourceManager from '../Runtime/ResourceManager'
import { createUINode } from '../Utils/utils'
import UpgradeManager, { UpgradeOption } from '../Upgrade/UpgradeManager'
import type { UpgradeMode } from '../Upgrade/UpgradeConfig'
import { PlayerStats } from '../Stats/PlayerStats'
import { UPGRADE_LEVEL_COLOR_RGBA } from '../Upgrade/UpgradeConfig'

const { ccclass } = _decorator

const UI_UPDATE_PATH = 'texture/UI/Update'
const UI_UPDATE_BG = 'bg'
const UI_UPDATE_SELECT = 'select'
const UI_TEXT_FONT_URL = 'texture/UI/font/text'

const BG_OFFSET_X = 0// 背景偏移量X
const BG_OFFSET_Y = 0// 背景偏移量Y
const BG_WIDTH = 1000// 背景宽度
const BG_HEIGHT = 1200// 背景高度
const BTN_SPACING_Y = 25// 按钮间距Y
const OPTION_BTN_WIDTH = 900// 选项按钮宽度
const OPTION_BTN_HEIGHT = 300// 选项按钮高度
const OPTION_BTN_GROUP_OFFSET_X = 0// 选项按钮组偏移量X
const OPTION_BTN_GROUP_OFFSET_Y = -100// 选项按钮组偏移量Y
const OPTION_BTN_OFFSET_X_LIST = [0, 0, 0]// 选项按钮偏移量X列表
const OPTION_BTN_OFFSET_Y_LIST = [0, 0, 0]// 选项按钮偏移量Y列表

const TITLE_FONT_SIZE = 70// 标题字体大小
const DESC_FONT_SIZE = 40// 描述字体大小
const DESC_WRAP_WIDTH = 700// 描述换行宽度
const DESC_LINE_HEIGHT = 50// 描述行高
const TITLE_OFFSET_X = -350// 标题偏移量X
const TITLE_OFFSET_Y = 100// 标题偏移量Y
const DESC_OFFSET_X = -350// 描述偏移量X
const DESC_OFFSET_Y = 25// 描述偏移量Y

@ccclass('UiUpgrade')
export class UiUpgrade extends Component {
  private joystickNode: Node | null = null
  private pauseNode: Node | null = null

  private panelNode: Node | null = null
  private bgNode: Node | null = null

  private buttonNodes: Node[] = []
  private titleLabels: Label[] = []
  private descLabels: Label[] = []

  private options: UpgradeOption[] = []
  private pendingLevelUpCount = 0
  private isShowing = false
  private isStartSelecting = false
  private isApplying = false

  async init() {
    UpgradeManager.Instance.reset()

    this.joystickNode = this.node.parent?.getChildByName('CtrlBg') || null
    this.pauseNode = this.node.parent?.getChildByName('Pause') || null

    this.fitToParentSize()

    let textFont: TTFFont = null
    try {
      textFont = await ResourceManager.Instance.loadAsset<TTFFont>(UI_TEXT_FONT_URL, TTFFont as any)
    } catch (e) {
    }

    const spriteFrames = await ResourceManager.Instance.loadDir(UI_UPDATE_PATH)
    const bgFrame = spriteFrames.find(v => v.name === UI_UPDATE_BG) || null
    const btnFrame = spriteFrames.find(v => v.name === UI_UPDATE_SELECT) || null

    const panelNode = createUINode('UpgradePanel')
    panelNode.setParent(this.node)
    panelNode.active = false
    this.fitChildToParentSize(panelNode)
    panelNode.on(Node.EventType.TOUCH_START, this.stopTouch, this)
    panelNode.on(Node.EventType.TOUCH_MOVE, this.stopTouch, this)
    panelNode.on(Node.EventType.TOUCH_END, this.stopTouch, this)
    panelNode.on(Node.EventType.TOUCH_CANCEL, this.stopTouch, this)
    this.panelNode = panelNode

    const bgNode = this.createSpriteNode('Bg', bgFrame)
    bgNode.setParent(panelNode)
    const bgTransform = bgNode.getComponent(UITransform)
    if (bgTransform) {
      const w = BG_WIDTH > 0 ? BG_WIDTH : bgTransform.contentSize.width
      const h = BG_HEIGHT > 0 ? BG_HEIGHT : bgTransform.contentSize.height
      if (w > 0 && h > 0) bgTransform.setContentSize(w, h)
    }
    this.alignCenter(bgNode, BG_OFFSET_X, BG_OFFSET_Y)
    this.bgNode = bgNode

    for (let i = 0; i < 3; i++) {
      const btn = this.createSpriteNode(`Btn${i + 1}`, btnFrame)
      btn.setParent(bgNode)
      btn.on(Node.EventType.TOUCH_END, (e: EventTouch) => this.onClickOption(e, i), this)

      const btnTransform = btn.getComponent(UITransform)
      if (btnTransform) {
        const w = OPTION_BTN_WIDTH > 0 ? OPTION_BTN_WIDTH : btnTransform.contentSize.width
        const h = OPTION_BTN_HEIGHT > 0 ? OPTION_BTN_HEIGHT : btnTransform.contentSize.height
        if (w > 0 && h > 0) btnTransform.setContentSize(w, h)
      }

      const titleNode = createUINode('Title')
      titleNode.setParent(btn)
      const titleLabel = titleNode.addComponent(Label)
      titleLabel.fontSize = TITLE_FONT_SIZE
      titleLabel.horizontalAlign = HorizontalTextAlignment.CENTER
      titleLabel.verticalAlign = VerticalTextAlignment.CENTER
      titleLabel.string = ''
      if (textFont) {
        titleLabel.font = textFont
        const anyLabel = titleLabel as any
        if (anyLabel.useSystemFont != null) anyLabel.useSystemFont = false
      }
      this.titleLabels.push(titleLabel)

      const descNode = createUINode('Desc')
      descNode.setParent(btn)
      const descLabel = descNode.addComponent(Label)
      descLabel.fontSize = DESC_FONT_SIZE
      descLabel.horizontalAlign = HorizontalTextAlignment.CENTER
      descLabel.verticalAlign = VerticalTextAlignment.CENTER
      descLabel.overflow = Label.Overflow.RESIZE_HEIGHT
      descLabel.enableWrapText = true
      if (DESC_LINE_HEIGHT > 0) descLabel.lineHeight = DESC_LINE_HEIGHT
      descLabel.string = ''
      if (textFont) {
        descLabel.font = textFont
        const anyLabel = descLabel as any
        if (anyLabel.useSystemFont != null) anyLabel.useSystemFont = false
      }
      this.descLabels.push(descLabel)

      const t1 = titleNode.getComponent(UITransform)
      const t2 = descNode.getComponent(UITransform)
      if (btnTransform && t1 && t2) {
        t1.setContentSize(btnTransform.contentSize.width * 0.92, btnTransform.contentSize.height * 0.5)
        const wrapW = DESC_WRAP_WIDTH > 0 ? DESC_WRAP_WIDTH : (btnTransform.contentSize.width * 0.92)
        t2.setContentSize(wrapW, btnTransform.contentSize.height * 0.5)
      }

      titleNode.setPosition(TITLE_OFFSET_X, TITLE_OFFSET_Y, 0)
      descNode.setPosition(DESC_OFFSET_X, DESC_OFFSET_Y, 0)

      this.buttonNodes.push(btn)
    }

    this.layoutButtons(bgNode, this.buttonNodes)

    EventManager.Instance.on(EVENT_ENUM.PLAYER_LEVEL_UP, this.onPlayerLevelUp, this)
  }

  onDestroy() {
    EventManager.Instance.off(EVENT_ENUM.PLAYER_LEVEL_UP, this.onPlayerLevelUp)
  }

  openStart() {
    if (this.isShowing) return
    this.isStartSelecting = true
    this.openPanel('start', 1)
  }

  // 玩家等级升级
  private onPlayerLevelUp(level: number) {
    this.pendingLevelUpCount += 1
    if (this.isShowing) return
    if (this.isStartSelecting) return
    this.openNextLevelUp(level)
  }

  // 打开下一个等级升级面板
  private openNextLevelUp(level: number) {
    this.openPanel('levelUp', level)
  }

  // 打开升级面板
  private async openPanel(mode: UpgradeMode, playerLevel: number) {
    if (!this.panelNode) return
    if (this.isShowing) return

    this.isShowing = true
    this.isApplying = false
    GameManager.Instance.pause()
    this.setUIPaused(true)

    const options = await UpgradeManager.Instance.roll3(mode, playerLevel)
    this.options = options
    this.panelNode.active = true

    for (let i = 0; i < 3; i++) {
      const btn = this.buttonNodes[i]
      const title = this.titleLabels[i]
      const desc = this.descLabels[i]
      if (!btn || !title || !desc) continue

      const opt = options[i] || null
      if (!opt) {
        btn.active = false
        title.string = ''
        desc.string = ''
        continue
      }
      btn.active = true
      title.string = opt.title || ''
      desc.string = opt.desc || ''
      const rgba = UPGRADE_LEVEL_COLOR_RGBA[opt.displayLevel] || UPGRADE_LEVEL_COLOR_RGBA[0]
      const c = new Color(rgba[0], rgba[1], rgba[2], rgba[3])
      title.color = c
      desc.color = c
    }
  }

  // 点击升级选项
  private async onClickOption(event: EventTouch, index: number) {
    event.propagationStopped = true
    if (this.isApplying) return
    const opt = this.options[index]
    if (!opt) return
    this.isApplying = true

    await opt.apply()

    if (this.isStartSelecting) {
      this.isStartSelecting = false
      this.pendingLevelUpCount = 0
      this.closePanel(true)
      return
    }

    this.pendingLevelUpCount = Math.max(0, this.pendingLevelUpCount - 1)
    if (this.pendingLevelUpCount > 0) {
      this.isShowing = false
      this.isApplying = false
      this.panelNode.active = false
      const playerLevel = DataManager.Instance.player?.getComponent(PlayerStats)?.level || 1
      this.openNextLevelUp(playerLevel)
      return
    }

    this.closePanel(true)
  }

  // 关闭升级面板
  private closePanel(resumeGame: boolean) {
    if (this.panelNode) this.panelNode.active = false
    this.options = []
    this.isShowing = false
    this.isApplying = false
    this.setUIPaused(false)
    if (resumeGame) GameManager.Instance.resume()
  }

  // 设置UI暂停状态
  private setUIPaused(paused: boolean) {
    if (this.joystickNode) this.joystickNode.active = !paused
    if (this.pauseNode) this.pauseNode.active = !paused
    EventManager.Instance.emit(EVENT_ENUM.JOYSTICK_AXIS, 0, 0)
  }

  // 阻止触摸事件冒泡
  private stopTouch(event: EventTouch) {
    event.propagationStopped = true
  }

  // 节点适应父节点大小
  private fitToParentSize() {
    const parentTransform = this.node.parent?.getComponent(UITransform)
    const rootTransform = this.node.getComponent(UITransform)
    if (parentTransform && rootTransform) {
      rootTransform.setContentSize(parentTransform.contentSize)
      rootTransform.setAnchorPoint(0.5, 0.5)
    }
    this.node.setPosition(0, 0)
  }

  // 子节点适应父节点大小
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

  // 居中对齐节点
  private alignCenter(node: Node, offsetX: number = 0, offsetY: number = 0) {
    const widget = node.addComponent(Widget)
    widget.isAlignHorizontalCenter = true
    widget.isAlignVerticalCenter = true
    widget.horizontalCenter = offsetX
    widget.verticalCenter = offsetY
  }

  // 布局按钮
  private layoutButtons(bgNode: Node, btnNodes: Node[]) {
    if (btnNodes.length === 0) return

    let btnH = 0
    const t0 = btnNodes[0]?.getComponent(UITransform) || null
    if (t0) btnH = t0.contentSize.height

    const step = btnH > 0 ? (btnH + BTN_SPACING_Y) : BTN_SPACING_Y
    const total = btnNodes.length
    const firstY = (total - 1) * 0.5 * step

    for (let i = 0; i < total; i++) {
      const btn = btnNodes[i]
      if (!btn) continue
      const dx = OPTION_BTN_GROUP_OFFSET_X + (OPTION_BTN_OFFSET_X_LIST[i] || 0)
      const dy = OPTION_BTN_GROUP_OFFSET_Y + (OPTION_BTN_OFFSET_Y_LIST[i] || 0)
      btn.setPosition(dx, firstY - i * step + dy, 0)
    }
  }
}

export default UiUpgrade
