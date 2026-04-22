import { _decorator, Component, Node, UITransform, Widget } from 'cc';
import { createUINode } from '../Utils/utils';
import { TileMapManager } from '../Tile/TileMapManager';
import { MAP_TYPE_ENUM } from '../Enums';
import Maps, { IMap } from '../../Maps';
import DataManager from '../Runtime/DataManager';
import { PlayerManager } from '../Player/PlayerManager';
import { WeaponManager } from '../Weapon/WeaponManager';
import { UiCtrl } from '../UI/ui_Ctrl';
import { UiHealthBar } from '../UI/ui_HealthBar';
import UiExpBar from '../UI/ui_ExpBar'
import UiTimer from '../UI/ui_Timer'
import { UiPause } from '../UI/ui_Pause'
import { UiGameOver } from '../UI/ui_GameOver'
import UiUpgrade from '../UI/ui_Upgrade'
import { DropManager } from '../Drop/DropManager';
import WaveSpawner from './WaveSpawner'
import { BlueHornManager } from '../Enemy/BlueHron/BlueHornManager';
import { GreenFuzzManager } from '../Enemy/GreenFuzz/GreenFuzzManager';
import { MummyManager } from '../Enemy/Mummy/MummyManager';
import { ObsidianSlicerManager } from '../Enemy/ObsidianSlicer/ObsidianSlicerManager';
import { VerdantCyclopsManager } from '../Enemy/VerdantCyclops/VerdantCyclopsManager';
import GameManager from '../Runtime/GameManager';
const { ccclass, property } = _decorator;

@ccclass('BattleManager')
export class BattleManager extends Component {
    stage: Node // 战斗场景节点
    map: IMap // 地图信息
    start() {
        GameManager.Instance.registerBattleManager(this)
        this.generateStage()
        this.init()
    }

    async init() {
        const map = Maps[MAP_TYPE_ENUM.FOREST] // 获取地图信息
        if (map) {
            this.clearMap()
            this.map = map
            // 将地图信息同步到全局数据管理器
            DataManager.Instance.mapInfo = this.map.mapInfo
            DataManager.Instance.mapRowCount = this.map.mapInfo.length || 0
            DataManager.Instance.mapColumnCount = this.map.mapInfo[0]?.length || 0

            await Promise.all([
                this.generateTileMap(),
                this.generateWaveSpawner(),
                this.generateDropManager(),
                this.generatePlayer(),
                this.generateHealthBar(),
                this.generateExpBar(),
                this.generateTimer(),
                this.generateJoystick(),
                this.generatePause(),
                this.generateUpgrade(),
                this.generateGameOver()
            ])
        }
    }

    // 生成战斗场景
    generateStage() {
        this.stage = createUINode('Stage')
        this.stage.setParent(this.node)
        const transform = this.stage.getComponent(UITransform)
        transform && transform.setAnchorPoint(0.5, 0.5)
        this.stage.setPosition(0, 0)
        DataManager.Instance.stage = this.stage
    }

    // 生成掉落管理器
    async generateDropManager() {
        const dropNode = createUINode('DropManager')
        dropNode.setParent(this.stage)
        dropNode.setPosition(0, 0)
        const dropManager = dropNode.addComponent(DropManager)
        await dropManager.init()
        DataManager.Instance.dropManager = dropManager
    }

    // 生成瓦片地图
    async generateTileMap() {
        const tileMap = createUINode()
        tileMap.setParent(this.stage)

        const tileMapManager = tileMap.addComponent(TileMapManager)
        await tileMapManager.init(MAP_TYPE_ENUM.FOREST)
    }

    // 清除地图
    clearMap() {
        this.stage.destroyAllChildren()
        DataManager.Instance.reset()
        DataManager.Instance.stage = this.stage
    }

    // 生成角色
    async generatePlayer() {
        const player = createUINode()
        player.setParent(this.stage)
        const playerManager = player.addComponent(PlayerManager)
        const centerX = (DataManager.Instance.mapColumnCount - 1) / 2
        const centerY = (DataManager.Instance.mapRowCount - 1) / 2
        await playerManager.init({ ...this.map.player, x: centerX, y: centerY }, this.map.playerStats)
        player.addComponent(WeaponManager)
        DataManager.Instance.player = playerManager
    }

