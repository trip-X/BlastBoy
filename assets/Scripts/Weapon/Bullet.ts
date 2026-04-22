import { _decorator, Component, Vec3, Contact2DType, Collider2D, IPhysics2DContact, BoxCollider2D, RigidBody2D, ERigidBody2DType, Size, PhysicsSystem2D, Graphics, Node, Color, UITransform } from 'cc'
import { COLLIDER_TYPE_ENUM } from '../Enums'

const { ccclass, property } = _decorator



@ccclass('Bullet')
export abstract class Bullet extends Component {
    protected damage: number = 0
    protected speed: number = 0
    protected direction: Vec3 = new Vec3()
    protected graphicLine: Graphics = null // 调试用：绘制碰撞框
    protected collider: BoxCollider2D = null // 碰撞器组件
    protected visualWidth: number = -1
    protected visualHeight: number = -1
    protected colliderWidth: number = -1
    protected colliderHeight: number = -1
    protected lifeTimer: number = -1
    protected isDrawCollider: boolean = false


    /**
     * 初始化子弹
     * @param damage 伤害值
     * @param speed 飞行速度
     * @param startPos 起始位置
     * @param targetPos 目标位置
     */
    init(damage: number, speed: number, startPos: Vec3, targetPos: Vec3) {
        this.damage = damage
        this.speed = speed
        this.node.setWorldPosition(startPos)

        const visualNode = this.node.getChildByName('Visual') || this.node
        if (visualNode !== this.node) visualNode.setPosition(0, 0, 0)// 确保视觉节点在子弹中心

        const transform = visualNode.getComponent(UITransform) || visualNode.addComponent(UITransform)
        transform.setContentSize(this.visualWidth, this.visualHeight)
        transform.setAnchorPoint(0.5, 0.5)

        this.initPhysics() // 初始化物理组件
        this.updateDirectionAndRotation(startPos, targetPos) // 更新子弹方向和旋转
    }

    private initPhysics() {
        if (!PhysicsSystem2D.instance.enable) PhysicsSystem2D.instance.enable = true// 确保物理引擎已开启

        let rb = this.getComponent(RigidBody2D)
        if (!rb) rb = this.addComponent(RigidBody2D)
        rb.type = ERigidBody2DType.Kinematic // 运动学类型，不受力影响但可以移动
        rb.enabledContactListener = true    // 必须开启，否则不会派发 contact 事件
        rb.gravityScale = 0

        // 2. 确保有 BoxCollider2D
        this.collider = this.getComponent(BoxCollider2D)
        if (!this.collider) this.collider = this.addComponent(BoxCollider2D)
        this.collider.sensor = true   // 传感器模式，只检测重叠不产生物理推挤
        this.collider.size = new Size(this.colliderWidth, this.colliderHeight)
        this.collider.tag = COLLIDER_TYPE_ENUM.BULLET
        this.collider.apply()  // 应用修改了以后才能生效，否则不会派发 contact 事件

        // 3. 注册碰撞回调
        this.collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this)
        this.collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this)
    }

    onDestroy() {
        this.collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this)
    }

    protected drawCollider() {
        if (!this.isDrawCollider) return

        // 延迟创建绘图节点，避免重复创建
        if (!this.graphicLine) {
            let graphicNode = this.node.getChildByName('GraphicCollider')
            if (!graphicNode) {
                graphicNode = new Node('GraphicCollider')
                graphicNode.layer = this.node.layer
                graphicNode.setPosition(0, 0)
                this.node.addChild(graphicNode)
                // 确保调试节点在最上层
                graphicNode.setSiblingIndex(this.node.children.length - 1)
            }
            this.graphicLine = graphicNode.getComponent(Graphics) || graphicNode.addComponent(Graphics)
            this.graphicLine.lineWidth = 5 // 增加线宽，更明显
            this.graphicLine.strokeColor = Color.YELLOW // 改用明亮的黄色，更易观察
        }

        const g = this.graphicLine
        g.clear()

        const collider = this.collider || this.getComponent(BoxCollider2D)
        if (collider) {
            const size = collider.size
            const offset = collider.offset
            // 绘制矩形框：左下角起始点 (x, y)，宽，高
            g.rect(offset.x - size.width / 2, offset.y - size.height / 2, size.width, size.height)
            g.stroke()
        }
    }

    // 更新子弹方向和旋转
    abstract updateDirectionAndRotation(startPos: Vec3, targetPos: Vec3): void

    // 碰撞回调
    abstract onBeginContact(self: Collider2D, other: Collider2D, contact: IPhysics2DContact | null): void

}
