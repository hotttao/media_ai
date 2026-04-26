# 商品视频浏览与详情设计

## 背景

当前商品详情页 `app/(app)/products/[id]/ProductDetail.tsx` 只有“详情”和“素材”两个视图，缺少该商品下已生成视频的集中浏览入口。用户即使已经完成视频生成，也只能在生成向导里看到单次结果，无法在后续快速回看全部视频。

同时，现有首页中的视频入口需要承担全局检索职责。用户反馈“商品很多，但最终有视频的商品可能很少”，如果只能从商品页进入，会增加查找成本。因此需要同时提供：

- 商品维度的视频列表入口
- 全局维度的视频列表入口
- 独立的视频详情页，用于播放视频并查看生成过程

现有数据模型已经具备本次需求所需的核心追踪字段，无需新增核心主表：

- `videos` 已关联 `productId`
- `videos` 已记录 `taskId`
- `videos` 已记录 `sceneId`、`poseId`、`movementId`
- `videos` 已记录 `firstFrameId`、`styleImageId`、`modelImageId`
- `video_tasks` 已记录任务状态、错误、参数、结果、时间信息

## 目标

1. 用户可以在商品详情页查看该商品的全部已生成视频。
2. 用户可以从全局视频入口快速找到最近生成的视频，而不依赖先找到商品。
3. 用户点击任一视频后，可以进入独立详情页播放视频。
4. 用户在视频详情页可以看到这条视频的生成过程链路和任务信息。

## 非目标

- 本期不重做视频生成向导流程。
- 本期不新增复杂筛选系统，如多条件组合筛选、收藏、标签管理。
- 本期不新增新的视频任务追踪表，优先复用现有 `videos` 与 `video_tasks`。
- 本期不处理视频编辑、重新生成、复制任务等二次操作。

## 方案概览

本次采用“三层入口”结构：

1. 商品详情页新增“视频”tab，展示当前商品的全部视频列表。
2. 新增全局视频列表页，作为首页视频 tab 的真实入口，展示跨商品视频。
3. 新增独立视频详情页 `/videos/[videoId]`，承载播放器和生成过程追踪。

这样可以同时满足“从商品看视频”和“先找视频再回到商品”两类路径。

## 入口设计

### 1. 商品详情页

在 `ProductDetail` 的 tab 中新增 `videos` 视图，与现有 `detail`、`materials` 并列。

行为：

- 默认仍停留在商品详情
- 用户切换到“视频”tab 后加载该商品全部视频
- 视频以卡片列表展示，按 `createdAt desc` 排序
- 点击卡片进入 `/videos/[videoId]`

商品视频 tab 的职责是“聚合本商品成果”，不承担全局检索职责。

### 2. 全局视频入口

新增独立页面，例如 `app/(app)/videos/page.tsx`，作为全局视频列表页。

首页中的视频 tab 或视频入口应跳转到该页面，而不是停留在仅展示静态内容的首页模块。

行为：

- 展示当前团队下全部视频
- 默认按 `createdAt desc` 排序
- 每张卡片展示最小必要信息：
  - 视频封面或播放器首帧
  - 商品名
  - IP 名
  - 生成时间
  - 任务状态
- 点击卡片进入 `/videos/[videoId]`

第一版不增加复杂筛选；如果后续数据量增长，再补状态筛选、商品筛选或按 IP 筛选。

## 视频详情页设计

新增页面：`app/(app)/videos/[videoId]/page.tsx`

该页面分为 4 个区块。

### 1. 顶部主区

左侧：

- 视频播放器
- 使用 `video.url`
- 支持标准播放控件

右侧：

- 视频名称（若 `video.name` 为空则显示默认标题）
- 所属商品名称与跳转链接
- 关联 IP 名称
- 生成时间
- 视频 prompt
- 动作名称
- 任务状态

操作入口：

- 返回全局视频列表
- 跳到所属商品详情页

### 2. 生成过程时间线

按真实生成链路展示：

`模特图 -> 定妆图 -> 首帧图 -> 动作 -> 成品视频`

每一项展示策略：

- 模特图：使用 `video.modelImageId` 关联 `model_images`
- 定妆图：使用 `video.styleImageId` 关联 `style_images`
- 首帧图：使用 `video.firstFrameId` 关联 `first_frames`
- 动作：使用 `video.movementId` 关联 `movement_materials`
- 场景：使用 `video.sceneId` 关联 `materials`
- 姿势：使用 `video.poseId` 关联 `materials`

展示原则：

- 有图片的步骤展示缩略图
- 纯文本步骤展示摘要卡
- 缺失的数据明确显示“未记录”，而不是直接隐藏

这样用户可以看清这条视频的实际生成链路是否完整。

### 3. 任务过程区

展示 `video.task` 对应的 `video_tasks` 信息：

