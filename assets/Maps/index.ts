import { ENTITY_STATE_ENUM, ENTITY_TYPE_ENUM } from "../Scripts/Enums"
import forest from "./map_forest"

// 定义实体接口
export interface IEntity {
  x: number // 实体当前X坐标
  y: number // 实体当前Y坐标
  type: ENTITY_TYPE_ENUM //实体类型
  state: ENTITY_STATE_ENUM // 实体状态
}

// 定义单个瓦片的接口类型，约束瓦片的属性结构
export interface ITile {
  src: number | null // 瓦片资源索引（对应图集里的资源ID，null表示无资源）
}

// 定义玩家属性接口
export interface IPlayerStats {
  maxHP: number
  attack: number
  attackRange: number
  evasion: number
  defense: number
  speed: number
  vampiric: number
  vampiricChance: number
}

// 定义敌人属性接口
export interface IEnemyStats {
  maxHP: number
  attack: number
  defense: number
}

// 定义单个关卡的接口类型，约束关卡的结构
export interface IMap {
  mapInfo: Array<Array<ITile>> // 地图信息：二维数组，每一项是一行瓦片，每行包含多个ITile类型的瓦片
  player: IEntity // 玩家实体信息
  blueHorn: IEntity // 蓝色牛实体信息
  greenFuzz: IEntity // 绿色毛球实体信息
  mummy: IEntity
  obsidianSlicer: IEntity
  verdantCyclops: IEntity
  playerStats: IPlayerStats // 玩家属性信息
  blueHornStats: IEnemyStats // 蓝色牛属性信息
  greenFuzzStats: IEnemyStats // 绿色毛球属性信息
  mummyStats: IEnemyStats
  obsidianSlicerStats: IEnemyStats
  verdantCyclopsStats: IEnemyStats
}

// 整合所有关卡数据，便于统一管理和调用（后续可扩展）
const Maps: Record<string, IMap> = {
    forest,
}

// 导出地图集合，供外部模块（如地图渲染、游戏逻辑）使用
export default Maps
