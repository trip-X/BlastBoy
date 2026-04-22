import { _decorator, Color, Component, Sprite, Tween, tween, UIOpacity } from 'cc'
const { ccclass } = _decorator

@ccclass('UiBlink')
export class UiBlink extends Component {
  // 记录“闪烁前”的原始颜色：
  // - 之所以缓存下来，是为了闪烁结束后能还原，避免把角色永久染色
  // - 只在第一次闪烁时缓存一次（后续默认认为角色的“原始颜色”不变）
  private originColor: Color = null

  // 记录“闪烁前”的原始透明度：
  // - 当目标颜色与原始颜色相同（例如默认就是白色）时，仅改颜色不会有视觉变化
  // - 因此我们会在闪烁阶段临时降低透明度来制造“闪一下”的反馈
  private originOpacity = 255

  // blink：让当前节点上的 Sprite 做一次“闪烁”
  // 参数：
  // - interval：闪烁间隔（秒），一个完整闪烁周期大约是 interval*2（亮一次+灭一次）
  // - duration：闪烁总时长（秒）
  // - color：闪烁的目标颜色（受击一般传 Color.WHITE）
  // - flashOpacity：闪烁阶段的透明度（0~255）；当 color 与原始颜色相同（例如都是白色）时用它制造可见反馈
  blink(interval: number, duration: number, color: Color, flashOpacity: number = 80) {
    // 1) 必须要有 Sprite 才能做“变色/闪烁”
    const sprite = this.getComponent(Sprite)
    if (!sprite) return

    // 2) 参数兜底：避免 interval/duration 为 0 导致无限循环或无意义调用
    if (interval <= 0 || duration <= 0) return

    // 3) 确保有 UIOpacity：
    // - 纯改颜色时，如果原始颜色就是白色，看不到效果
    // - 这时我们通过“降透明度”来保证一定可见
    let opacity = this.getComponent(UIOpacity)
    if (!opacity) {
      opacity = this.addComponent(UIOpacity)
    }

    // 4) 缓存原始颜色（只做一次）
    if (!this.originColor) {
      const c = sprite.color
      this.originColor = new Color(c.r, c.g, c.b, c.a)
    }

    // 5) 每次闪烁都记录一下当前透明度，便于还原（因为透明度可能会被别的逻辑改过）
    this.originOpacity = opacity.opacity

    // 6) 如果外部没传颜色，就默认白色
    const targetColor = color || Color.WHITE
    const nextFlashOpacity = Math.max(0, Math.min(255, flashOpacity))

    // 7) 根据总时长计算需要闪几次
    // - 一个“亮+灭”大约消耗 interval*2 秒
    const repeatCount = Math.max(1, Math.ceil(duration / (interval * 2)))

    // 8) 终止上一次闪烁：
    // - 防止连续受击时 tween 叠加导致颜色/透明度乱跳
    Tween.stopAllByTarget(sprite)
    Tween.stopAllByTarget(opacity)
    sprite.color = this.originColor
    opacity.opacity = this.originOpacity

    // 9) 构造一个“闪一下”的序列：
    // - 亮：设置目标颜色；如果目标颜色与原始颜色一致，则顺带把透明度降低，制造可见反馈
    // - 灭：还原颜色与透明度
    const oneBlink = tween(sprite)
      .call(() => {
        sprite.color = targetColor
        if (
          this.originColor.r === targetColor.r &&
          this.originColor.g === targetColor.g &&
          this.originColor.b === targetColor.b &&
          this.originColor.a === targetColor.a
        ) {
          opacity.opacity = nextFlashOpacity
        }
      })
      .delay(interval)
      .call(() => {
        sprite.color = this.originColor
        opacity.opacity = this.originOpacity
      })
      .delay(interval)

    // 10) 重复执行若干次，并在结束后强制还原一次，避免残留
    tween(sprite)
      .repeat(repeatCount, oneBlink)
      .call(() => {
        sprite.color = this.originColor
        opacity.opacity = this.originOpacity
      })
      .start()
  }
}

export default UiBlink
