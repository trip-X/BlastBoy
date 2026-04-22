import { _decorator, Color, Component, director, HorizontalTextAlignment, Label, Node, TTFFont, UITransform, VerticalTextAlignment, Widget } from 'cc'
import ResourceManager from '../Runtime/ResourceManager'
import { createUINode } from '../Utils/utils'
const { ccclass } = _decorator

const UI_TEXT_FONT_URL = 'texture/UI/font/text'

const UI_TIMER_TOP = 250// 定时器顶部偏移量
const UI_TIMER_FONT_SIZE = 56// 定时器字体大小
const UI_TIMER_COLOR = new Color(255, 255, 255, 255)// 定时器字体颜色
const UI_TIMER_WIDTH = 320// 定时器宽度
const UI_TIMER_HEIGHT = 80// 定时器高度

@ccclass('UiTimer')
export class UiTimer extends Component {
  private timeLabel: Label = null
  private elapsedSeconds = 0
  private displaySeconds = -1
  private isInited = false

  async init() {
    const widget = this.getComponent(Widget) || this.addComponent(Widget)
    widget.isAlignTop = true
    widget.isAlignHorizontalCenter = true
    widget.top = UI_TIMER_TOP
    widget.horizontalCenter = 0

    const rootTransform = this.getComponent(UITransform)
    rootTransform?.setAnchorPoint(0.5, 1)
    if (UI_TIMER_WIDTH > 0 && UI_TIMER_HEIGHT > 0) {
      rootTransform?.setContentSize(UI_TIMER_WIDTH, UI_TIMER_HEIGHT)
    }

    const labelNode = createUINode('TimeLabel')
    labelNode.setParent(this.node)
    labelNode.setPosition(0, 0)

    const labelTransform = labelNode.getComponent(UITransform)
    labelTransform?.setAnchorPoint(0.5, 1)
    if (UI_TIMER_WIDTH > 0 && UI_TIMER_HEIGHT > 0) {
      labelTransform?.setContentSize(UI_TIMER_WIDTH, UI_TIMER_HEIGHT)
    }

    const timeLabel = labelNode.addComponent(Label)
    timeLabel.string = '00:00'
    timeLabel.fontSize = UI_TIMER_FONT_SIZE
    timeLabel.color = UI_TIMER_COLOR
    timeLabel.horizontalAlign = HorizontalTextAlignment.CENTER
    timeLabel.verticalAlign = VerticalTextAlignment.CENTER
    this.timeLabel = timeLabel

    try {
      const textFont = await ResourceManager.Instance.loadAsset<TTFFont>(UI_TEXT_FONT_URL, TTFFont as any)
      if (textFont) {
        timeLabel.font = textFont
        const anyLabel = timeLabel as any
        if (anyLabel.useSystemFont != null) anyLabel.useSystemFont = false
      }
    } catch (e) {
    }

    this.elapsedSeconds = 0
    this.displaySeconds = -1
    this.isInited = true
    this.refresh(true)
  }

  reset() {
    this.elapsedSeconds = 0
    this.displaySeconds = -1
    this.refresh(true)
  }

  update(dt: number) {
    if (!this.isInited) return
    if (!dt || dt <= 0) return
    const timeScale = director.getScheduler().getTimeScale()
    if (timeScale <= 0) return
    this.elapsedSeconds += dt * timeScale
    this.refresh(false)
  }

  private refresh(force: boolean) {
    if (!this.timeLabel) return

    const totalSeconds = Math.max(0, Math.floor(this.elapsedSeconds))
    if (!force && totalSeconds === this.displaySeconds) return
    this.displaySeconds = totalSeconds

    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    const m = this.pad2(minutes)
    const s = this.pad2(seconds)
    this.timeLabel.string = `${m}:${s}`
  }

  private pad2(v: number) {
    const n = Math.max(0, Math.floor(v))
    if (n < 10) return `0${n}`
    return `${n}`
  }

  // 新增：向外暴露获取当前存活时间的字符串（供结算界面调用）
  public getSurvivalTimeStr(): string {
    const totalSeconds = Math.max(0, Math.floor(this.elapsedSeconds))
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${this.pad2(minutes)}:${this.pad2(seconds)}`
  }
}

export default UiTimer
