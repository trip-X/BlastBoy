import { _decorator, AnimationClip, Animation } from 'cc'
import { getInitParamsTrigger, StateMachine } from '../../Base/StateMachine'
import { ENTITY_STATE_ENUM, PARAMS_NAME_ENUM } from '../../Enums'
import State, { ANIMATION_SPEED } from '../../Base/State'
import { EntityManager } from '../../Base/EntityManager'

const { ccclass } = _decorator

const BASE_URL = 'texture/Enemy/BlueHorn' // 状态机动画资源路径


@ccclass('BlueHornStateMachine')
export class BlueHornStateMachine extends StateMachine {
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
    this.params.set(PARAMS_NAME_ENUM.ATTACK, getInitParamsTrigger())
    this.params.set(PARAMS_NAME_ENUM.DEAD, getInitParamsTrigger())
  }

  // 初始化状态集合：创建所有状态实例并加入stateMachines
  // 动画事件数组中的func:会在本节点上搜索同名方法，动画事件触发时调用该方法
  initStateMachines() {
    this.stateMachines.set(PARAMS_NAME_ENUM.IDLE, new State(this, `${BASE_URL}/Idle`, AnimationClip.WrapMode.Loop))
    this.stateMachines.set(PARAMS_NAME_ENUM.MOVE, new State(this, `${BASE_URL}/Move`, AnimationClip.WrapMode.Loop))
    this.stateMachines.set(PARAMS_NAME_ENUM.ATTACK, new State(this, `${BASE_URL}/Attack`, AnimationClip.WrapMode.Normal, ANIMATION_SPEED,
      [
        { frame: 0, func: 'setCanChangeState', params: [false] },
        { frame: ANIMATION_SPEED * 9, func: 'onAttackHit', params: [] },
        { frame: -1, func: 'setCanChangeState', params: [true] },
      ]))
    this.stateMachines.set(PARAMS_NAME_ENUM.DEAD, new State(this, `${BASE_URL}/Dead`))
  }

  // 初始化动画事件:监听动画播放完成事件，注意只能在非循环播放模式下使用
  initAnimationEvent() {
    // 监听Animation组件的FINISHED事件（动画播放完成时触发）
    this.animationComponent.on(Animation.EventType.FINISHED, () => {
      const name = this.animationComponent.defaultClip.name // 获取当前播放的动画剪辑名称
      const whiteList = ['Attack'] // 白名单,播放完成后切回IDLE
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
      case this.stateMachines.get(PARAMS_NAME_ENUM.ATTACK):
      case this.stateMachines.get(PARAMS_NAME_ENUM.MOVE):
      case this.stateMachines.get(PARAMS_NAME_ENUM.DEAD):
        if (this.params.get(PARAMS_NAME_ENUM.IDLE).value) {
          this.currentState = this.stateMachines.get(PARAMS_NAME_ENUM.IDLE)
        } else if (this.params.get(PARAMS_NAME_ENUM.DEAD).value) {
          this.currentState = this.stateMachines.get(PARAMS_NAME_ENUM.DEAD)
        } else if (this.params.get(PARAMS_NAME_ENUM.ATTACK).value) {
          this.currentState = this.stateMachines.get(PARAMS_NAME_ENUM.ATTACK)
        } else if (this.params.get(PARAMS_NAME_ENUM.MOVE).value) {
          this.currentState = this.stateMachines.get(PARAMS_NAME_ENUM.MOVE)
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
