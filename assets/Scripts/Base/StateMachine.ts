import { _decorator, AnimationClip, Component, Node, Animation, SpriteFrame } from 'cc'
import State from './State'
import { FSM_PARAMS_TYPE_ENUM } from '../Enums'

const { ccclass, property } = _decorator

type ParamsValueType = boolean | number // 定义状态机变量的类型：支持布尔值（触发器）或数字

/**
 * 状态机参数接口：描述每个参数的类型和值
 * @interface IParamsValue
 * @property type 变量类型（NUMBER/TRIGGER）
 * @property value 参数值（布尔/数字）
 */
export interface IParamsValue {
  type: FSM_PARAMS_TYPE_ENUM
  value: ParamsValueType
}

/**
 * 获取触发器类型参数的初始值, 命名导出 + 常量定义箭头函数 = 工具函数
 * 普通函数有自己的this，谁调用它，this就指向谁。
 * 常量箭头函数没有自己的this,它会继承外层的this,非常稳定。
 * @returns 初始化为TRIGGER类型，值为false的参数对象
 */
export const getInitParamsTrigger = () => {
  return {
    type: FSM_PARAMS_TYPE_ENUM.TRIGGER,
    value: false,
  }
}

/**
 * @returns 初始化为NUMBER类型，值为0的参数对象
 */
export const getInitParamsNumber = () => {
  return {
    type: FSM_PARAMS_TYPE_ENUM.NUMBER,
    value: 0,
  }
}

@ccclass('StateMachine')
export abstract class StateMachine extends Component {
  private _currentState: State  = null //当前激活的状态
  params: Map<string, IParamsValue> = new Map() // 状态机参数集合：键为参数名称，值为参数类型+值
  stateMachines: Map<string, State> = new Map() // 状态集合：键为状态名称，值为对应的State实例
  animationComponent: Animation // 动画组件
  waitingList: Array<Promise<void>> = [] // !!!状态初始化等待列表：确保动画剪辑和事件都已生成

  // 获取指定参数的值
  getParams(paramsName: string) {
    if (this.params.has(paramsName)) {
      return this.params.get(paramsName).value
    }
  }

  // 设置指定参数的值
  setParams(paramsName: string, value: ParamsValueType) {
    if (this.params.has(paramsName)) {
      this.params.get(paramsName).value = value
      this.run()
      this.resetTrigger()
    }
  }

  // 读取访问器：读取this.currentState 为触发get
  // 获取当前激活的状态
  get currentState() {
    return this._currentState
  }

  // 写入访问器：赋值this.currentState = *** 为触发set
  // 设置新的当前状态，并自动播放该状态的动画
  set currentState(newState: State) {
    this._currentState = newState
    this._currentState.run()
  }

  // 重置所有触发器参数：将TRIGGER类型的参数值设为false
  resetTrigger() {
    for (const [_, value] of this.params) {
      if (value.type === FSM_PARAMS_TYPE_ENUM.TRIGGER) {
        value.value = false
      }
    }
  }

  reset() {
    for (const [_, value] of this.params) {
      if (value.type === FSM_PARAMS_TYPE_ENUM.TRIGGER) {
        value.value = false
      } else if (value.type === FSM_PARAMS_TYPE_ENUM.NUMBER) {
        value.value = 0
      }
    }
    if (this.animationComponent) {
      this.animationComponent.stop()
    }
    this._currentState = null
  }

  // 抽象初始化方法
  abstract init(): void

  // 抽象状态机运行方法
  abstract run(): void
}
