// 单例模式基类
export default class Singleton {
  // 私有静态变量：存储单例实例，初始值null，any类型兼容所有子类
  private static _instance: any = null

  // 静态泛型方法：获取<T>的单例实例，T为返回类型
  static GetInstance<T>(): T {
    if (this._instance === null) {
      this._instance = new this()
    }
    return this._instance
  }
}
