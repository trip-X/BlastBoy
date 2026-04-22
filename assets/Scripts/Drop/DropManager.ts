import { _decorator, Component, instantiate, Node, Prefab, tween, Vec3 } from 'cc'
import DataManager from '../Runtime/DataManager'
import ResourceManager from '../Runtime/ResourceManager'
import { Exp } from './Exp'
import { Life } from './Life'
import { magnet } from './magnet'


const { ccclass } = _decorator

const EXP_PREFAB_PATH_LIST = [
  'texture/Prop/Exp/exp_1',
  'texture/Prop/Exp/exp_2',
  'texture/Prop/Exp/exp_3',
  'texture/Prop/Exp/exp_4',
]
const LIFE_PREFAB_PATH = 'texture/Prop/Drop/life'
const MAGNET_PREFAB_PATH = 'texture/Prop/Drop/magnet'

const EXP_VALUE_LIST = [1, 5, 20, 100]
const EXP_SCALE_LIST = [0.3, 0.3, 0.3, 0.3]
const LIFE_SCALE = 1.7
const MAGNET_SCALE = 0.9

const DROP_LIFE_CHANCE = 0.03
const DROP_MAGNET_CHANCE = 0.07

const SCATTER_RADIUS_MIN = 10// 随机半径最小值
const SCATTER_RADIUS_MAX = 60// 随机半径最大值
const SCATTER_SPEED_MIN = 120// 随机速度最小值
const SCATTER_SPEED_MAX = 240// 随机速度最大值

@ccclass('DropManager')
export class DropManager extends Component {
  private isInited = false
  private expPrefabList: Prefab[] = []
  private lifePrefab: Prefab = null
  private magnetPrefab: Prefab = null

  async init() {
    this.isInited = false
    const prefabList: Prefab[] = []
    for (const path of EXP_PREFAB_PATH_LIST) {
      const prefab = await ResourceManager.Instance.loadPrefab(path)
      prefabList.push(prefab)
    }
    this.expPrefabList = prefabList
    this.lifePrefab = await ResourceManager.Instance.loadPrefab(LIFE_PREFAB_PATH)
    this.magnetPrefab = await ResourceManager.Instance.loadPrefab(MAGNET_PREFAB_PATH)
    this.isInited = true
  }

  // 生成掉落经验
  spawnExp(worldPos: Vec3, totalExp: number) {
    if (!this.isInited) return
    const stage = DataManager.Instance.stage
    if (!stage) return

    let remain = Math.floor(totalExp || 0)
    if (remain <= 0) return

    const localPos = new Vec3()
    stage.inverseTransformPoint(localPos, worldPos)

    for (let i = EXP_VALUE_LIST.length - 1; i >= 0; i--) {
      const value = EXP_VALUE_LIST[i]
      if (value <= 0) continue
      const count = Math.floor(remain / value)
      if (count <= 0) continue
      remain -= count * value

      for (let c = 0; c < count; c++) {
        const prefab = this.expPrefabList[i]
        if (!prefab) continue
        const node = instantiate(prefab)
        node.layer = stage.layer
        stage.addChild(node)
        const scale = EXP_SCALE_LIST[i] ?? 1
        node.setScale(scale, scale, 1)

        const angle = Math.random() * Math.PI * 2
        const radius = SCATTER_RADIUS_MIN + Math.random() * (SCATTER_RADIUS_MAX - SCATTER_RADIUS_MIN)
        const offsetX = Math.cos(angle) * radius
        const offsetY = Math.sin(angle) * radius
        node.setPosition(localPos.x + offsetX, localPos.y + offsetY, localPos.z)

        const speed = SCATTER_SPEED_MIN + Math.random() * (SCATTER_SPEED_MAX - SCATTER_SPEED_MIN)
        const scatterVelocity = new Vec3(Math.cos(angle) * speed, Math.sin(angle) * speed, 0)

        const exp = node.getComponent(Exp) || node.addComponent(Exp)
        exp.init(value, scatterVelocity)
      }
    }
  }

  trySpawnDropItem(worldPos: Vec3) {
    if (!this.isInited) return
    const stage = DataManager.Instance.stage
    if (!stage) return

    const localPos = new Vec3()
    stage.inverseTransformPoint(localPos, worldPos)

    if (Math.random() < DROP_LIFE_CHANCE) {
      this.spawnLife(stage, localPos)
    }
    if (Math.random() < DROP_MAGNET_CHANCE) {
      this.spawnMagnet(stage, localPos)
    }
  }

  private spawnLife(stage: any, localPos: Vec3) {
    if (!this.lifePrefab) return
    const node = instantiate(this.lifePrefab)
    node.layer = stage.layer
    stage.addChild(node)
    node.setPosition(localPos.x, localPos.y, localPos.z)
    node.setScale(LIFE_SCALE, LIFE_SCALE, 1)
    if (!node.getComponent(Life)) node.addComponent(Life)

    const angle = Math.random() * Math.PI * 2
    const radius = SCATTER_RADIUS_MIN + Math.random() * (SCATTER_RADIUS_MAX - SCATTER_RADIUS_MIN)
    const offsetX = Math.cos(angle) * radius
    const offsetY = Math.sin(angle) * radius
    const targetPos = new Vec3(localPos.x + offsetX, localPos.y + offsetY, localPos.z)
    tween(node).to(0.12, { position: targetPos }, { easing: 'quadOut' }).start()
  }

  private spawnMagnet(stage: any, localPos: Vec3) {
    if (!this.magnetPrefab) return
    const node = instantiate(this.magnetPrefab)
    node.layer = stage.layer
    stage.addChild(node)
    node.setPosition(localPos.x, localPos.y, localPos.z)
    node.setScale(MAGNET_SCALE, MAGNET_SCALE, 1)
    if (!node.getComponent(magnet)) node.addComponent(magnet)

    const angle = Math.random() * Math.PI * 2
    const radius = SCATTER_RADIUS_MIN + Math.random() * (SCATTER_RADIUS_MAX - SCATTER_RADIUS_MIN)
    const offsetX = Math.cos(angle) * radius
    const offsetY = Math.sin(angle) * radius
    const targetPos = new Vec3(localPos.x + offsetX, localPos.y + offsetY, localPos.z)
    tween(node).to(0.12, { position: targetPos }, { easing: 'quadOut' }).start()
  }
}
