import { _decorator, Component, director, HorizontalTextAlignment, Label, Node, Sprite, UITransform, VerticalTextAlignment, Widget } from 'cc'
import DataManager from '../Runtime/DataManager'
import ResourceManager from '../Runtime/ResourceManager'
import { PlayerStats } from '../Stats/PlayerStats'
import { createUINode } from '../Utils/utils'
const { ccclass } = _decorator

const UI_EXPBAR_PATH = 'texture/UI/ExpBar'
const UI_EXPBAR_BG = 'expBar_1'
const UI_EXPBAR_FILL_BOTTOM = 'expBar_3'

const UI_EXPBAR_LEFT = 640
const UI_EXPBAR_TOP = 100
const UI_EXPBAR_GAP = 10
const UI_EXPBAR_WIDTH = 1280
const UI_EXPBAR_HEIGHT = 110
const UI_EXPBAR_LEVEL_RIGHT_PADDING = 20
const UI_EXPBAR_LEVEL_OFFSET_X = -60
const UI_EXPBAR_LEVEL_OFFSET_Y = 0
const UI_EXPBAR_LEVEL_FONT_SIZE = 42
const UI_EXPBAR_LEVEL_SCALE = 1.5
const UI_EXPBAR_LEVEL_WIDTH = 140
const UI_EXPBAR_LEVEL_FONT_URL = 'texture/UI/font/num'
const UI_EXPBAR_SMOOTH_SPEED = 12

@ccclass('UiExpBar')
export class UiExpBar extends Component {
  private fillBottomSprite: Sprite = null
  private levelLabel: Label = null
  private barWidth = 0
  private currentFill = 0
  private isInited = false

  async init(healthBarNode?: Node) {
    const widget = this.getComponent(Widget) || this.addComponent(Widget)
    widget.isAlignTop = true
    widget.isAlignLeft = true
    widget.left = UI_EXPBAR_LEFT
    widget.top = this.calcTopByHealthBar(healthBarNode)

    const bgNode = createUINode('ExpBg')
    bgNode.setParent(this.node)
    bgNode.setPosition(0, 0)

    const fillBottomNode = createUINode('ExpFillBottom')
    fillBottomNode.setParent(this.node)
    fillBottomNode.setPosition(0, 0)

    const levelNode = createUINode('Level')
    levelNode.setParent(this.node)
    levelNode.setPosition(0, 0)
    levelNode.setScale(UI_EXPBAR_LEVEL_SCALE, UI_EXPBAR_LEVEL_SCALE, 1)

    bgNode.setSiblingIndex(0)
    fillBottomNode.setSiblingIndex(1)
    levelNode.setSiblingIndex(2)

    const bgTransform = bgNode.getComponent(UITransform)
    const fillBottomTransform = fillBottomNode.getComponent(UITransform)
    const levelTransform = levelNode.getComponent(UITransform)

    bgTransform?.setAnchorPoint(0.5, 0.5)
    fillBottomTransform?.setAnchorPoint(0.5, 0.5)
    levelTransform?.setAnchorPoint(0.5, 0.5)

    const bgSprite = bgNode.addComponent(Sprite)
    bgSprite.sizeMode = Sprite.SizeMode.CUSTOM
    bgSprite.trim = false

    const fillBottomSprite = fillBottomNode.addComponent(Sprite)
    fillBottomSprite.sizeMode = Sprite.SizeMode.CUSTOM
    fillBottomSprite.trim = false
    this.fillBottomSprite = fillBottomSprite

    const levelLabel = levelNode.addComponent(Label)
    levelLabel.string = '1'
    levelLabel.fontSize = UI_EXPBAR_LEVEL_FONT_SIZE
    levelLabel.horizontalAlign = HorizontalTextAlignment.RIGHT
    levelLabel.verticalAlign = VerticalTextAlignment.CENTER
    this.levelLabel = levelLabel

    try {
      const bitmapFont = await ResourceManager.Instance.loadBitmapFont(UI_EXPBAR_LEVEL_FONT_URL)
      if (bitmapFont) {
        levelLabel.font = bitmapFont
        const anyLabel = levelLabel as any
        if (anyLabel.useSystemFont != null) anyLabel.useSystemFont = false
      }
    } catch (e) {
    }

    const spriteFrames = await ResourceManager.Instance.loadDir(UI_EXPBAR_PATH)
    const bgFrame = spriteFrames.find(v => v.name === UI_EXPBAR_BG)
    const fillBottomFrame = spriteFrames.find(v => v.name === UI_EXPBAR_FILL_BOTTOM)

    const bgSize = bgFrame?.originalSize || null
    const expW = UI_EXPBAR_WIDTH > 0 ? UI_EXPBAR_WIDTH : (bgSize?.width || 0)
    const expH = UI_EXPBAR_HEIGHT > 0 ? UI_EXPBAR_HEIGHT : (bgSize?.height || 0)
    this.barWidth = expW

    if (bgFrame) {
      bgSprite.spriteFrame = bgFrame
      if (expW > 0 && expH > 0) bgTransform?.setContentSize(expW, expH)
      else bgTransform?.setContentSize(bgFrame.originalSize)
    }

    if (fillBottomFrame) {
      fillBottomSprite.spriteFrame = fillBottomFrame
      if (expW > 0 && expH > 0) {
        fillBottomTransform?.setContentSize(expW, expH)
      } else if (bgSize) {
        fillBottomTransform?.setContentSize(bgSize)
      } else {
        fillBottomTransform?.setContentSize(fillBottomFrame.originalSize)
      }
      fillBottomSprite.type = Sprite.Type.FILLED
      fillBottomSprite.fillType = Sprite.FillType.HORIZONTAL
      fillBottomSprite.fillStart = 0
      fillBottomSprite.fillRange = 0
    }

    if (expW > 0 && expH > 0) {
      levelTransform?.setContentSize(UI_EXPBAR_LEVEL_WIDTH, expH)
      levelNode.setPosition(
        expW / 2 - UI_EXPBAR_LEVEL_RIGHT_PADDING + UI_EXPBAR_LEVEL_OFFSET_X,
        UI_EXPBAR_LEVEL_OFFSET_Y,
        0
      )
    } else if (bgSize) {
      levelTransform?.setContentSize(UI_EXPBAR_LEVEL_WIDTH, bgSize.height)
      levelNode.setPosition(
        bgSize.width / 2 - UI_EXPBAR_LEVEL_RIGHT_PADDING + UI_EXPBAR_LEVEL_OFFSET_X,
        UI_EXPBAR_LEVEL_OFFSET_Y,
        0
      )
    }

    this.isInited = true
    this.currentFill = 0
    this.refresh()
  }

