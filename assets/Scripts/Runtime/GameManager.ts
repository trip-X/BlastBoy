import { Animation, director, Node } from 'cc'
import Singleton from '../Base/Singleton'
import type { BattleManager } from '../Scene/BattleManager'
import DataManager from './DataManager'

export default class GameManager extends Singleton {
  static get Instance() {
    return super.GetInstance<GameManager>()
  }

  private isPaused = false
  private battleManager: BattleManager | null = null

  // 暂停游戏
  pause(stageNode?: Node) {
    this.applyPause(true, stageNode)
  }

  // 恢复游戏
  resume(stageNode?: Node) {
    this.applyPause(false, stageNode)
  }

  // 重新开始游戏
  async restartGame() {
    this.applyPause(false, undefined, true)
    const bm = this.battleManager
    if (!bm) return
    await bm.restart()
  }
  
  exitGame() {
    this.applyPause(false, undefined, true)
    DataManager.Instance.reset()
    director.loadScene('StartScene')
  }

  // 切换暂停状态
  togglePause(stageNode?: Node) {
    this.applyPause(!this.isPaused, stageNode)
  }

  // 注册战斗管理器
  registerBattleManager(battleManager: BattleManager) {
    this.battleManager = battleManager
  }

  // 获取游戏是否暂停
  getIsPaused() {
    return this.isPaused
  }

  // 应用暂停状态
  // @param paused 是否暂停
  // @param stageNode 游戏场景节点
  // @param force 是否强制应用暂停状态
  private applyPause(paused: boolean, stageNode?: Node, force: boolean = false) {
    if (!force && this.isPaused === paused) return
    this.isPaused = paused
    director.getScheduler().setTimeScale(paused ? 0 : 1)

    const stage = stageNode || DataManager.Instance.stage
    if (!stage || !stage.isValid) return

    const animList = stage.getComponentsInChildren(Animation)
    for (const anim of animList) {
      if (!anim) continue
      if (paused) anim.pause()
      else anim.resume()
    }
  }
}
