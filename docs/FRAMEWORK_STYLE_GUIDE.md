# Cocos Start Demo — 框架与编码规范（给后续 Agent 的基础约定）

本文档总结本仓库现有的代码框架风格与命名/格式约定，用于后续扩展功能、修复 bug、添加新实体/关卡时保持一致性。

## 1. 技术栈与工程格式

- 引擎：Cocos Creator 3.x（TypeScript）
- 代码格式化：Prettier（无分号、单引号、120 列）
  - 见 [.prettierrc.json](file:///d:/development_tool/Cocos/Project/cocos-start-demo-master/.prettierrc.json)
- 缩进：TS/JSON 使用 2 空格；其他文件默认 4 空格
  - 见 [.editorconfig](file:///d:/development_tool/Cocos/Project/cocos-start-demo-master/.editorconfig)
- ESLint：TypeScript 推荐规则 + Prettier 集成；`strict` 关闭（允许 `null`/弱类型）
  - 见 [.eslintrc](file:///d:/development_tool/Cocos/Project/cocos-start-demo-master/.eslintrc)、[tsconfig.json](file:///d:/development_tool/Cocos/Project/cocos-start-demo-master/tsconfig.json)

## 2. 目录结构（职责边界）

建议把“基础设施 / 运行时服务 / 游戏内容”分开理解与扩展：

- `assets/Base/`：框架基础（FSM、实体基类、单例等）
  - 状态机框架：[StateMachine.ts](file:///d:/development_tool/Cocos/Project/cocos-start-demo-master/assets/Base/StateMachine.ts)、[State.ts](file:///d:/development_tool/Cocos/Project/cocos-start-demo-master/assets/Base/State.ts)、[SubStateMachine.ts](file:///d:/development_tool/Cocos/Project/cocos-start-demo-master/assets/Base/SubStateMachine.ts)
  - 实体基类：[EntityManager.ts](file:///d:/development_tool/Cocos/Project/cocos-start-demo-master/assets/Base/EntityManager.ts)
  - 单例基类：[Singleton.ts](file:///d:/development_tool/Cocos/Project/cocos-start-demo-master/assets/Base/Singleton.ts)
- `assets/Runtime/`：运行时全局服务（数据、事件、资源、过场）
  - 全局数据：[DataManager.ts](file:///d:/development_tool/Cocos/Project/cocos-start-demo-master/assets/Runtime/DataManager.ts)
  - 事件总线：[EventManager.ts](file:///d:/development_tool/Cocos/Project/cocos-start-demo-master/assets/Runtime/EventManager.ts)
  - 资源加载：[ResourceManager.ts](file:///d:/development_tool/Cocos/Project/cocos-start-demo-master/assets/Runtime/ResourceManager.ts)
  - 过场遮罩：[FaderManager.ts](file:///d:/development_tool/Cocos/Project/cocos-start-demo-master/assets/Runtime/FaderManager.ts)
- `assets/Enums/`：枚举与常量协议（事件名、状态名、场景名、类型名）
  - [Enums/index.ts](file:///d:/development_tool/Cocos/Project/cocos-start-demo-master/assets/Enums/index.ts)
- `assets/Levels/`：关卡数据（TS 对象），统一出口与类型定义
  - [Levels/index.ts](file:///d:/development_tool/Cocos/Project/cocos-start-demo-master/assets/Levels/index.ts)
- `assets/Scripts/`：具体玩法逻辑（场景、玩家、敌人、门、陷阱、瓦片、UI 等）
  - 战斗主控：[BattleManager.ts](file:///d:/development_tool/Cocos/Project/cocos-start-demo-master/assets/Scripts/Scene/BattleManager.ts)
- `assets/Sences/`：场景资源（注意该目录名为 `Sences`）

## 3. 核心架构（谁负责什么）

### 3.1 BattleManager：场景编排与关卡装配

- 关卡装配入口：`start() -> generateStage() -> initLevel()`，见 [BattleManager.ts](file:///d:/development_tool/Cocos/Project/cocos-start-demo-master/assets/Scripts/Scene/BattleManager.ts#L50-L88)
- `initLevel()` 负责：
  - 从 `Levels[level_n]` 读取关卡数据
  - 写入 `DataManager`（`mapInfo/mapRowCount/mapColumnCount` 等）
  - 并行生成：TileMap / Player / Enemies / Door / Spikes / Burst / SmokeLayer
  - 执行 Fader 过场（fade/mask）
- 事件订阅建议放在 `onLoad()`，解绑放在 `onDestroy()`，见 [BattleManager.ts](file:///d:/development_tool/Cocos/Project/cocos-start-demo-master/assets/Scripts/Scene/BattleManager.ts#L27-L48)

### 3.2 DataManager：运行态单例数据仓库（强引用）

- 保存“当前关卡运行态”的强引用（组件实例/数组），见 [DataManager.ts](file:///d:/development_tool/Cocos/Project/cocos-start-demo-master/assets/Runtime/DataManager.ts#L19-L45)
- `reset()` 会把数组清空、引用置空/重置计数
- 约定：凡是“跨组件共享的运行态”优先放入 DataManager；但要注意它与表现层强耦合，不适合直接做存档/联网（除非进一步数据化）

### 3.3 EventManager：全局事件总线（轻量 on/off/emit）

- 事件名统一用 `EVENT_ENUM`，见 [Enums/index.ts](file:///d:/development_tool/Cocos/Project/cocos-start-demo-master/assets/Enums/index.ts#L15-L30)
- 订阅：`EventManager.Instance.on(EVENT_ENUM.X, this.fn, this)`
- 解绑：`EventManager.Instance.off(EVENT_ENUM.X, this.fn)`
- 实现细节：`off` 仅按函数引用移除，不按 ctx 区分，见 [EventManager.ts](file:///d:/development_tool/Cocos/Project/cocos-start-demo-master/assets/Runtime/EventManager.ts#L28-L35)
  - 实战约定：同一个回调函数不要用不同 ctx 重复注册；组件销毁必须解绑全部订阅；避免拼写错误导致解绑失败

## 4. 游戏主链路（输入 → 逻辑 → 联动）

1. UI 输入：`ControllerManager` 将按钮点击转成事件 `PLAYER_CTRL`
   - [ControllerManager.ts](file:///d:/development_tool/Cocos/Project/cocos-start-demo-master/assets/Scripts/UI/ControllerManager.ts)
2. 玩家响应：`PlayerManager.init()` 订阅 `PLAYER_CTRL`，输入后进行移动/转向/攻击判定
   - [PlayerManager.ts](file:///d:/development_tool/Cocos/Project/cocos-start-demo-master/assets/Scripts/Player/PlayerManager.ts#L26-L190)
3. 广播联动：玩家动作会触发 `PLAYER_MOVE_END / RECORD_STEP / DOOR_OPEN / SHOW_SMOKE` 等事件
4. 其他系统响应：门、敌人、陷阱等订阅 `PLAYER_MOVE_END` 进行结算/更新（各自 `init()` 内完成订阅）

## 5. FSM（动画驱动的状态机）约定

### 5.1 基本模式

- 每个实体通常由两部分组成：
  - `XxxManager`：业务逻辑（坐标、事件、判定、数据写入）
  - `XxxStateMachine`：动画状态机（参数驱动、加载资源、切状态）
- 状态切换通过 `StateMachine.setParams()` 触发 `run()`，见 [StateMachine.ts](file:///d:/development_tool/Cocos/Project/cocos-start-demo-master/assets/Base/StateMachine.ts#L59-L88)

### 5.2 参数枚举统一管理

- 触发器/数字参数名集中在 `PARAMS_NAME_ENUM`，见 [Enums/index.ts](file:///d:/development_tool/Cocos/Project/cocos-start-demo-master/assets/Enums/index.ts#L49-L65)
- 实体方向统一走 `PARAMS_NAME_ENUM.DIRECTION` + `DIRECTION_ORDER_ENUM` 数值映射
  - [EntityManager.ts](file:///d:/development_tool/Cocos/Project/cocos-start-demo-master/assets/Base/EntityManager.ts#L24-L36)

### 5.3 方向子状态机

- `DirectionSubStateMachine` 用方向数字来切换具体方向 State，见 [DirectionSubStateMachine.ts](file:///d:/development_tool/Cocos/Project/cocos-start-demo-master/assets/Base/DirectionSubStateMachine.ts)
- 适用场景：`idle/top|bottom|left|right`、`attack/*`、`turnleft/*` 等资源路径按方向分目录

## 6. 关卡数据（Levels）约定

- 关卡导出为 `Levels.level_n`，由 `BattleManager.initLevel()` 使用字符串键访问
  - [Levels/index.ts](file:///d:/development_tool/Cocos/Project/cocos-start-demo-master/assets/Levels/index.ts#L58-L83)
- 结构：
  - `mapInfo: ITile[][]`（二维数组）
  - `player/enemies/bursts/door: IEntity`
  - `spikes: ISpikes[]`（包含 `count`）
- 坐标系约定：实体使用 `x/y`（整格）；渲染位置在 `EntityManager.update()` 中按 `TILE_WIDTH/TILE_HEIGHT` 映射到 node position
  - [EntityManager.ts](file:///d:/development_tool/Cocos/Project/cocos-start-demo-master/assets/Base/EntityManager.ts#L52-L54)

## 7. 代码风格与命名规范（必须遵守）

### 7.1 格式化/语法风格

- 一律不写分号（由 Prettier 保证）
- 字符串一律单引号
- TS/JSON 缩进 2 空格
- 一行建议不超过 120 列

### 7.2 命名规则（统一约定）

以下规则用于统一整个项目的可读性（新代码必须遵守；旧代码不规范时可在不改逻辑前提下修正）：

- 变量/函数：`camelCase`
  - `generateTileMap()`、`initLevel()`（见 [BattleManager.ts](file:///d:/development_tool/Cocos/Project/cocos-start-demo-master/assets/Scripts/Scene/BattleManager.ts)）
- 类/组件：`PascalCase`，并用 `@ccclass('SameName')`
  - `PlayerManager`（见 [PlayerManager.ts](file:///d:/development_tool/Cocos/Project/cocos-start-demo-master/assets/Scripts/Player/PlayerManager.ts#L19-L20)）
- 枚举/常量：`UPPER_SNAKE_CASE`；枚举统一以 `_ENUM` 结尾
  - `EVENT_ENUM`、`ENTITY_STATE_ENUM`（见 [Enums/index.ts](file:///d:/development_tool/Cocos/Project/cocos-start-demo-master/assets/Enums/index.ts)）
- private 成员：统一使用 `_` 前缀（包含 backing field 与普通私有字段）
  - 例：`private _state`、`private _direction`（见 [EntityManager.ts](file:///d:/development_tool/Cocos/Project/cocos-start-demo-master/assets/Base/EntityManager.ts#L17-L18)）
- bool：统一以 `is/has/can` 开头
  - 例：`isMoving`（见 [PlayerManager.ts](file:///d:/development_tool/Cocos/Project/cocos-start-demo-master/assets/Scripts/Player/PlayerManager.ts#L24)）
- 数组/集合：优先以 `list/arr` 结尾（或语义复数名词）
  - 例：`waitingList`、`enemies`（见 [StateMachine.ts](file:///d:/development_tool/Cocos/Project/cocos-start-demo-master/assets/Base/StateMachine.ts#L50)、[DataManager.ts](file:///d:/development_tool/Cocos/Project/cocos-start-demo-master/assets/Runtime/DataManager.ts#L22-L31)）
- 节点/预制体变量：以 `Node/Prefab` 结尾（表达“这是场景对象引用”）
  - 例：`smokeLayer: Node`、`stage: Node`（见 [BattleManager.ts](file:///d:/development_tool/Cocos/Project/cocos-start-demo-master/assets/Scripts/Scene/BattleManager.ts#L22-L25)）

### 7.3 文件/模块命名

- 组件脚本文件：`XxxManager.ts`、`XxxStateMachine.ts`、`XxxSubStateMachine.ts`
  - 示例目录：`assets/Scripts/Player/*`、`assets/Scripts/Spikes/*`
- 聚合出口：`index.ts`（Enums、Levels、Utils）

## 8. 常用模式（建议照抄的“模板”）

### 8.1 新增一个可生成的实体/陷阱（Manager + FSM）

- 新建脚本目录：`assets/Scripts/Foo/`
- 写 `FooManager`：
  - 继承 `EntityManager`（如果是地图格子实体）
  - `init(params)` 中：挂载 `FooStateMachine` 并 `await this.fsm.init()`，随后 `super.init(params)`
  - 在 `init()` 里完成事件订阅，在 `onDestroy()` 里完成解绑
- 写 `FooStateMachine`：
  - 继承 `StateMachine`
  - 定义 params（`this.params.set(PARAMS_NAME_ENUM.XXX, getInitParamsTrigger())`）
  - 定义 states（`this.stateMachines.set(PARAMS_NAME_ENUM.XXX, new State(...))` 或子状态机）
  - `run()` 按 params 决策 `this.currentState = ...`
- 在 `BattleManager.initLevel()` 的 `Promise.all([...])` 里接入生成流程（如需全局生成）

### 8.2 生成节点统一用 createUINode

- 使用 `createUINode()` 创建 node，并自动设置锚点与 layer
  - [Scripts/Utils/index.ts](file:///d:/development_tool/Cocos/Project/cocos-start-demo-master/assets/Scripts/Utils/index.ts#L4-L10)

## 9. 容易踩坑的点（强制检查清单）

- 生命周期函数拼写必须正确：`onDestroy()`（否则事件无法解绑，关卡切换后旧对象会继续响应事件）
- 事件解绑必须与订阅一一对应：同事件名、同回调引用
- `DataManager` 里允许出现 `null`（项目 `strict=false`），但逻辑层取用前要先判断是否已初始化/已销毁
- 关卡边界判断涉及 `mapRowCount/mapColumnCount`，写入与读取要保持一致（以 `mapInfo[x][y]` 或 `mapInfo[row][col]` 的访问方式为准）

## 10. 扩展建议（保持一致性优先）

- 新功能优先复用现有的三件套：
  - `DataManager` 做跨组件共享运行态
  - `EventManager + EVENT_ENUM` 做系统解耦
  - `StateMachine` 做动画/表现层切换
- 如果要引入“新系统”（例如 Buff、道具、AI 行为树），先给出：
  - 数据放哪里（DataManager 哪个字段 / 或新增模块）
  - 事件怎么串（新增 EVENT_ENUM 哪些事件）
  - 入口在哪里（BattleManager 初始化哪一步挂载/生成）

