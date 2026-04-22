import { animation, AnimationClip, Sprite, SpriteFrame } from 'cc'
import ResourceManager from '../Runtime/ResourceManager'
import { StateMachine } from './StateMachine'
import { sortSpriteFrame } from '../Utils/utils'

export const ANIMATION_SPEED = 1 / 16


export default class State {
  private animationClip: AnimationClip // 当前状态对应的动画剪辑
  // 构造函数：初始化状态实例
  constructor(
    private fsm: StateMachine, // 所属的状态机实例
    private path: string, // 动画精灵帧资源的加载路径
    private wrapMode: AnimationClip.WrapMode = AnimationClip.WrapMode.Normal, // 动画循环模式
    private speed: number = ANIMATION_SPEED, // 动画播放速度
    private events: any[] = [], // 动画事件数组
  ) {
    this.init() // 初始化动画剪辑和资源加载
  }

  // 这部分主要是加载资源以及制作动画切片，需要执行一次，因此放在初始化里
  async init() {
    const promise = ResourceManager.Instance.loadDir(this.path) // 调用资源管理器加载指定路径下的所有精灵帧资源
    this.fsm.waitingList.push(promise.then(() => { })) // 将资源加载Promise转为void后，加入状态机的等待列表，确保状态机初始化时等待所有资源加载完成
    const spriteFrames = await promise // 等待资源加载完成以获取精灵帧数组
    this.animationClip = new AnimationClip() // 实例化动画剪辑对象

    const track = new animation.ObjectTrack() // 创建一个对象轨道
    track.path = new animation.TrackPath().toComponent(Sprite).toProperty('spriteFrame') // 指定轨道路径：目标为当前节点的Sprite组件的spriteFrame属性（即控制精灵帧的切换）
    const filteredSpriteFrames = spriteFrames.filter(v => /_\d+/.test(v.name))// 过滤出名称包含数字的精灵帧，即动画切片
    const frames: Array<[number, SpriteFrame]> = sortSpriteFrame(filteredSpriteFrames).map((item, index) => [
      this.speed * index,
      item,
    ]) // 排序精灵帧数组，以确保资源按顺序播放，遍历精灵帧数组，为每帧计算对应播放时间，生成动画所需的 [时间点，精灵帧] 关键帧数组
    track.channel.curve.assignSorted(frames) // 将关键帧分配到轨道的曲线中
    this.animationClip.addTrack(track) // 将轨道添加到动画剪辑以应用
    this.animationClip.name = this.path // 设置路径为动画切片名
    this.animationClip.duration = frames.length * this.speed // 重新计算动画剪辑总时长
    this.animationClip.wrapMode = this.wrapMode // 设置动画循环模式

    const lastFrameTime = frames.length > 0 ? this.speed * (frames.length - 1) : 0
    // 处理事件表，将 -1 替换为最后一帧时间
    for (const event of this.events) {
      if (event?.frame === -1) {
        this.animationClip.events.push({ ...event, frame: lastFrameTime })
      } else {
        this.animationClip.events.push(event)
      }
    }
  }


  // 切换状态机的动画
  run() {
    const animation = this.fsm.animationComponent
    if (!this.animationClip || !animation) return
    if (animation.defaultClip?.name === this.animationClip.name) return

    const clips = animation.clips ?? []// 获取当前动画组件的所有动画剪辑
    if (!clips.some(c => c.name === this.animationClip.name)) {// 如果当前动画剪辑不在动画组件的剪辑列表中
      animation.clips = [...clips, this.animationClip]// 追加当前动画剪辑到动画组件的剪辑列表
    }

    animation.defaultClip = this.animationClip// 设置当前动画剪辑为默认播放的剪辑
    animation.defaultClip.events = [...this.animationClip.events]// 重新赋值事件表，触发内部重新读取
    animation.clips = animation.clips// 重点！！！强制刷新内部状态
    animation.play(this.animationClip.name)// 播放当前动画剪辑

    // 关键知识点：为什么“运行时创建 AnimationClip 后，帧事件不触发”？
    // 1) 我们的动画是代码运行时动态 new AnimationClip() + 填 tracks + 填 clip.events。
    // 2) 但 Cocos 的 Animation 事件系统通常是围绕 animation.clips / defaultClip 来创建 AnimationState 并读取事件表。
    // 3) 如果只是 animation.defaultClip = clip 然后 animation.play()，有时能播帧，但事件表不会被正确刷新，导致 clip.events 里的帧事件不回调。
    // 4) 参考官方示例的解决思路：
    //    - 先确保 clip 已登记到 animation.clips（没有就追加）
    //    - 再把事件重新赋值到“正在播放的 defaultClip.events”（触发内部重新读取）
    //    - 最后执行 animation.clips = animation.clips（强制刷新内部状态）并用 animation.play(clipName) 播放指定 clip
    // 额外提醒：事件对象里的 frame 实际是“秒”，不是“第几帧”；如果你要第 N 帧，通常写 ANIMATION_SPEED * N。
  }
}