    async generateWaveSpawner() {
        const spawnerNode = createUINode('WaveSpawner')
        spawnerNode.setParent(this.stage)
        spawnerNode.setPosition(0, 0)
        const spawner = spawnerNode.addComponent(WaveSpawner)
        await spawner.init(this.map)
    }

    async generateBlueHron() {
        const blueHron = createUINode()
        blueHron.setParent(this.stage)
        const blueHornManager = blueHron.addComponent(BlueHornManager)
        await blueHornManager.init(this.map.blueHorn, this.map.blueHornStats)
        DataManager.Instance.blueHorn = blueHornManager
    }

    async generateGreenFuzz() {
        const greenFuzz = createUINode()
        greenFuzz.setParent(this.stage)
        const greenFuzzManager = greenFuzz.addComponent(GreenFuzzManager)
        await greenFuzzManager.init(this.map.greenFuzz, this.map.greenFuzzStats)
    }

    async generateMummy() {
        const mummy = createUINode()
        mummy.setParent(this.stage)
        const mummyManager = mummy.addComponent(MummyManager)
        await mummyManager.init(this.map.mummy, this.map.mummyStats)
    }

    async generateObsidianSlicer() {
        const obsidianSlicer = createUINode()
        obsidianSlicer.setParent(this.stage)
        const obsidianSlicerManager = obsidianSlicer.addComponent(ObsidianSlicerManager)
        await obsidianSlicerManager.init(this.map.obsidianSlicer, this.map.obsidianSlicerStats)
    }

    async generateVerdantCyclops() {
        const verdantCyclops = createUINode()
        verdantCyclops.setParent(this.stage)
        const verdantCyclopsManager = verdantCyclops.addComponent(VerdantCyclopsManager)
        await verdantCyclopsManager.init(this.map.verdantCyclops, this.map.verdantCyclopsStats)
    }

    // 生成并配置摇杆
    async generateJoystick() {
        const ctrlBgNode = createUINode('CtrlBg')
        ctrlBgNode.setParent(this.node) // 挂在 Canvas（BattleManager所在节点）下，作为UI层

        const widget = ctrlBgNode.addComponent(Widget)
        widget.isAlignBottom = true
        widget.isAlignHorizontalCenter = true
        widget.bottom = 200
        widget.horizontalCenter = 0 // 水平居中

        const uiCtrl = ctrlBgNode.addComponent(UiCtrl)
        await uiCtrl.init()
    }

    // 生成健康条
    async generateHealthBar() {
        const healthBarNode = createUINode('HealthBar')
        healthBarNode.setParent(this.node)
        const uiHealthBar = healthBarNode.addComponent(UiHealthBar)
        await uiHealthBar.init()
    }

    // 生成经验条
    async generateExpBar() {
        const expBarNode = createUINode('ExpBar')
        expBarNode.setParent(this.node)

        const healthBarNode = this.node.getChildByName('HealthBar')
        const uiExpBar = expBarNode.addComponent(UiExpBar)
        await uiExpBar.init(healthBarNode)
    }

    async generateTimer() {
        const timerNode = createUINode('Timer')
        timerNode.setParent(this.node)
        const uiTimer = timerNode.addComponent(UiTimer)
        await uiTimer.init()
    }

    async generatePause() {
        const pauseNode = createUINode('Pause')
        pauseNode.setParent(this.node)
        const uiPause = pauseNode.addComponent(UiPause)
        await uiPause.init()
    }

    async generateUpgrade() {
        const upgradeNode = createUINode('Upgrade')
        upgradeNode.setParent(this.node)
        const uiUpgrade = upgradeNode.addComponent(UiUpgrade)
        await uiUpgrade.init()
        uiUpgrade.openStart()
    }

    async generateGameOver() {
        const gameOverNode = createUINode('UI_GameOver')
        gameOverNode.setParent(this.node)
        const uiGameOver = gameOverNode.addComponent(UiGameOver)
        await uiGameOver.init()
    }

    // 重新开始战斗
    async restart() {
        const children = this.node.children.slice()// 遍历节点时不能直接修改节点数组，否则会导致遍历错误
        for (const child of children) {
            if (!child || !child.isValid) continue
            if (child.name === 'Camera') continue
            child.removeFromParent()
            child.destroy()
        }
        this.stage = null
        DataManager.Instance.reset()
        this.generateStage()
        await this.init()
    }
}


