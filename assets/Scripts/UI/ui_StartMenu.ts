import { _decorator, Component, director, EventTouch, Label, Node, Sprite, TTFFont, UITransform, Widget, Color } from 'cc'
import ResourceManager from '../Runtime/ResourceManager'
import { createUINode } from '../Utils/utils'

const { ccclass } = _decorator

const FONT_URL = 'texture/UI/font/text'

type StartSpriteName = 'start_Bg' | 'startBtn'

@ccclass('UiStartMenu')
export class UiStartMenu extends Component {

  bgOffsetX = 0// 背景偏移量X
  bgOffsetY = 0// 背景偏移量Y

  titleText = 'BLASTER BOY'// 游戏标题文字
  titleOffsetX = -400// 标题偏移量X
  titleOffsetY = 1000// 标题偏移量Y
  titleFontSize = 150// 标题字体大小
  titleColor = new Color(255, 255, 255, 255)// 标题字体颜色

  btnOffsetX = 0// 开始按钮偏移量X
  btnOffsetY = -1000// 开始按钮偏移量Y
  btnScale = 2// 开始按钮缩放比例

  btnLabelOffsetX = -60// 按钮文字偏移量X
  btnLabelOffsetY = 30// 按钮文字偏移量Y
  btnLabelFontSize = 32// 按钮文字大小
  btnLabelColor = new Color(255, 255, 255, 255)// 按钮文字颜色

  start() {
    this.init()
  }

  async init() {
    this.fitToParentSize()

    const spriteFrames = await ResourceManager.Instance.loadDir('texture/UI/Start')
    const getFrame = (name: StartSpriteName) => spriteFrames.find(v => v.name === name) || null

    const bgNode = this.createSpriteNode('StartBg', getFrame('start_Bg'))
    bgNode.setParent(this.node)
    this.stretchToParent(bgNode)

    let textFont: TTFFont | null = null
    try {
      textFont = await ResourceManager.Instance.loadAsset<TTFFont>(FONT_URL, TTFFont as any)
    } catch (e) {
      console.warn('Load textFont error in UiStartMenu')
    }

    const titleNode = createUINode('TitleLabel')
    titleNode.setParent(this.node)
    const titleLabel = this.createLabel(titleNode, textFont, this.titleFontSize, this.titleColor)
    titleLabel.string = this.titleText
    this.alignCenter(titleNode, this.titleOffsetX, this.titleOffsetY)

    const btnNode = this.createSpriteNode('BtnStart', getFrame('startBtn'))
    btnNode.setParent(this.node)
    this.alignCenter(btnNode, this.btnOffsetX, this.btnOffsetY)
    btnNode.setScale(this.btnScale, this.btnScale, 1)
    btnNode.on(Node.EventType.TOUCH_END, this.onClickStart, this)

    const labelNode = createUINode('BtnLabel')
    labelNode.setParent(btnNode)
    const label = this.createLabel(labelNode, textFont, this.btnLabelFontSize, this.btnLabelColor)
    label.string = '开始游戏'
    labelNode.setPosition(this.btnLabelOffsetX, this.btnLabelOffsetY)
  }

  private onClickStart(event: EventTouch) {
    event.propagationStopped = true
    director.loadScene('BattleScene')
  }

  private fitToParentSize() {
    const parentTransform = this.node.parent?.getComponent(UITransform)
    const rootTransform = this.node.getComponent(UITransform)
    if (parentTransform && rootTransform) {
      rootTransform.setContentSize(parentTransform.contentSize)
      rootTransform.setAnchorPoint(0.5, 0.5)
    }
    this.node.setPosition(0, 0)
  }

  private stretchToParent(node: Node) {
    const parentTransform = this.node.getComponent(UITransform)
    const nodeTransform = node.getComponent(UITransform)
    if (parentTransform && nodeTransform) {
      nodeTransform.setContentSize(parentTransform.contentSize)
      nodeTransform.setAnchorPoint(0.5, 0.5)
    }
    node.setPosition(0, 0)
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
}
