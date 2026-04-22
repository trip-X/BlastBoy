import { _decorator, Component, Label, resources, Sprite, SpriteFrame, UITransform } from 'cc'
const { ccclass } = _decorator
import { TileManager } from './TileManager'
import ResourceManager from '../Runtime/ResourceManager'
import DataManager from '../Runtime/DataManager'
import { MAP_TYPE_ENUM } from '../Enums'
import { createUINode } from '../Utils/utils'
import { TILE_HEIGHT, TILE_WIDTH } from './TileManager'

@ccclass('TileMapManager')
export class TileMapManager extends Component {
  async init(mapType: MAP_TYPE_ENUM) {
    const spriteFrames = await ResourceManager.Instance.loadDir(`texture/Bg/${mapType}/${mapType}`)
    const { mapInfo } = DataManager.Instance // 全局数据管理器获取地图信息
    DataManager.Instance.tileInfo = []
    for (let i = 0; i < mapInfo.length; i++) {
      const column = mapInfo[i]
      DataManager.Instance.tileInfo[i] = []
      for (let j = 0; j < column.length; j++) {
        const item = column[j]
        if (item.src === null) {
          continue
        }

        let number = item.src
        const imgSrc = `${mapType}_${number}` // 拼接精灵帧名称
        const node = createUINode()
        const spriteFrame = spriteFrames.find(v => v.name === imgSrc) || spriteFrames[0] // 从加载的精灵帧数组中匹配名称
        const tileManager = node.addComponent(TileManager)
        tileManager.init(spriteFrame, i, j) // 初始化瓦片
        DataManager.Instance.tileInfo[i][j] = tileManager
        node.setParent(this.node)
      }
    }

    // 地图尺寸：width = 列数 * TILE_WIDTH，height = 行数 * TILE_HEIGHT
    const mapWidth = (mapInfo[0]?.length || 0) * TILE_WIDTH
    const mapHeight = (mapInfo.length || 0) * TILE_HEIGHT
    const transform = this.getComponent(UITransform)
    transform.setContentSize(mapWidth, mapHeight)
    transform.setAnchorPoint(0.5, 0.5)
    this.node.setPosition(-mapWidth / 2, -mapHeight / 2)
  }
}
