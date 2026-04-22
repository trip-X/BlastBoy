import { _decorator, Component, director, Node, UITransform, Vec3, math } from 'cc'
import DataManager from '../Runtime/DataManager'
import { TILE_HEIGHT, TILE_WIDTH } from '../Tile/TileManager'
const { ccclass, property } = _decorator

@ccclass('ui_Camera')
export class ui_Camera extends Component {
    @property
    followLerp = 0.5// 跟随平滑系数（0~1），越小越平滑，越大越硬跟随


    // 不移动 Camera 节点，而是移动 stage
    private stage: Node = null
    // 复用临时向量，避免 update 里频繁 new（减少 GC 抖动）
    private tmpTarget = new Vec3()
    private tmpPos = new Vec3()

    start() {
        this.stage = DataManager.Instance.stage || null
    }

    update(dt: number) {
        if (!dt || dt <= 0) return
        const timeScale = director.getScheduler().getTimeScale()
        if (timeScale <= 0) return
        const scaledDt = dt * timeScale

        const dmStage = DataManager.Instance.stage || null
        if (!this.stage || !this.stage.isValid || (dmStage && dmStage.isValid && dmStage !== this.stage)) {
            this.stage = dmStage
        }
        if (!this.stage || !this.stage.isValid) return

        // 玩家节点由 BattleManager.generatePlayer() 创建，并写入 DataManager.Instance.player
        // 没有玩家时不跟随，避免空引用报错
        const player = DataManager.Instance.player
        if (!player || !player.node || !player.node.isValid) return

        // 视口大小（通常就是 Canvas 的尺寸，当前定稿为 1280x720）
        // 说明：这里用 UITransform.contentSize 获取实际尺寸，避免写死
        const viewTransform = this.node.getComponent(UITransform)
        const viewW = viewTransform?.contentSize.width || 0
        const viewH = viewTransform?.contentSize.height || 0

        // 地图像素尺寸 = 行列数 * 单块瓦片像素尺寸
        // 注意：TILE_WIDTH / TILE_HEIGHT 是你现有 TileManager 里定义的瓦片像素尺寸
        const mapW = DataManager.Instance.mapColumnCount * TILE_WIDTH
        const mapH = DataManager.Instance.mapRowCount * TILE_HEIGHT

        // stage 的可滚动范围（以地图中心为(0,0) 的坐标系计算）
        // - 当地图比屏幕大：maxX/maxY 为正，允许滚动
        // - 当地图比屏幕小：maxX/maxY = 0，stage 固定不动（避免把地图滚出屏幕）
        const maxX = Math.max(0, mapW / 2 - viewW / 2)
        const maxY = Math.max(0, mapH / 2 - viewH / 2)

        // 让“玩家看起来在屏幕中心”的核心：stage 反向移动
        // - 玩家往右走（p.x 增大），stage 往左挪（targetX = -p.x），玩家就会被“镜头”拉回中心
        const p = player.node.position
        let targetX = -p.x
        let targetY = -p.y

        // 边界夹紧：不允许把视口滚出地图范围
        // 例：targetX 想继续往左，但已经到最左边了，就 clamp 在 -maxX
        targetX = math.clamp(targetX, -maxX, maxX)
        targetY = math.clamp(targetY, -maxY, maxY)
        this.tmpTarget.set(targetX, targetY, this.stage.position.z)

        // followLerp <= 0 时，立即跟随（不做平滑）
        // 这对调试很有用：可以先确认“跟随 + 边界夹紧”正确，再调平滑参数
        if (this.followLerp <= 0) {
            this.stage.setPosition(this.tmpTarget)
            return
        }

        // 把 followLerp 转成“与帧率无关”的插值系数 t
        // - dt*60：把不同帧率统一到“60fps等效”的插值力度
        // - 结果：不同机器帧率下手感更一致
        const t = math.clamp01(1 - Math.pow(1 - this.followLerp, scaledDt * 60))

        // Vec3.lerp(out, a, b, t)：out = a*(1-t) + b*t
        // 这里用临时 tmpPos 作为 out，避免每帧创建新 Vec3
        Vec3.lerp(this.tmpPos, this.stage.position, this.tmpTarget, t)
        this.stage.setPosition(this.tmpPos)
    }
}
