# 数据库表结构文档

## 核心业务表

### 1. Team (团队)
**用途**: 团队/工作组

**字段**:
- id (PK): 团队唯一标识
- name: 团队名称

**唯一键**: `id` (主键)

---

### 2. User (用户)
**用途**: 用户账号

**字段**:
- id (PK): 用户唯一标识
- email: 邮箱（登录账号）
- passwordHash: 密码哈希
- nickname: 昵称
- teamId (FK): 所属团队

**唯一键**: `id` (主键), `email` (唯一索引)

---

### 3. InviteCode (邀请码)
**用途**: 团队邀请码

**字段**:
- id (PK): 邀请码唯一标识
- teamId (FK): 所属团队
- code: 邀请码
- used: 是否已使用
- usedBy: 使用者用户ID
- expiresAt: 过期时间

**唯一键**: `id` (主键), `code` (唯一索引)

---

### 4. VirtualIp (虚拟IP/模特)
**用途**: 虚拟IP模特信息

**字段**:
- id (PK): 虚拟IP唯一标识
- userId (FK): 创建者用户ID
- teamId (FK): 所属团队
- nickname: 昵称
- avatarUrl: 头像URL
- fullBodyUrl: 全身照URL
- threeViewUrl: 三视图URL
- nineViewUrl: 九视图URL
- 基本信息: age, gender, height, weight, bust, waist, hip, education, major, personality, catchphrase, hobbies, incomeLevel, occupation, smallHabit, familyBackground, city
- basicSetting: 基本设置JSON

**唯一键**: `id` (主键)

---

### 5. Material (素材)
**用途**: 共享素材库（姿势、妆容、饰品、场景）

**字段**:
- id (PK): 素材唯一标识
- userId (FK): 创建者用户ID
- teamId (FK): 所属团队
- visibility: 可见性 (PUBLIC/PERSONAL/TEAM)
- type: 素材类型 (SCENE/POSE/MAKEUP/ACCESSORY/OTHER)
- name: 素材名称
- description: 描述
- url: 素材URL
- tags: 标签

**唯一键**: `id` (主键)

---

### 6. IpMaterial (IP素材)
**用途**: 虚拟IP关联的专属素材（妆容、饰品、定制服装）

**字段**:
- id (PK): IP素材唯一标识
- ipId (FK): 所属虚拟IP
- userId (FK): 创建者用户ID
- type: IP素材类型 (MAKEUP/ACCESSORY/CUSTOMIZED_CLOTHING)
- name: 素材名称
- description: 描述
- tags: 标签
- fullBodyUrl: 全身URL
- threeViewUrl: 三视图URL
- nineViewUrl: 九视图URL
- materialId (FK): 关联的共享素材ID
- sourceIpMaterialId (FK): 源IP素材ID（用于派生）

**唯一键**: `id` (主键)

---

### 7. Workflow (工作流)
**用途**: 视频生成工作流配置

**字段**:
- id (PK): 工作流唯一标识
- code: 工作流代码
- name: 工作流名称
- description: 描述
- version: 版本号
- config: 配置JSON

**唯一键**: `id` (主键), `code` (唯一索引)

---

### 8. VideoTask (视频任务)
**用途**: 视频生成任务

**字段**:
- id (PK): 任务唯一标识
- userId (FK): 创建者用户ID
- teamId (FK): 所属团队
- workflowId (FK): 使用的工作流ID
- ipId (FK): 关联的虚拟IP
- status: 任务状态 (PENDING/RUNNING/COMPLETED/FAILED)
- params: 参数JSON
- result: 结果JSON
- error: 错误信息
- startedAt: 开始时间
- completedAt: 完成时间

**唯一键**: `id` (主键)

---

### 9. Product (产品)
**用途**: 产品信息

**字段**:
- id (PK): 产品唯一标识
- userId (FK): 创建者用户ID
- teamId (FK): 所属团队
- name: 产品名称
- targetAudience: 目标人群 (MENS/WOMENS/KIDS)
- productDetails: 产品详情
- displayActions: 展示动作
- tags: 标签JSON

**唯一键**: `id` (主键)

---

### 10. ProductImage (产品图片)
**用途**: 产品的主图和副图

**字段**:
- id (PK): 图片唯一标识
- productId (FK): 所属产品
- url: 图片URL
- isMain: 是否主图
- order: 排序顺序

**唯一键**: `id` (主键)
**外键**: `productId` -> Product.onDelete(Cascade)

---

### 11. Video (视频)
**用途**: 生成的视频记录

**字段**:
- id (PK): 视频唯一标识
- taskId (FK): 来源任务ID
- userId (FK): 创建者用户ID
- teamId (FK): 所属团队
- ipId (FK): 关联的虚拟IP
- productId (FK): 关联的产品ID
- name: 视频名称
- url: 视频URL
- thumbnail: 缩略图URL
- duration: 时长（秒）
- size: 文件大小

**唯一键**: `id` (主键)

---

### 11. MovementMaterial (动作素材)
**用途**: 视频动作素材库

**字段**:
- id (PK): 动作唯一标识
- url: 动作视频URL
- content: 动作描述
- clothing: 适用服装
- scope: 适用范围

**唯一键**: `id` (主键)

---

## 生成结果表（用于去重）

### 12. ModelImage (模特图)
**用途**: 生成的模特图记录（用于视频生成流程）

**字段**:
- id (PK): 记录唯一标识
- productId (FK): 产品ID
- ipId (FK): 虚拟IP ID
- url: 生成的模特图URL
- inputHash: 输入参数哈希（用于去重）

**唯一键**: `id` (主键)
**去重唯一索引**: `uniq_model_images_dedup` ON `(productId, ipId, inputHash)`

---

### 13. StyleImage (定妆图)
**用途**: 生成的定妆图记录

**字段**:
- id (PK): 记录唯一标识
- productId (FK): 产品ID
- ipId (FK): 虚拟IP ID
- modelImageId (FK): 来源模特图ID
- url: 生成的定妆图URL
- poseId (FK): 姿势ID
- makeupId (FK): 妆容ID
- accessoryId (FK): 饰品ID
- inputHash: 输入参数哈希

**唯一键**: `id` (主键)
**去重唯一索引**: `uniq_style_images_dedup` ON `(modelImageId, inputHash)`

---

### 14. FirstFrame (首帧图)
**用途**: 生成的首帧图记录

**字段**:
- id (PK): 记录唯一标识
- productId (FK): 产品ID
- ipId (FK): 虚拟IP ID
- styleImageId (FK): 来源定妆图ID
- url: 生成的首帧图URL
- sceneId (FK): 场景ID
- composition: 构图描述
- inputHash: 输入参数哈希

**唯一键**: `id` (主键)
**去重唯一索引**: `uniq_first_frames_dedup` ON `(productId, ipId, sceneId, inputHash)`

---

## 数据关系图

```
Team (1) ─── (N) User
Team (1) ─── (N) VirtualIp
Team (1) ─── (N) Product
Team (1) ─── (N) VideoTask
Team (1) ─── (N) Video

User (1) ─── (N) VirtualIp
User (1) ─── (N) Product
User (1) ─── (N) VideoTask
User (1) ─── (N) Video

VirtualIp (1) ─── (N) IpMaterial
VirtualIp (1) ─── (N) VideoTask
VirtualIp (1) ─── (N) Video

Product (1) ─── (N) ProductImage
Product (1) ─── (N) Video

Material (1) ─── (N) IpMaterial

VideoTask (1) ─── (N) Video

ModelImage (1) ─── (N) StyleImage
StyleImage (1) ─── (N) FirstFrame
```

（暂无待修复问题）
