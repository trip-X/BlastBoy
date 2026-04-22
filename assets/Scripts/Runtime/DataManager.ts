import { Node } from 'cc'
import { ITile } from '../../Maps'
import Singleton from '../Base/Singleton'
import { PlayerManager } from '../Player/PlayerManager'
import { TileManager } from '../Tile/TileManager'
import { BlueHornManager } from '../Enemy/BlueHron/BlueHornManager'
import type { DropManager } from '../Drop/DropManager'

export default class DataManager extends Singleton {
  static DataManager: any
  // 静态getter语法糖：简化单例实例的获取
  static get Instance() {
    return super.GetInstance<DataManager>()
  }

  mapInfo: Array<Array<ITile>>
  tileInfo: Array<Array<TileManager>>
  mapRowCount: number = 0
  mapColumnCount: number = 0
  stage: Node
  player: PlayerManager
  blueHorn: BlueHornManager
  dropManager: DropManager
  
  // 新增：全局击杀数量统计
  killCount: number = 0

  // 重置方法
  reset() {
    this.mapInfo = []
    this.tileInfo = []
    this.mapRowCount = 0
    this.mapColumnCount = 0
    this.stage = null
    this.player = null
    this.blueHorn = null
    this.dropManager = null
    
    // 重置时清零击杀数
    this.killCount = 0
  }
  
  // 新增：增加击杀数量
  addKillCount(count: number = 1) {
    this.killCount += count
  }
}
