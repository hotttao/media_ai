# 未生成视频组合与姿势动作映射设计

## 背景

当前 `/videos` 只覆盖“已生成视频”的浏览能力，缺少一个统一入口去发现“哪些首帧图 + 动作组合还没有生成视频”。

现有视频生成链路已经具备判定所需的核心字段：

- `first_frames.id`
- `first_frames.styleImageId`
- `style_images.poseId`
- `videos.firstFrameId`
- `videos.movementId`
- `movement_materials`
- `getAllowedMovementsForPose()`

因此可以在不新增核心数据表的前提下，直接基于现有首帧图、姿势、动作、视频记录推导“未生成组合”。

同时，后台任务还需要一个辅助接口，用来批量获取“当前团队下所有姿势与通用/专用动作的映射关系”。该接口不需要前端展示，但需要保持和现有动作可用性规则一致。

## 目标

1. 提供一个接口，返回当前团队下“尚未生成视频”的 `firstFrameId + movementId` 组合。
2. 在 `/videos` 页面新增 `未生成组合` tab，用于浏览这些组合。
3. 每条组合能明确展示首帧图、动作、商品、IP 等上下文。
4. 第一版仅展示与占位“发起生成”入口，不真正创建任务。
5. 提供一个后台辅助接口，返回“当前团队姿势 -> 通用动作 + 专用动作”的映射。

## 非目标

- 本期不实现“直接发起生成任务”。
- 本期不新增组合持久化表。
- 本期不做批量生成、批量勾选、队列编排。
- 本期不改动现有视频生成核心流程。

## 核心判定规则

### 未生成组合

唯一组合键定义为：

- `firstFrameId + movementId`

候选组合生成规则：

1. 获取当前团队可访问的全部首帧图。
2. 对每张首帧图，找到其对应姿势：
   - 优先从 `first_frames.styleImageId -> style_images.poseId`
   - 若无 `styleImageId` 或无 `poseId`，则该首帧图不参与组合推导
3. 通过 `getAllowedMovementsForPose(movements, poseId)` 取得该姿势可用动作：
   - 包括全部通用动作
   - 包括与该姿势显式关联的专用动作
4. 形成 `firstFrameId + movementId` 候选集合。
5. 查询 `videos` 表中当前团队已存在的 `firstFrameId + movementId` 组合。
6. 从候选集合中排除已存在组合，剩余即为“未生成组合”。

### 姿势动作映射

姿势动作映射规则：

1. 获取当前团队可访问的全部姿势素材 `materials(type=POSE)`。
2. 获取全部动作素材 `movement_materials`。
3. 对每个姿势调用 `getAllowedMovementsForPose()`。
4. 输出该姿势对应的：
   - `generalMovements`
   - `specialMovements`
   - `allMovements`

这里的“当前团队可访问姿势”沿用现有素材可见性语义，不扩大到全库。

## 接口设计

### 1. 获取未生成视频组合

接口：

- `GET /api/videos/pending-combinations`

权限：

- 必须登录
- 必须存在 `teamId`

返回结构：

```json
[
  {
    "combinationKey": "firstFrameId:movementId",
    "firstFrame": {
      "id": "ff_1",
      "url": "https://...",
      "productId": "product_1",
      "ipId": "ip_1",
      "styleImageId": "style_1",
      "poseId": "pose_1",
      "sceneId": "scene_1",
      "createdAt": "2026-04-27T10:00:00.000Z"
    },
    "movement": {
      "id": "move_1",
      "content": "转身展示裙摆",
      "url": null,
      "isGeneral": true,
      "clothing": null
    },
    "product": {
      "id": "product_1",
      "name": "白色短裙"
    },
    "ip": {
      "id": "ip_1",
      "nickname": "崔念夏"
    },
    "pose": {
      "id": "pose_1",
      "name": "站姿正面",
      "url": "https://..."
    },
    "scene": {
      "id": "scene_1",
      "name": "街景",
      "url": "https://..."
    }
  }
]
```

说明：

- `combinationKey` 仅供前端稳定渲染与未来任务触发使用。
- `firstFrame.styleImageId` 与 `firstFrame.poseId` 必须显式返回，供后台任务直接衔接“姿势 -> 动作提示词”链路。
- 第一版不返回“可直接执行”的任务 payload，只返回上下文数据。

### 2. 获取当前团队姿势与动作映射

接口：

