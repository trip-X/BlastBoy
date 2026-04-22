import Singleton from '../Base/Singleton'

interface IItem {
  func: Function
  ctx: unknown
}

export default class EventManager extends Singleton {
  // 静态getter语法糖：简化单例实例的获取
  static get Instance() {
    return super.GetInstance<EventManager>()
  }

  // eventDic<事件,函数队列>
  private eventDic: Map<string, Array<IItem>> = new Map()

  // 添加事件
  // 参数：eventName-事件名，func-回调函数，ctx-可选的执行上下文，ctx作用：指定函数执行时的this指向。
  on(eventName: string, func: Function, ctx?: unknown) {
    if (this.eventDic.has(eventName)) {
      this.eventDic.get(eventName).push({ func, ctx })
    } else {
      this.eventDic.set(eventName, [{ func, ctx }])
    }
  }

  // 移除事件
  // 参数：eventName-事件名，func-要移除的回调函数，ctx-上下文对象
  off(eventName: string, func: Function, ctx?: unknown) {
    if (this.eventDic.has(eventName)) {
      // 增加对 ctx 的精准匹配，防止同类不同实例的事件被误删
      const index = this.eventDic.get(eventName).findIndex(i => i.func === func && (!ctx || i.ctx === ctx))
      index > -1 && this.eventDic.get(eventName).splice(index, 1)
    }
  }

  // 触发事件
  // 参数：eventName-事件名，...params-剩余参数
  emit(eventName: string, ...params: unknown[]) {
    if (this.eventDic.has(eventName)) {
      this.eventDic.get(eventName).forEach(({ func, ctx }) => {
        ctx ? func.apply(ctx, params) : func(...params) //有上下文则用apply绑定this并传参；无上下文则直接调用函数传参
      })
    }
  }

  // 清空所有事件
  clean() {
    this.eventDic.clear()
  }
}
