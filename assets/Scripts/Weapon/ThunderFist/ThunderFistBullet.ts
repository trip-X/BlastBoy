import { _decorator, Animation, Component, Sprite, UITransform, Vec3 } from 'cc'

const { ccclass } = _decorator

const FALLBACK_LIFETIME = 0.5// 雷击特效的默认生命周期
const HIT_Y_OFFSET = 160// 雷击特效与目标点的垂直偏移量
const EFFECT_WIDTH = 200// 雷击特效的显示宽度
const EFFECT_HEIGHT = 400// 雷击特效的显示高度

@ccclass('ThunderFistBullet')
export class ThunderFistBullet extends Component {
    private _isDestroyScheduled = false

    init(damage: number, speed: number, startPos: Vec3, targetPos: Vec3) {
        // 雷击特效直接落在目标点，不做飞行
        this.node.setWorldPosition(targetPos.x, targetPos.y + HIT_Y_OFFSET, targetPos.z)
        this.applyVisualSize()
        this.playAndAutoDestroy()
    }

    private applyVisualSize() {
        const visualNode = this.node.getChildByName('Visual') || this.node

        const sprite = visualNode.getComponent(Sprite)
        if (sprite) sprite.sizeMode = Sprite.SizeMode.CUSTOM

        const transform = visualNode.getComponent(UITransform) || visualNode.addComponent(UITransform)
        transform.setContentSize(EFFECT_WIDTH, EFFECT_HEIGHT)
        transform.setAnchorPoint(0.5, 0.5)
    }

    private playAndAutoDestroy() {
        let anim = this.getComponent(Animation)
        if (!anim) {
            const visualNode = this.node.getChildByName('Visual')
            if (visualNode) anim = visualNode.getComponent(Animation)
        }

        if (!anim) {
            this.scheduleDestroy(FALLBACK_LIFETIME)
            return
        }

        anim.play()
        const duration = anim.defaultClip && anim.defaultClip.duration > 0 ? anim.defaultClip.duration : FALLBACK_LIFETIME
        this.scheduleDestroy(duration)
    }

    private scheduleDestroy(seconds: number) {
        if (this._isDestroyScheduled) return
        this._isDestroyScheduled = true
        this.scheduleOnce(() => {
            if (this.node && this.node.isValid) this.node.destroy()
        }, Math.max(0.01, seconds))
    }

    onDestroy() {
        this.unscheduleAllCallbacks()
    }
}
