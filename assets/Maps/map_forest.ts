import { IEnemyStats, IEntity, IMap, IPlayerStats } from "."
import { ENTITY_STATE_ENUM, ENTITY_TYPE_ENUM } from "../Scripts/Enums"


const mapInfo =
    [
        [{ src: 34 }, { src: 38 }, { src: 38 }, { src: 38 }, { src: 38 }, { src: 38 }, { src: 38 }, { src: 38 }, { src: 38 }, { src: 38 }, { src: 38 }, { src: 28 }],
        [{ src: 41 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 41 }],
        [{ src: 41 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 41 }],
        [{ src: 41 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 41 }],
        [{ src: 41 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 54 }, { src: 38 }, { src: 38 }, { src: 48 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 41 }],
        [{ src: 41 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 41 }, { src: 52 }, { src: 52 }, { src: 41 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 41 }],
        [{ src: 41 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 41 }, { src: 52 }, { src: 52 }, { src: 41 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 41 }],
        [{ src: 41 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 56 }, { src: 38 }, { src: 38 }, { src: 50 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 41 }],
        [{ src: 41 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 41 }],
        [{ src: 41 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 41 }],
        [{ src: 41 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 52 }, { src: 41 }],
        [{ src: 36 }, { src: 38 }, { src: 38 }, { src: 38 }, { src: 38 }, { src: 38 }, { src: 38 }, { src: 38 }, { src: 38 }, { src: 38 }, { src: 38 }, { src: 30 }]
    ]

const player: IEntity = {
  x: 2,
  y: 8,
  state: ENTITY_STATE_ENUM.IDLE,
  type: ENTITY_TYPE_ENUM.PLAYER,
}

const blueHorn: IEntity = {
  x: 10,
  y: 8,
  state: ENTITY_STATE_ENUM.IDLE,
  type: ENTITY_TYPE_ENUM.BLUEHORN,
}

const greenFuzz: IEntity = {
  x: 10,
  y: 8,
  state: ENTITY_STATE_ENUM.IDLE,
  type: ENTITY_TYPE_ENUM.GREENFUZZ,
}

const mummy: IEntity = {
  x: 10,
  y: 8,
  state: ENTITY_STATE_ENUM.IDLE,
  type: ENTITY_TYPE_ENUM.MUMMY,
}

const obsidianSlicer: IEntity = {
  x: 10,
  y: 8,
  state: ENTITY_STATE_ENUM.IDLE,
  type: ENTITY_TYPE_ENUM.OBSIDIANSLICER,
}

const verdantCyclops: IEntity = {
  x: 10,
  y: 8,
  state: ENTITY_STATE_ENUM.IDLE,
  type: ENTITY_TYPE_ENUM.VERDANTCYCLOPS,
}

const playerStats: IPlayerStats = {
  maxHP: 8,
  attack: 20,
  attackRange: 0.9,
  evasion: 0,
  defense: 0,
  speed: 0.8,
  vampiric: 0,
  vampiricChance: 0,
}

const blueHornStats: IEnemyStats = {
  maxHP: 60,
  attack: 1,
  defense: 0,
}

const greenFuzzStats: IEnemyStats = {
  maxHP: 50,
  attack: 1,
  defense: 0,
}

const mummyStats: IEnemyStats = {
  maxHP: 80,
  attack: 2,
  defense: 0,
}

const obsidianSlicerStats: IEnemyStats = {
  maxHP: 120,
  attack: 2,
  defense: 1,
}

const verdantCyclopsStats: IEnemyStats = {
  maxHP: 180,
  attack: 3,
  defense: 2,
}



const forest: IMap = {
    mapInfo,
    player,
    greenFuzz,
    blueHorn,
    mummy,
    obsidianSlicer,
    verdantCyclops,
    playerStats,
    greenFuzzStats,
    blueHornStats,
    mummyStats,
    obsidianSlicerStats,
    verdantCyclopsStats,
}

// 导出地图配置，供外部模块（如地图渲染、游戏逻辑）导入使用
export default forest
