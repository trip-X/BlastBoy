import { _decorator, Component, Layers, Node, SpriteFrame, UITransform } from 'cc'

// 创建节点的工具函数
export const createUINode = (name: string = '') => {
 const node = new Node(name)
 const transform = node.addComponent(UITransform) // 给节点添加UITransform组件
 transform.setAnchorPoint(0, 1) // 设置锚点为左上角
 node.layer = 1 << Layers.nameToLayer('UI_2D') // 设置节点层级为UI_2D层
 return node
}

// 随机函数
export const randomByRange = (start: number, end: number) => Math.floor(start + (end - start) * Math.random())

// 定义正则表达式，用于匹配字符串中“_”后的数字（取最后一个“_数字”片段）
const reg = /_(\d+)(?!.*_\d+)/

// 从字符串中提取“_”后的数字，如果没有匹配到则返回0
const getNumberWithinString = (str: string) => {
 const match = str.match(reg)
 return match?.[1] ? Number.parseInt(match[1], 10) : 0
}

// 导出精灵帧数组排序函数：按精灵帧名称中的数字升序排列
export const sortSpriteFrame = (spriteFrames: SpriteFrame[]) =>
 spriteFrames.sort((a, b) => getNumberWithinString(a.name) - getNumberWithinString(b.name))

// 生成指定长度的随机数字字符串
export const randomByLen = (len: number) => {
 return Array.from({ length: len }).reduce<string>((total, item) => total + Math.floor(Math.random() * 10), '')
}