  update(dt: number) {
    if (!this.isInited) return
    if (!dt || dt <= 0) return
    const timeScale = director.getScheduler().getTimeScale()
    if (timeScale <= 0) return
    this.refresh(dt * timeScale)
  }

  private refresh(dt: number = 0) {
    if (!this.fillBottomSprite) return
    if (!this.fillBottomSprite.spriteFrame) return

    const player = DataManager.Instance.player
    const stats = player?.getComponent(PlayerStats)
    if (!stats) {
      this.currentFill = 0
      this.fillBottomSprite.fillRange = 0
      if (this.levelLabel) this.levelLabel.string = '1'
      return
    }

    const need = stats.needExp
    const cur = stats.currentExp
    const ratio = need > 0 ? Math.max(0, Math.min(1, cur / need)) : 0
    const speed = Math.max(0, UI_EXPBAR_SMOOTH_SPEED)
    if (speed <= 0) {
      this.currentFill = ratio
    } else {
      const t = Math.max(0, dt || 0)
      this.currentFill += (ratio - this.currentFill) * (1 - Math.exp(-speed * t))
    }
    this.fillBottomSprite.fillRange = this.currentFill
    if (this.levelLabel) this.levelLabel.string = `${stats.level}`
  }

  private calcTopByHealthBar(healthBarNode?: Node) {
    if (!healthBarNode || !healthBarNode.isValid) return UI_EXPBAR_TOP
    const bg = healthBarNode.getChildByName('HpBg')
    const t = bg?.getComponent(UITransform)
    const h = t?.contentSize.height || 0
    if (h <= 0) return UI_EXPBAR_TOP
    return UI_EXPBAR_TOP + h + UI_EXPBAR_GAP
  }
}

export default UiExpBar
