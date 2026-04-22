import { _decorator, AnimationClip, Animation } from 'cc'
import { getInitParamsTrigger, StateMachine } from '../../Base/StateMachine'
import { ENTITY_STATE_ENUM, PARAMS_NAME_ENUM } from '../../Enums'
import State, { ANIMATION_SPEED } from '../../Base/State'
import { EntityManager } from '../../Base/EntityManager'

const { ccclass } = _decorator

const BASE_URL = 'texture/Enemy/Mummy'

@ccclass('MummyStateMachine')
export class MummyStateMachine extends StateMachine {
  async init() {
    this.animationComponent = this.addComponent(Animation)
    this.initParams()
    this.initStateMachines()
    this.initAnimationEvent()
    await Promise.all(this.waitingList)
  }

  initParams() {
    this.params.set(PARAMS_NAME_ENUM.IDLE, getInitParamsTrigger())
    this.params.set(PARAMS_NAME_ENUM.MOVE, getInitParamsTrigger())
    this.params.set(PARAMS_NAME_ENUM.ATTACK, getInitParamsTrigger())
    this.params.set(PARAMS_NAME_ENUM.DEAD, getInitParamsTrigger())
  }

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

  initAnimationEvent() {
    this.animationComponent.on(Animation.EventType.FINISHED, () => {
      const name = this.animationComponent.defaultClip.name
      const whiteList = ['Attack']
      if (whiteList.some(v => name.includes(v))) {
        this.node.getComponent(EntityManager).changeState(ENTITY_STATE_ENUM.IDLE)
      }
    })
  }

  run() {
    switch (
    this.currentState
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