- `GET /api/videos/pose-movement-map`

权限：

- 必须登录
- 必须存在 `teamId`

用途：

- 仅供后台辅助任务调用
- 前端不展示

返回结构：

```json
[
  {
    "pose": {
      "id": "pose_1",
      "name": "站姿正面",
      "url": "https://..."
    },
    "generalMovements": [
      {
        "id": "move_g_1",
        "content": "原地转身"
      }
    ],
    "specialMovements": [
      {
        "id": "move_s_1",
        "content": "提裙摆展示"
      }
    ],
    "allMovements": [
      {
        "id": "move_g_1",
        "content": "原地转身"
      },
      {
        "id": "move_s_1",
        "content": "提裙摆展示"
      }
    ]
  }
]
```

## 服务层设计

建议在 `domains/video/service.ts` 增加两个查询：

1. `getPendingVideoCombinations(teamId: string)`
2. `getPoseMovementMap(teamId: string)`

### getPendingVideoCombinations

实现步骤：

1. 查询当前团队可访问首帧图，附带：
   - `productId`
   - `ipId`
   - `styleImageId`
   - `poseId`
   - `sceneId`
2. 批量查询关联 `style_images.poseId`
3. 批量查询相关商品、IP、姿势、场景
4. 查询全部动作素材
5. 对每张首帧图用 `getAllowedMovementsForPose()` 得出候选动作
6. 查询 `videos` 中当前团队所有非空 `firstFrameId + movementId`
7. 过滤已存在组合
8. 返回前端视图模型

### getPoseMovementMap

实现步骤：

1. 查询当前团队可访问的姿势素材
2. 查询全部动作素材
3. 逐个姿势调用 `getAllowedMovementsForPose()`
4. 将结果分组成 `generalMovements / specialMovements / allMovements`

## 页面设计

页面：

- `app/(app)/videos/page.tsx`

现有页面保留“已生成视频”列表，并新增顶部 tab：

1. `已生成视频`
2. `未生成组合`

### 已生成视频

- 维持现状

### 未生成组合

展示组合卡片，不复用视频卡片。

每张卡片展示：

- 首帧图缩略图
- 动作名称
- 商品名
- IP 名
- 姿势名
- 场景名（若有）

卡片操作：

- 主按钮：`发起生成`
- 第一版点击后只展示占位反馈，例如 toast 或禁用说明
- 不创建真实任务

空态文案：

- “当前没有待生成组合”

## UI 组件设计

建议新增：

- `components/video/PendingCombinationCard.tsx`
- `components/video/PendingCombinationGrid.tsx`

这样可以避免把 `/videos` 页面逻辑塞进现有 `VideoGrid`。

## 错误处理

- 未登录返回 `401`
- 无团队返回 `400`
- 若首帧图缺少可追溯姿势，则跳过该首帧图，不报错
- 若动作、姿势、场景存在历史缺失记录，则该字段显示为 `未记录`

## 测试策略

至少覆盖：

1. 服务层
   - 可正确推导未生成组合
   - 已存在 `firstFrameId + movementId` 的组合会被排除
   - 无 `poseId` 的首帧图会被跳过
   - 姿势映射能正确分出通用/专用动作
2. 路由层
   - `/api/videos/pending-combinations`
   - `/api/videos/pose-movement-map`
   - 未登录 `401`
   - 无团队 `400`
3. 前端
   - `/videos` tab 能在“已生成视频 / 未生成组合”之间切换
   - 未生成组合空态与非空态可正确渲染

## 风险与约束

1. 历史首帧图可能没有 `styleImageId` 或对应 `poseId`
   - 第一版直接跳过，不纳入待生成组合
2. 当前规则把“是否已生成”定义为团队范围内存在任意同 `firstFrameId + movementId` 视频
   - 若未来要区分失败、草稿、手动上传来源，需要再加状态规则
3. 若首帧图数量和动作数量很大，组合推导可能增长较快
   - 第一版先接受，后续如有性能压力再分页或缓存

## 验收标准

- `/api/videos/pending-combinations` 可返回当前团队未生成的首帧图+动作组合
- `/api/videos/pending-combinations` 返回中显式包含 `styleImageId` 与 `poseId`
- `/api/videos/pose-movement-map` 可返回当前团队姿势与动作映射
- `/videos` 页面新增 `未生成组合` tab
- 该 tab 可查看未生成组合，但不会真实发起任务
