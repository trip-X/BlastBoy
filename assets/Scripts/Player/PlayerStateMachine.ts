import { _decorator, AnimationClip, Animation } from 'cc'
import { getInitParamsTrigger, StateMachine } from '../Base/StateMachine'
import { ENTITY_STATE_ENUM, PARAMS_NAME_ENUM } from '../Enums'
import { EntityManager } from '../Base/EntityManager'
import State, { ANIMATION_SPEED } from '../Base/State'
const { ccclass, property } = _decorator

const BASE_URL = 'texture/Player' // 状态机动画资源路径


@ccclass('PlayerStateMachine')
export class PlayerStateMachine extends StateMachine {
  // 异步初始化方法：初始化动画组件、参数、状态，并等待所有资源加载完成
  async init() {
    this.animationComponent = this.addComponent(Animation)
    this.initParams() // 初始化所有状态实例
    this.initStateMachines() // 初始化所有状态实例
    this.initAnimationEvent()
    await Promise.all(this.waitingList) // 等待waitingList中所有资源加载完成（并行加载，效率最高）
  }

  // 初始化状态机参数：注册所有需要的参数并设置初始值
  initParams() {
    this.params.set(PARAMS_NAME_ENUM.IDLE, getInitParamsTrigger())
    this.params.set(PARAMS_NAME_ENUM.MOVE, getInitParamsTrigger())
    this.params.set(PARAMS_NAME_ENUM.HURT, getInitParamsTrigger())
    this.params.set(PARAMS_NAME_ENUM.DEAD, getInitParamsTrigger())
  }

  // 初始化状态集合：创建所有状态实例并加入stateMachines
  initStateMachines() {
    this.stateMachines.set(PARAMS_NAME_ENUM.IDLE, new State(this, `${BASE_URL}/Idle`, AnimationClip.WrapMode.Loop))
    this.stateMachines.set(PARAMS_NAME_ENUM.MOVE, new State(this, `${BASE_URL}/Move`, AnimationClip.WrapMode.Loop))
    this.stateMachines.set(PARAMS_NAME_ENUM.HURT, new State(this, `${BASE_URL}/Hurt`, AnimationClip.WrapMode.Default, ANIMATION_SPEED,
      [
        { frame: -1, func: 'setCanChangeState', params: [true] }
      ]))
    this.stateMachines.set(PARAMS_NAME_ENUM.DEAD, new State(this, `${BASE_URL}/Dead`, AnimationClip.WrapMode.Default, ANIMATION_SPEED))
  }

  // 初始化动画事件:监听动画播放完成事件
  initAnimationEvent() {
    // 监听Animation组件的FINISHED事件（动画播放完成时触发）
    this.animationComponent.on(Animation.EventType.FINISHED, () => {
      const name = this.animationComponent.defaultClip.name // 获取当前播放的动画剪辑名称
      const whiteList = ['Hurt'] // 播放完成后切回IDLE
      if (whiteList.some(v => name.includes(v))) {
        this.node.getComponent(EntityManager).changeState(ENTITY_STATE_ENUM.IDLE) // 触发IDLE状态（切回待机动画）
      }
    })
  }

  // 状态机核心运行逻辑：根据参数值判断并切换状态
  run() {
    switch (
    this.currentState // 用读取访问器读取当前状态State示例，以作为后续Switch后续判断变量
    ) {
      case this.stateMachines.get(PARAMS_NAME_ENUM.IDLE):
      case this.stateMachines.get(PARAMS_NAME_ENUM.MOVE):
      case this.stateMachines.get(PARAMS_NAME_ENUM.HURT):
      case this.stateMachines.get(PARAMS_NAME_ENUM.DEAD):
        if (this.params.get(PARAMS_NAME_ENUM.IDLE).value) {
          this.currentState = this.stateMachines.get(PARAMS_NAME_ENUM.IDLE)
        } else if (this.params.get(PARAMS_NAME_ENUM.DEAD).value) {
          this.currentState = this.stateMachines.get(PARAMS_NAME_ENUM.DEAD)
        } else if (this.params.get(PARAMS_NAME_ENUM.MOVE).value) {
          this.currentState = this.stateMachines.get(PARAMS_NAME_ENUM.MOVE)
        } else if (this.params.get(PARAMS_NAME_ENUM.HURT).value) {
          this.currentState = this.stateMachines.get(PARAMS_NAME_ENUM.HURT)
        } else {
          this.currentState = this.currentState
        }
        break
      default:
        this.currentState = this.stateMachines.get(PARAMS_NAME_ENUM.IDLE)
        break
    }
  }
}
