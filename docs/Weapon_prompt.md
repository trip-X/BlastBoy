# Blast Boy：武器技能系统 Prompt（吸附武器 + 自动瞄准）

本文档用于给“协作开发 Agent”说明：本项目的“技能”定义为“武器”。玩家获得武器后，武器会吸附在玩家周围并随玩家移动；武器自动锁定最近敌人并朝向它，按自身攻速自动造成伤害（可先做瞬发结算，后续再扩展为子弹）。

> 项目根目录：`d:\development_tool\Cocos\Project\Blaster Boy\blasterBoy`
>
> 现有关键模块：  
> - 实体基类（逻辑坐标 → 像素坐标）：[EntityManager.ts](file:///d:/development_tool/Cocos/Project/Blaster%20Boy/blasterBoy/assets/Scripts/Base/EntityManager.ts)  
> - 全局数据：仅有 `player` 与单个 `blueHorn` 引用：[DataManager.ts](file:///d:/development_tool/Cocos/Project/Blaster%20Boy/blasterBoy/assets/Scripts/Runtime/DataManager.ts)  
> - 事件总线：on/off/emit：[EventManager.ts](file:///d:/development_tool/Cocos/Project/Blaster%20Boy/blasterBoy/assets/Scripts/Runtime/EventManager.ts)  
> - 伤害事件：`EVENT_ENUM.ENEMY_TAKE_DAMAGE`：[Enums/index.ts](file:///d:/development_tool/Cocos/Project/Blaster%20Boy/blasterBoy/assets/Scripts/Enums/index.ts)  
> - 场景装配：玩家/敌人生成：[BattleManager.ts](file:///d:/development_tool/Cocos/Project/Blaster%20Boy/blasterBoy/assets/Scripts/Scene/BattleManager.ts)

---

## 1. 给协作开发 Agent 的提示词（整段复制）

```text
你是【协作开发 Agent】（Cocos Creator 3.8.x + TypeScript），请在 Blast Boy 项目中实现“武器技能系统”。

【技能定义（硬需求）】
1) 本项目中“技能 = 武器”。
2) 玩家获得武器后：
   - 武器会吸附在 Player 身上：固定在 Player 周围（可为固定槽位或圆周分布），并随着 Player 移动自动跟随。
   - 武器会自动锁定“最近的敌人”，并且武器的显示朝向会自动指向该敌人。
   - 武器会按自己的攻速自动造成伤害（不需要按键触发）。
3) 若场上没有敌人：武器保持默认朝向/待机状态，不产生伤害。

【必须适配现有工程现状（强制）】
- 代码在 assets/Scripts/**，不要大重构既有模块。
- 伤害结算沿用现有事件：对敌人扣血一律 emit(EVENT_ENUM.ENEMY_TAKE_DAMAGE, damage, targetId)。
- 逻辑坐标体系沿用 EntityManager：玩家/敌人都有 x/y 逻辑坐标；查找最近敌人优先用逻辑坐标算距离平方。
- 当前 DataManager 只有单个敌人引用 blueHorn（DataManager.Instance.blueHorn）。你需要考虑后续会有“多个敌人”。

【实现目标（最小可用闭环，必须先跑通）】
目标：开局直接给玩家挂 1 把武器（测试用），运行后可观察到：
1) 玩家移动时，武器节点始终在玩家周围某个固定偏移处（或绕圈），完全跟随移动。
2) 场上存在敌人时，武器会自动转向最近敌人。
3) 武器每隔固定间隔（例如 0.5s）对该敌人造成一次伤害（触发敌人扣血/死亡逻辑），且不会出现“每帧都扣血”的问题。
4) Console 无报错。

【推荐实现方式（按顺序做，先最小后扩展）】
Step 1：目标选择（最近敌人）
- 第一版可直接使用 DataManager.Instance.blueHorn 作为“唯一敌人来源”，把逻辑封装成函数 getNearestEnemy()，确保未来替换成“敌人列表”时只改一处。
- 面向扩展：新增一个 EnemyRegistry（或 EnemySystem）维护 Set<EnemyManager>，敌人初始化时注册、销毁时反注册；对外提供 getNearest(x, y)。
  - 注意：不要把“敌人列表维护”散落在各个武器里；武器只调用统一接口。

Step 2：武器系统（挂在 Player 上）
- 新建 WeaponManager（或 WeaponSystem）组件，挂在 Player 节点上。
  - 维护武器实例列表（数组）。
  - 每帧更新：计算每把武器的吸附位置（相对 Player 的 localPosition）与朝向（指向最近敌人）。
  - 负责调用每把武器的 update(dt)（计时器递减、到点触发开火/结算伤害）。

Step 3：武器实例（每把武器一个组件）
- 新建 WeaponBase（或 OrbitWeapon）组件：
  - 字段建议包含：
    - weaponId（string/enum）
    - damage（number）
    - fireInterval（number，秒）
    - fireTimer（number）
    - rangeTiles 或 rangePx（number，可选；没有则无限）
    - orbitRadiusPx（number）/ 或固定 localOffset（Vec3）
    - orbitAngle / orbitSpeed（可选：实现环绕）
  - 行为：
    - 每帧递减 fireTimer；当 fireTimer <= 0 时：
      - 若当前有锁定目标且目标存活：emit(EVENT_ENUM.ENEMY_TAKE_DAMAGE, damage, targetId) 结算一次伤害
      - 重置 fireTimer = fireInterval
    - 没有目标时只重置/停表：由你决定，但必须保证“无敌人不扣血”。

【吸附规则（你必须实现其一，并让后续可扩展）】
- 方案 A（更简单）：固定槽位吸附。每把武器有一个固定 localOffset（例如 (80, 60)）。
- 方案 B（更像生存射击）：圆周分布吸附。N 把武器平均分布在圆上：angle = base + i*(2π/N)，localPos = r*(cos, sin)；可选让 base 随时间增加实现绕圈。
你可以先实现 A，预留字段支持未来切到 B。

【验收清单（你写完后必须自检）】
1) 武器节点是 Player 的子节点（或跟随节点），玩家移动时武器自然跟随。
2) 无敌人时不报错、不发伤害事件。
3) 敌人死亡/销毁后，武器不会继续引用旧对象导致报错（需要做空判/存活判定）。
4) 伤害频率严格由 fireInterval 控制，不会受帧率影响导致“每帧扣血”。

【交付物（你必须输出）】
- 你新增/修改的文件列表（含路径）。
- 关键类的职责说明（WeaponManager/WeaponBase/EnemyRegistry）。
- 最小可粘贴代码片段（不要一次性贴整项目长代码）。
- 在 Cocos Editor 里需要怎么挂载/绑定（如果你新增了 Prefab/节点层级）。
```

---

## 2. 约束与提醒（给 Agent 的坑位提示）

### 2.1 当前工程的“敌人列表”缺失

当前只在 [DataManager.ts](file:///d:/development_tool/Cocos/Project/Blaster%20Boy/blasterBoy/assets/Scripts/Runtime/DataManager.ts) 存了 `blueHorn` 单引用。第一版可以先只锁定它，但请把“目标选择”封装好，避免未来多敌人时到处改。

### 2.2 伤害必须是“节流触发”

禁止用碰撞回调或 update 每帧直接 emit 伤害。必须用计时器（fireTimer）控制触发间隔，保证帧率变化不影响伤害次数。

### 2.3 坐标体系建议

你可以用逻辑坐标 `x/y` 做“最近敌人”判定（dx,dy, distSq）。武器视觉位置用 Player 子节点 localPosition 处理即可，不需要改 EntityManager 的坐标映射。

