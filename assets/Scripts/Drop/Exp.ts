import { _decorator, Component, director, Vec3 } from 'cc'
import DataManager from '../Runtime/DataManager'
import PlayerStats from '../Stats/PlayerStats'

const { ccclass } = _decorator

const SCATTER_TIME = 0.25
const SCATTER_DAMPING = 0.9

const DEFAULT_MAGNET_RADIUS = 220
const DEFAULT_PICKUP_RADIUS = 45
const DEFAULT_MAGNET_SPEED = 900
const FORCE_MAGNET_SPEED_MULT = 2.5

@ccclass('Exp')
export class Exp extends Component {
  private isInited = false
  private expValue = 1

  private scatterVelocity = new Vec3()
  private scatterTimer = 0

  private magnetRadius = DEFAULT_MAGNET_RADIUS
  private pickupRadius = DEFAULT_PICKUP_RADIUS
  private magnetSpeed = DEFAULT_MAGNET_SPEED
  private isForceMagnet = false

  init(expValue: number, scatterVelocity?: Vec3) {
    this.expValue = Math.max(1, Math.floor(expValue || 0))
    if (scatterVelocity) {
      this.scatterVelocity.set(scatterVelocity.x, scatterVelocity.y, scatterVelocity.z)
      this.scatterTimer = SCATTER_TIME
    } else {
      this.scatterVelocity.set(0, 0, 0)
      this.scatterTimer = 0
    }
    this.isForceMagnet = false
    this.isInited = true
  }

  forceMagnet() {
    this.isForceMagnet = true
  }

  update(dt: number) {
    if (!this.isInited) return
    if (!dt || dt <= 0) return
    const timeScale = director.getScheduler().getTimeScale()
    if (timeScale <= 0) return
    const scaledDt = dt * timeScale

    const pos = this.node.position

    if (this.scatterTimer > 0) {
      this.scatterTimer -= scaledDt
      this.node.setPosition(
        pos.x + this.scatterVelocity.x * scaledDt,
        pos.y + this.scatterVelocity.y * scaledDt,
        pos.z
      )

      const damp = Math.pow(SCATTER_DAMPING, scaledDt * 60)
      this.scatterVelocity.x *= damp
      this.scatterVelocity.y *= damp
    }

    const player = DataManager.Instance.player
    if (!player || !player.node) return

    const playerPos = player.node.position
    const curPos = this.node.position
    const dx = playerPos.x - curPos.x
    const dy = playerPos.y - curPos.y
    const distSq = dx * dx + dy * dy

    const pickupR = this.pickupRadius
    if (distSq <= pickupR * pickupR) {
      const stats = player.node.getComponent(PlayerStats)
      stats?.addExp(this.expValue)
      this.node.destroy()
      return
    }

    const magnetR = this.magnetRadius
    if (this.isForceMagnet || distSq <= magnetR * magnetR) {
      if (distSq <= 0.000001) return
      const invLen = 1 / Math.sqrt(distSq)
      const speed = this.isForceMagnet ? this.magnetSpeed * FORCE_MAGNET_SPEED_MULT : this.magnetSpeed
      const step = speed * scaledDt
      this.node.setPosition(
        curPos.x + dx * invLen * step,
        curPos.y + dy * invLen * step,
        curPos.z
      )
    }
  }
}
