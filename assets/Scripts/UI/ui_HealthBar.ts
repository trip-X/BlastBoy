import { _decorator, Component, director, Node, Sprite, UITransform, Widget } from 'cc'
import DataManager from '../Runtime/DataManager'
import ResourceManager from '../Runtime/ResourceManager'
import { PlayerStats } from '../Stats/PlayerStats'
import { createUINode } from '../Utils/utils'
const { ccclass } = _decorator

const UI_HEALTHBAR_PATH = 'texture/UI/HealthBar'
const UI_HEALTHBAR_BG = 'bar_bg'
const UI_HEALTHBAR_FILL = 'bar'
const UI_HEALTHBAR_LEFT = 20
const UI_HEALTHBAR_TOP = 20
const UI_HEALTHBAR_WIDTH = 1250
const UI_HEALTHBAR_HEIGHT = 60
const UI_HEALTHBAR_SMOOTH_SPEED = 12

@ccclass('UiHealthBar')
export class UiHealthBar extends Component {
  private fillSprite: Sprite = null
  private currentFill = 1
  private isInited = false

  async init() {
    const widget = this.getComponent(Widget) || this.addComponent(Widget)
    widget.isAlignTop = true
    widget.isAlignLeft = true
    widget.top = UI_HEALTHBAR_TOP
    widget.left = UI_HEALTHBAR_LEFT

    const bgNode = createUINode('HpBg')
    bgNode.setParent(this.node)
    bgNode.setPosition(0, 0)

    const fillNode = createUINode('HpFill')
    fillNode.setParent(this.node)
    fillNode.setPosition(0, 0)

    const bgSprite = bgNode.addComponent(Sprite)
    bgSprite.sizeMode = Sprite.SizeMode.CUSTOM
    bgSprite.trim = false

    const fillSprite = fillNode.addComponent(Sprite)
    fillSprite.sizeMode = Sprite.SizeMode.CUSTOM
    fillSprite.trim = false
    this.fillSprite = fillSprite

    const spriteFrames = await ResourceManager.Instance.loadDir(UI_HEALTHBAR_PATH)
    const bgFrame = spriteFrames.find(v => v.name === UI_HEALTHBAR_BG)
    const fillFrame = spriteFrames.find(v => v.name === UI_HEALTHBAR_FILL)

    if (bgFrame) {
      bgSprite.spriteFrame = bgFrame
      const t = bgNode.getComponent(UITransform)
      const w = UI_HEALTHBAR_WIDTH > 0 ? UI_HEALTHBAR_WIDTH : bgFrame.originalSize.width
      const h = UI_HEALTHBAR_HEIGHT > 0 ? UI_HEALTHBAR_HEIGHT : bgFrame.originalSize.height
      t?.setContentSize(w, h)
    }

    if (fillFrame) {
      fillSprite.spriteFrame = fillFrame
      const t = fillNode.getComponent(UITransform)
      const w = UI_HEALTHBAR_WIDTH > 0 ? UI_HEALTHBAR_WIDTH : fillFrame.originalSize.width
      const h = UI_HEALTHBAR_HEIGHT > 0 ? UI_HEALTHBAR_HEIGHT : fillFrame.originalSize.height
      t?.setContentSize(w, h)
      fillSprite.type = Sprite.Type.FILLED
      fillSprite.fillType = Sprite.FillType.HORIZONTAL
      fillSprite.fillStart = 0
      fillSprite.fillRange = 1
    }

    this.isInited = true
    this.currentFill = 1
    this.refresh(0)
  }

  update(dt: number) {
    if (!this.isInited) return
    if (!dt || dt <= 0) return
    const timeScale = director.getScheduler().getTimeScale()
    if (timeScale <= 0) return
    this.refresh(dt * timeScale)
  }

  private refresh(dt: number = 0) {
    if (!this.fillSprite) return
    if (!this.fillSprite.spriteFrame) return
    const player = DataManager.Instance.player
    const stats = player?.getComponent(PlayerStats)
    if (!stats) {
      this.currentFill = 1
      this.fillSprite.fillRange = 1
      return
    }
    const maxHp = stats.maxHP.getBuffValue()
    const curHp = stats.curHP
    const ratio = maxHp > 0 ? Math.max(0, Math.min(1, curHp / maxHp)) : 0
    const speed = Math.max(0, UI_HEALTHBAR_SMOOTH_SPEED)
    if (speed <= 0) {
      this.currentFill = ratio
    } else {
      const t = Math.max(0, dt || 0)
      this.currentFill += (ratio - this.currentFill) * (1 - Math.exp(-speed * t))
    }
    this.fillSprite.fillRange = this.currentFill
  }
}

export default UiHealthBar