- 工作流名称
- 任务状态
- 创建时间
- 开始时间
- 完成时间
- 错误信息
- 参数摘要
- 结果摘要

其中 `params`、`result` 目前是字符串字段，第一版处理原则：

- 可解析 JSON 时，格式化展示关键字段
- 不可解析时，按原始文本显示
- 避免把超长原始内容直接塞满页面，必要时折叠

这一区块既服务故障排查，也服务运营回看。

### 4. 同商品相关视频

页面底部展示同商品下其他视频列表。

目的：

- 用户从一条视频继续浏览同商品其他视频
- 降低来回返回列表页的频率

展示字段：

- 缩略图
- 生成时间
- 任务状态

点击后切换到对应 `/videos/[videoId]`。

## 数据获取设计

### 商品视频列表

新增商品维度接口，返回指定商品下视频列表。

建议接口：

`GET /api/products/[id]/videos`

返回字段以列表展示最小集为主：

- `id`
- `url`
- `thumbnail`
- `name`
- `createdAt`
- `prompt`
- `task.status`
- `ip.nickname`

### 全局视频列表

新增全局接口：

`GET /api/videos`

返回当前团队下视频列表，字段与商品视频列表基本一致，额外包含：

- `product.id`
- `product.name`

### 视频详情

新增详情接口：

`GET /api/videos/[videoId]`

返回完整详情对象，包含：

- video 基本信息
- product 基本信息
- ip 基本信息
- task 信息
- model image
- style image
- first frame
- scene material
- pose material
- movement material
- same product related videos

为了避免前端多次串行请求，详情页应使用单接口聚合返回。

## 服务层设计

建议在 `domains/video/service.ts` 基础上扩展 3 类查询：

1. `getVideosByProduct(productId, teamId)`
2. `getVideosByTeam(teamId)`
3. `getVideoDetail(videoId, teamId)`

约束：

- 所有查询都必须基于 `teamId` 做权限隔离
- 列表查询按 `createdAt desc`
- 详情查询若视频不属于当前团队，返回空或 404

`getVideoDetail` 需要集中完成关联关系装配，避免在 route 层堆叠查询逻辑。

## UI 组件设计

建议抽出通用组件，避免商品页和全局页重复实现：

- `components/video/VideoCard.tsx`
- `components/video/VideoGrid.tsx`
- `components/video/VideoPlayerPanel.tsx`
- `components/video/VideoTraceTimeline.tsx`
- `components/video/VideoTaskPanel.tsx`

复用策略：

- 商品页视频 tab 与全局视频页共用 `VideoCard` / `VideoGrid`
- 视频详情页使用剩余详情组件

## 空态与异常处理

### 商品视频 tab 空态

- 文案明确为“该商品还没有生成过视频”
- 提供“去生成视频”按钮，打开现有生成向导

### 全局视频页空态

- 文案明确为“当前还没有任何已生成视频”
- 提供跳转商品页或工作流页的入口

### 视频详情异常

- 视频不存在或无权限时返回 404 页面
- 追踪链路有缺失时页面仍可正常展示播放器和已有信息
- 任务失败时突出显示 `error`

## 测试策略

本次实现至少覆盖：

1. 服务层单测
   - 商品维度视频查询按时间倒序
   - 团队隔离生效
   - 详情查询正确装配追踪字段
   - 缺失追踪字段时仍返回可渲染结果

2. 路由层测试
   - 未登录返回 401
   - 无团队返回 400
   - 无权限视频返回 404 或空结果约定

3. 前端测试
   - 商品详情页能切换到视频 tab
   - 空列表与非空列表都能正确渲染
   - 点击视频卡片能进入详情页
   - 详情页能渲染时间线中的“未记录”状态

## 风险与约束

1. 历史视频数据可能没有完整的 `sceneId`、`poseId`、`modelImageId` 等追踪字段。
   处理方式：详情页允许部分缺失，显式展示“未记录”。

2. `video_tasks.params/result` 可能格式不统一。
   处理方式：前端做宽松渲染，优先格式化 JSON，回退到原文文本块。

3. 现有首页“视频 tab”如果只是视觉入口，改造时要避免影响首页其他模块。
   处理方式：将其职责收敛为跳转入口，不在首页内堆叠复杂视频列表逻辑。

## 推荐实施顺序

1. 扩展视频服务层查询能力
2. 新增 `/api/products/[id]/videos`
3. 新增 `/api/videos` 与 `/api/videos/[videoId]`
4. 实现通用视频卡片与列表组件
5. 在商品详情页加入“视频”tab
6. 新增全局视频列表页
7. 新增视频详情页
8. 补充单测与页面测试

## 验收标准

- 用户可以在商品详情页看到该商品的全部视频
- 用户可以从全局视频入口看到团队下全部视频
- 用户点击任意视频后可进入独立详情页播放
- 视频详情页能展示生成链路与任务信息
- 历史不完整数据不会导致详情页崩溃
