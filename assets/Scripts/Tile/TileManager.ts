import { _decorator, Component, Node, Sprite, SpriteFrame, UITransform } from 'cc'

const { ccclass, property } = _decorator

// 瓦片规格常量
export const TILE_WIDTH = 500
export const TILE_HEIGHT = 500

@ccclass('TileManager')
export class TileManager extends Component {

  init(spriteFrame: SpriteFrame, i: number, j: number) {
    const sprite = this.addComponent(Sprite) // 给节点添加Sprite组件：Cocos中用于显示2D图片的核心组件
    sprite.spriteFrame = spriteFrame
    const transform = this.getComponent(UITransform) // 给节点添加UITransform组件：UI元素的尺寸、位置、锚点等变换管理组件
    transform.setContentSize(TILE_WIDTH, TILE_HEIGHT) // 设置瓦片尺寸
    this.node.setPosition(i * TILE_WIDTH, j * TILE_HEIGHT)
  }
}
