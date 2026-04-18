# 虚拟 IP 带货视频智能体应用 — 架构设计

## 1. 项目概述

### 1.1 目标
为内容创作者/KOL 提供虚拟 IP 管理和智能视频生成能力，目标日产 50+ 条带货视频。

### 1.2 技术栈
- **前端**：Next.js + shadcn/ui（参考 Clay 设计风格）
- **后端**：Next.js API Routes + TypeScript
- **数据库**：MySQL（关系型）
- **文件存储**：本地文件系统
- **AI 集成**：ComfyUI 远程 API + 即梦/万象 可插拔 Provider
- **部署**：局域网

### 1.3 核心约束
- 单人开发，MVP 优先
- 多用户 + 团队协作 + RBAC 权限
- 邀请码机制
- 工作流由开发者内置，用户不可编辑，仅通过向导使用

---

## 2. 系统架构

### 2.1 分层架构

```
┌─────────────────────────────────────────────────────────┐
│ L3  Pages                                              │
│     /dashboard  /ip  /materials  /workflows  /videos   │
├─────────────────────────────────────────────────────────┤
│ L2  Domains                                             │
│     auth/  virtual-ip/  materials/  workflow/  video/ │
├─────────────────────────────────────────────────────────┤
│ L1  Foundation                                          │
│     providers/  hooks/  lib/  components/  types/      │
├─────────────────────────────────────────────────────────┤
│ L0  UI Primitives (shadcn/ui)                          │
└─────────────────────────────────────────────────────────┘
```

### 2.2 核心模块

| 模块 | 职责 | 依赖 |
|------|------|------|
| Auth | 用户认证、RBAC、邀请码、团队管理 | MySQL |
| Virtual IP | IP 定义、属性、形象图管理 | Auth, Materials |
| Materials | 素材库三级体系、IP 特有素材 | Virtual IP |
| Workflow | 节点图引擎、Tool Provider、任务调度 | Materials, Virtual IP |
| Video | 视频预览、下载、任务状态 | Workflow |

---

## 3. 数据模型

### 3.1 用户与团队

```sql
-- 团队：用户组，同一团队成员共享素材和工作流
CREATE TABLE teams (
  id          VARCHAR(36) PRIMARY KEY,              -- 唯一标识符 UUID
  name        VARCHAR(100) NOT NULL,                -- 团队名称
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,   -- 创建时间
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP  -- 更新时间
);

-- 用户：系统登录账号
CREATE TABLE users (
  id           VARCHAR(36) PRIMARY KEY,              -- 唯一标识符 UUID
  email        VARCHAR(255) UNIQUE NOT NULL,        -- 登录邮箱，唯一
  password_hash VARCHAR(255) NOT NULL,               -- 密码哈希值
  nickname     VARCHAR(50),                          -- 显示昵称
  team_id      VARCHAR(36),                         -- 所属团队 ID
  role         ENUM('admin', 'member') DEFAULT 'member',  -- 角色：admin 管理成员，member 普通成员
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 创建时间
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,  -- 更新时间
  FOREIGN KEY (team_id) REFERENCES teams(id)        -- 关联团队
);

-- 邀请码：团队邀请新成员加入
CREATE TABLE invite_codes (
  id          VARCHAR(36) PRIMARY KEY,              -- 唯一标识符 UUID
  team_id     VARCHAR(36) NOT NULL,                -- 所属团队 ID
  code        VARCHAR(20) UNIQUE NOT NULL,         -- 邀请码
  used        BOOLEAN DEFAULT FALSE,                -- 是否已被使用
  used_by     VARCHAR(36),                         -- 使用者邮箱（存储用户邮箱，非 ID）
  expires_at  DATETIME NOT NULL,                   -- 过期时间
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 创建时间
  FOREIGN KEY (team_id) REFERENCES teams(id)      -- 关联团队
);
```

### 3.2 虚拟 IP

```sql
-- 虚拟 IP 主表
-- 头像和形象图直接存储在主表，便于快速访问
CREATE TABLE virtual_ips (
  id              VARCHAR(36) PRIMARY KEY,                              -- 唯一标识符 UUID
  user_id         VARCHAR(36) NOT NULL,                                -- 创建者用户 ID
  team_id         VARCHAR(36) NOT NULL,                                 -- 所属团队 ID
  nickname        VARCHAR(50) NOT NULL,                                 -- IP 名称/昵称
  avatar_url      VARCHAR(500),                                         -- 头像图片 URL
  full_body_url   VARCHAR(500),                                         -- 全身图/平面图 URL
  three_view_url  VARCHAR(500),                                         -- 三视图 URL（正面+侧面+背面三合一）
  nine_view_url   VARCHAR(500),                                         -- 九视图 URL（9 个角度展示）
  age             INT,                                                   -- 年龄
  gender          ENUM('male', 'female', 'other'),                      -- 性别
  height          DECIMAL(5,2),                                         -- 身高 (cm)
  weight          DECIMAL(5,2),                                         -- 体重 (kg)
  bust            DECIMAL(5,2),                                          -- 胸围 (cm)
  waist           DECIMAL(5,2),                                          -- 腰围 (cm)
  hip             DECIMAL(5,2),                                          -- 臀围 (cm)
  education       VARCHAR(50),                                           -- 学历
  major           VARCHAR(100),                                          -- 专业/主修
  city            VARCHAR(50),                                           -- 所在城市
  occupation      VARCHAR(100),                                          -- 职业
  basic_setting   TEXT,                                                 -- 人物基础设定（背景故事等）
  catchphrase     VARCHAR(200),                                          -- 口头禅
  small_habit     VARCHAR(500),                                          -- 小癖好
  family_background TEXT,                                               -- 家庭背景
  income_level    VARCHAR(100),                                         -- 收入水平
  personality     VARCHAR(500),                                          -- 性格特点描述
  hobbies         VARCHAR(500),                                          -- 兴趣爱好
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,                    -- 创建时间
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,  -- 更新时间
  FOREIGN KEY (user_id) REFERENCES users(id),                            -- 关联创建者
  FOREIGN KEY (team_id) REFERENCES teams(id)                             -- 关联团队
);
```

### 3.3 素材库

```sql
-- 普通素材（公共/个人/团队可见）
CREATE TABLE materials (
  id          VARCHAR(36) PRIMARY KEY,                              -- 唯一标识符 UUID
  user_id     VARCHAR(36),                                          -- 创建者用户 ID，NULL 为系统公共素材
  team_id     VARCHAR(36),                                          -- 所属团队 ID，NULL 为个人素材
  visibility  ENUM('public', 'personal', 'team') NOT NULL,         -- 可见性：public 公共，personal 个人，team 团队
  type        ENUM('clothing', 'scene', 'action', 'makeup', 'accessory', 'other') NOT NULL,  -- 素材类型
  name        VARCHAR(100) NOT NULL,                                -- 素材名称
  description TEXT,                                                 -- 素材描述（创作过程说明等）
  url         VARCHAR(500) NOT NULL,                                -- 素材文件 URL
  tags        JSON,                                                 -- 标签数组：["tag1", "tag2"]
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,                    -- 创建时间
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,  -- 更新时间
  FOREIGN KEY (user_id) REFERENCES users(id),                        -- 关联创建者
  FOREIGN KEY (team_id) REFERENCES teams(id)                        -- 关联团队
);

-- IP 特有素材（妆容/装饰/服装，基于某 IP 生成的专属素材）
CREATE TABLE ip_materials (
  id                    VARCHAR(36) PRIMARY KEY,                              -- 唯一标识符 UUID
  ip_id                 VARCHAR(36) NOT NULL,                                -- 所属 IP ID
  user_id               VARCHAR(36) NOT NULL,                                -- 创建者用户 ID
  type                  ENUM('makeup', 'accessory', 'customized_clothing') NOT NULL,  -- 素材类型：makeup 妆容，accessory 装饰，customized_clothing 定制服装
  name                  VARCHAR(100) NOT NULL,                                -- 素材名称
  description           TEXT,                                                -- 素材描述
  tags                  JSON,                                                 -- 标签数组
  full_body_url         VARCHAR(500),                                         -- 全身图 URL（基于该 IP 生成的定妆图/服装图）
  three_view_url        VARCHAR(500),                                         -- 三视图 URL（基于该 IP 生成）
  nine_view_url         VARCHAR(500),                                         -- 九视图 URL（基于该 IP 生成）
  source_ip_material_id VARCHAR(36),                                         -- 自引用：指向 ip_materials 的另一条记录（表示基于哪个素材生成）
  material_id           VARCHAR(36),                                         -- 指向 materials 表（应用的素材类型）
  created_at            DATETIME DEFAULT CURRENT_TIMESTAMP,                    -- 创建时间
  updated_at            DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,  -- 更新时间
  FOREIGN KEY (ip_id) REFERENCES virtual_ips(id),                            -- 关联 IP
  FOREIGN KEY (user_id) REFERENCES users(id),                                -- 关联创建者
  FOREIGN KEY (source_ip_material_id) REFERENCES ip_materials(id),            -- 关联源素材（自引用）
  FOREIGN KEY (material_id) REFERENCES materials(id)                         -- 关联应用的素材
);
```

### 3.4 工作流与任务

```sql
-- 工作流定义（开发者内置，存储在代码中，DB 仅存元数据供展示）
CREATE TABLE workflows (
  id          VARCHAR(36) PRIMARY KEY,                              -- 唯一标识符 UUID
  code        VARCHAR(50) UNIQUE NOT NULL,                          -- 工作流唯一代码标识
  name        VARCHAR(100) NOT NULL,                                 -- 工作流名称
  description TEXT,                                                  -- 工作流描述
  version     VARCHAR(20) NOT NULL,                                  -- 版本号
  config      JSON,                                                  -- 工作流参数配置（节点参数等）
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,                    -- 创建时间
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP  -- 更新时间
);

-- 视频生成任务
CREATE TABLE video_tasks (
  id           VARCHAR(36) PRIMARY KEY,                              -- 唯一标识符 UUID
  user_id      VARCHAR(36) NOT NULL,                                  -- 创建者用户 ID
  team_id      VARCHAR(36) NOT NULL,                                  -- 所属团队 ID
  workflow_id  VARCHAR(36) NOT NULL,                                 -- 使用的工作流 ID
  ip_id        VARCHAR(36),                                          -- 关联的虚拟 IP ID
  status       ENUM('pending', 'running', 'completed', 'failed') DEFAULT 'pending',  -- 任务状态
  params       JSON,                                                  -- 用户填写的参数（素材选择等）
  result       JSON,                                                  -- 生成结果（输出文件路径等）
  error        TEXT,                                                  -- 错误信息
  started_at   DATETIME,                                              -- 开始执行时间
  completed_at DATETIME,                                              -- 完成时间
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,                    -- 创建时间
  FOREIGN KEY (user_id) REFERENCES users(id),                        -- 关联创建者
  FOREIGN KEY (team_id) REFERENCES teams(id),                        -- 关联团队
  FOREIGN KEY (workflow_id) REFERENCES workflows(id),                -- 关联工作流
  FOREIGN KEY (ip_id) REFERENCES virtual_ips(id)                      -- 关联 IP
);

-- 生成的视频
CREATE TABLE videos (
  id          VARCHAR(36) PRIMARY KEY,                              -- 唯一标识符 UUID
  task_id     VARCHAR(36) NOT NULL,                                  -- 所属任务 ID
  user_id     VARCHAR(36) NOT NULL,                                  -- 创建者用户 ID
  team_id     VARCHAR(36) NOT NULL,                                  -- 所属团队 ID
  ip_id       VARCHAR(36),                                          -- 关联的虚拟 IP ID
  name        VARCHAR(100),                                          -- 视频名称
  url         VARCHAR(500) NOT NULL,                                  -- 视频文件 URL
  thumbnail   VARCHAR(500),                                          -- 视频封面图 URL
  duration    INT,                                                   -- 视频时长（秒）
  size        BIGINT,                                               -- 文件大小（字节）
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,                    -- 创建时间
  FOREIGN KEY (task_id) REFERENCES video_tasks(id),                  -- 关联任务
  FOREIGN KEY (user_id) REFERENCES users(id),                        -- 关联创建者
  FOREIGN KEY (team_id) REFERENCES teams(id),                        -- 关联团队
  FOREIGN KEY (ip_id) REFERENCES virtual_ips(id)                    -- 关联 IP
);
```

---

## 4. 工作流引擎设计

### 4.1 核心抽象

```typescript
// 提示词核心要素（输入输出端口类型）
type PromptElement =
  | 'character'      // 人物图片
  | 'clothing'       // 服装图片
  | 'product'        // 商品图片
  | 'scene'          // 场景图片
  | 'action'         // 动作
  | 'expression'     // 表情
  | 'makeup'         // 妆容
  | 'lighting'       // 光影
  | 'composition'    // 构图
  | 'special'        // 特殊要求
  | 'video';         // 最终视频（仅输出）

// 工具节点
interface ToolNode {
  id: string;
  name: string;
  description: string;
  inputs: Port[];    // 输入端口
  outputs: Port[];    // 输出端口
  execute: (inputs: Record<string, any>, ctx: ExecutionContext) => Promise<Record<string, any>>;
}

interface Port {
  name: string;
  type: PromptElement;
  required: boolean;
  default?: any;
}

// 工作流定义
interface Workflow {
  id: string;
  name: string;
  nodes: ToolNode[];
  edges: Edge[];      // 节点连线
}

interface Edge {
  from: { nodeId: string; port: string };
  to: { nodeId: string; port: string };
}
```

### 4.2 工具 Provider 架构

```
┌─────────────────────────────────────────────────────┐
│              WorkflowEngine                        │
│   (节点图执行器，状态机驱动，异步任务调度)          │
└─────────────────────┬───────────────────────────────┘
                      │
         ┌────────────▼────────────┐
         │   ToolProviderRegistry  │  ← 工具注册中心
         │   (适配器工厂)           │
         └────────────┬────────────┘
                      │
    ┌─────────────────┼─────────────────┐
    │                 │                 │
┌───▼───┐      ┌──────▼─────┐    ┌──────▼─────┐
│ComfyUI│      │ Jiemeng   │    │  Jixiang   │
│Provider│     │ Provider  │    │  Provider  │
└────────┘      └───────────┘    └────────────┘
```

```typescript
// 工具提供者接口
interface ToolProvider {
  providerName: string;                          // 'comfyui' | 'jiemeng' | 'jixiang'
  execute(nodeId: string, inputs: Record<string, any>): Promise<Record<string, any>>;
  getCapabilities(): ProviderCapabilities;
  healthCheck(): Promise<boolean>;
}

// 工作流节点到工具的映射
interface NodeBinding {
  nodeId: string;
  provider: ToolProvider;
  endpoint: string;          // 实际 API endpoint
  timeout: number;           // 超时时间
  retry: number;             // 重试次数
}
```

### 4.3 内置工作流示例

```typescript
// 示例：口红带货视频工作流
const LipstickWorkflow: Workflow = {
  id: 'lipstick-promo',
  name: '口红带货视频',
  nodes: [
    {
      id: 'generate_character',
      name: '生成人物',
      inputs: [
        { name: 'character', type: 'character', required: true },
        { name: 'makeup', type: 'makeup', required: false },
        { name: 'accessory', type: 'accessory', required: false },
      ],
      outputs: [
        { name: 'posed_character', type: 'character' },
      ],
      execute: async (inputs, ctx) => { /* 调用 Provider */ },
    },
    {
      id: 'place_product',
      name: '植入商品',
      inputs: [
        { name: 'character', type: 'character', required: true },
        { name: 'product', type: 'product', required: true },
        { name: 'scene', type: 'scene', required: true },
      ],
      outputs: [
        { name: 'composed', type: 'character' },
      ],
      execute: async (inputs, ctx) => { /* ... */ },
    },
    {
      id: 'generate_video',
      name: '生成视频',
      inputs: [
        { name: 'character', type: 'character', required: true },
        { name: 'action', type: 'action', required: true },
        { name: 'expression', type: 'expression', required: true },
        { name: 'lighting', type: 'lighting', required: false },
        { name: 'composition', type: 'composition', required: false },
      ],
      outputs: [
        { name: 'video', type: 'video', required: true },
      ],
      execute: async (inputs, ctx) => { /* ... */ },
    },
  ],
  edges: [
    { from: { nodeId: 'generate_character', port: 'posed_character' },
      to:   { nodeId: 'place_product', port: 'character' } },
    { from: { nodeId: 'place_product', port: 'composed' },
      to:   { nodeId: 'generate_video', port: 'character' } },
  ],
};
```

---

## 5. API 设计

### 5.1 认证

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/auth/register | 注册（需邀请码） |
| POST | /api/auth/login | 登录 |
| POST | /api/auth/logout | 登出 |
| GET | /api/auth/me | 当前用户信息 |

### 5.2 虚拟 IP

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/ips | 列表（团队内） |
| POST | /api/ips | 创建 |
| GET | /api/ips/:id | 详情 |
| PUT | /api/ips/:id | 更新 |
| DELETE | /api/ips/:id | 删除 |
| POST | /api/ips/:id/images | 上传形象图 |
| POST | /api/ips/generate-views | AI 生成三视图/九视图 |

### 5.3 素材库

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/materials | 列表（支持筛选） |
| POST | /api/materials | 上传素材 |
| GET | /api/materials/:id | 详情 |
| DELETE | /api/materials/:id | 删除 |
| GET | /api/materials/ip/:ipId | 某 IP 的特有素材 |
| POST | /api/materials/ip/:ipId/makeup | 生成妆容（触发工作流） |
| POST | /api/materials/ip/:ipId/accessory | 生成装饰 |
| GET | /api/materials/types/:type | 按类型查询（clothing/scene/action/makeup/accessory） |

### 5.4 工作流

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/workflows | 可用工作流列表 |
| GET | /api/workflows/:code | 工作流定义详情 |
| POST | /api/workflows/:code/preview | 预览工作流参数 |
| POST | /api/workflows/:code/execute | 触发生成（异步） |

### 5.5 视频任务

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/tasks | 任务列表 |
| GET | /api/tasks/:id | 任务详情 |
| GET | /api/tasks/:id/status | 轮询状态 |
| GET | /api/videos | 视频列表 |
| GET | /api/videos/:id | 视频详情 |
| GET | /api/videos/:id/download | 下载视频 |

---

## 6. 向导式视频生成流程

```
Step 1: 选择工作流
  └─ 展示可用工作流卡片，用户选择一个

Step 2: 选择虚拟 IP
  └─ 下拉选择（展示该团队创建的 IP）

Step 3: 填写素材参数（根据工作流定义的 inputs）
  ├─ 选择服装 → 从素材库筛选
  ├─ 选择场景 → 从素材库筛选
  ├─ 选择妆容 → 从 IP 特有素材选择
  ├─ 选择动作/表情/光影 → 枚举选择或文字描述
  └─ 特殊要求 → 文本框

Step 4: 预览确认
  └─ 展示完整参数和工作流图，用户确认

Step 5: 执行 & 跳转任务列表
  └─ 跳转到任务列表，显示 pending 状态

Step 6: 任务完成
  └─ 任务列表更新状态，用户点击查看/下载
```

---

## 7. 妆容/装饰生成流程（素材库触发）

```
1. 用户进入素材库 → 选择 IP 特有素材tab
2. 点击"添加妆容"或"添加装饰"
3. 选择源人物图片：
   ├─ 原始人物图（从 IP 的 ip_images 选择）
   └─ 素材库已有图片（从 materials 选择）
4. 选择妆容/装饰类型
5. 提交 → 调用 Provider 生成定妆平面图
6. 定妆图生成后 → 自动调用三视图/九视图生成工具
7. 产物存 ip_materials：
   {
     front_url, side_url, back_url, nine_view_url, source_image_id
   }
8. 用户可在 IP 详情页查看全套图片
```

---

## 8. 团队权限模型（RBAC）

### 8.1 角色

| 角色 | 权限 |
|------|------|
| admin | 管理团队成员、CRUD 所有资源、删除团队 |
| member | CRUD 自己创建的资源、查看团队共享资源 |

### 8.2 资源权限矩阵

| 资源 | admin | member |
|------|-------|--------|
| 团队成员管理 | 增删 | - |
| 团队公共素材 | CRUD | 读 |
| 团队工作流 | 读 | 读 |
| 个人素材 | - | CRUD |
| 自己创建的 IP | - | CRUD |
| 自己创建的视频任务 | - | CRUD |
| 其他人资源 | 删除 | - |

---

## 9. 文件存储结构

```
/uploads
├── /teams
│   └── /{team_id}
│       ├── /ips
│       │   └── /{ip_id}
│       │       ├── avatar.jpg
│       │       ├── front.jpg
│       │       ├── side.jpg
│       │       ├── back.jpg
│       │       └── nine_view.jpg
│       ├── /ip_materials
│       │   └── /{ip_material_id}
│       │       ├── front.jpg
│       │       ├── side.jpg
│       │       ├── back.jpg
│       │       └── nine_view.jpg
│       ├── /materials
│       │   └── /{material_id}
│       │       └── file.jpg
│       └── /videos
│           └── /{video_id}
│               └── video.mp4
```

---

## 10. 组件清单

### 10.1 布局组件
- `AppShell` — 整体布局框架（侧边栏 + 主内容）
- `Sidebar` — 导航侧边栏
- `TopBar` — 顶部栏（用户信息 + 团队切换）

### 10.2 认证组件
- `LoginForm` — 登录表单
- `RegisterForm` — 注册表单（需邀请码）
- `InviteCodeInput` — 邀请码输入

### 10.3 虚拟 IP 组件
- `IpCard` — IP 卡片（头像 + 昵称 + 简介）
- `IpForm` — IP 创建/编辑表单
- `IpImageUploader` — 形象图上传器
- `IpDetailClient` — IP 详情页客户端组件（包含图片展示、编辑、详情信息）

### 10.4 素材库组件
- `MaterialCard` — 素材卡片（图片 + 名称 + tag）
- `MaterialUploader` — 素材上传
- `MaterialFilter` — 筛选器（类型 + IP + tag + 可见性）
- `IpMaterialManager` — IP 特有素材管理

### 10.5 工作流组件
- `WorkflowCard` — 工作流卡片（展示给用户选择）
- `WizardStepper` — 向导步骤指示器
- `IpSelector` — IP 选择步骤
- `MaterialSelector` — 素材选择步骤（筛选 + 搜索）
- `WorkflowConfirm` — 预览确认步骤
- `TaskStatusBadge` — 任务状态徽章

### 10.6 视频组件
- `VideoList` — 视频列表
- `VideoPlayer` — 视频播放器（在线播放）
- `VideoDownloader` — 下载按钮

---

## 11. 开发优先级

### Phase 1: 基础设施
1. 项目脚手架（Next.js + shadcn/ui + Clay 设计）
2. MySQL 连接 + Prisma ORM
3. Auth 模块（注册/登录/邀请码/团队）
4. RBAC 中间件

### Phase 2: 核心资产
5. 虚拟 IP CRUD + 形象图上传
6. 素材库 CRUD + 文件上传
7. IP 特有素材（妆容/装饰生成流程）

### Phase 3: 工作流引擎
8. ToolProvider 抽象 + Registry
9. 节点图执行引擎
10. ComfyUI Provider 实现

### Phase 4: 视频生成
11. 向导式视频生成 UI
12. 异步任务调度 + 状态轮询
13. 视频列表 + 播放/下载

### Phase 5: 完善
14. 首页仪表盘
15. 更多工作流内置
16. 即梦/万象 Provider 扩展

---

## 12. 技术选型清单

| 领域 | 选型 | 理由 |
|------|------|------|
| 框架 | Next.js 14 (App Router) | 全栈 React，社区成熟 |
| UI 库 | shadcn/ui + Tailwind | 快速开发，定制灵活 |
| 设计风格 | Clay UI | PRD 指定 warm cream + playful hover |
| ORM | Prisma | Type-safe，迁移方便 |
| 数据库 | MySQL 8 | 用户指定 |
| 认证 | NextAuth.js | 开源，支持多种 Provider |
| 状态管理 | Zustand | 轻量，够用 |
| 表单 | React Hook Form + Zod | 类型安全，验证方便 |
| 任务队列 | 内存队列（单机） | MVP 阶段，局域网低并发 |
| 文件上传 | multipart/form-data + local fs | 用户指定本地存储 |

---

## 13. 目录结构

```
media_ai/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx              # AppShell
│   │   ├── dashboard/page.tsx
│   │   ├── ips/
│   │   │   ├── page.tsx           # IP 列表
│   │   │   ├── new/page.tsx       # 创建 IP
│   │   │   └── [id]/page.tsx      # IP 详情
│   │   ├── materials/
│   │   │   ├── page.tsx           # 素材库
│   │   │   └── ip/[ipId]/page.tsx # IP 特有素材
│   │   ├── workflows/
│   │   │   ├── page.tsx           # 工作流选择
│   │   │   └── [code]/wizard/     # 向导式生成
│   │   │       ├── step1.tsx
│   │   │       ├── step2.tsx
│   │   │       ├── step3.tsx
│   │   │       ├── step4.tsx
│   │   │       └── page.tsx
│   │   ├── tasks/page.tsx         # 任务列表
│   │   └── videos/page.tsx        # 视频列表
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── ips/route.ts
│   │   ├── ips/[id]/route.ts
│   │   ├── ips/[id]/images/route.ts
│   │   ├── materials/route.ts
│   │   ├── materials/[id]/route.ts
│   │   ├── materials/ip/[ipId]/route.ts
│   │   ├── workflows/route.ts
│   │   ├── workflows/[code]/route.ts
│   │   ├── workflows/[code]/execute/route.ts
│   │   ├── tasks/route.ts
│   │   ├── tasks/[id]/route.ts
│   │   └── videos/[id]/route.ts
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                        # shadcn/ui primitives
│   ├── layout/
│   │   ├── AppShell.tsx
│   │   ├── Sidebar.tsx
│   │   └── TopBar.tsx
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   └── RegisterForm.tsx
│   ├── ip/
│   │   ├── IpCard.tsx
│   │   ├── IpForm.tsx
│   │   ├── IpImageUploader.tsx
│   │   └── IpImageGallery.tsx
│   ├── material/
│   │   ├── MaterialCard.tsx
│   │   ├── MaterialUploader.tsx
│   │   ├── MaterialFilter.tsx
│   │   └── IpMaterialManager.tsx
│   ├── workflow/
│   │   ├── WorkflowCard.tsx
│   │   ├── WizardStepper.tsx
│   │   ├── IpSelector.tsx
│   │   ├── MaterialSelector.tsx
│   │   └── WorkflowConfirm.tsx
│   ├── video/
│   │   ├── VideoList.tsx
│   │   ├── VideoPlayer.tsx
│   │   └── TaskStatusBadge.tsx
│   └── providers/
│       ├── AuthProvider.tsx
│       └── QueryProvider.tsx
├── foundation/
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useTeam.ts
│   │   └── usePermissions.ts
│   ├── lib/
│   │   ├── db.ts           # Prisma client
│   │   ├── api.ts         # API client
│   │   └── utils.ts
│   └── types/
│       ├── auth.ts
│       ├── ip.ts
│       ├── material.ts
│       └── workflow.ts
├── domains/
│   ├── auth/
│   │   ├── types.ts
│   │   ├── validators.ts
│   │   └── service.ts
│   ├── virtual-ip/
│   │   ├── types.ts
│   │   ├── validators.ts
│   │   ├── service.ts
│   │   └── components/
│   ├── materials/
│   │   ├── types.ts
│   │   ├── validators.ts
│   │   ├── service.ts
│   │   └── components/
│   ├── workflow/
│   │   ├── types.ts
│   │   ├── engine.ts           # 节点图执行引擎
│   │   ├── registry.ts         # Provider 注册中心
│   │   ├── providers/
│   │   │   ├── interface.ts
│   │   │   ├── comfyui.ts
│   │   │   ├── jiemeng.ts
│   │   │   └── jixiang.ts
│   │   └── built-in/
│   │       ├── lipstick-promo.ts
│   │       └── skincare-promo.ts
│   └── video/
│       ├── types.ts
│       ├── service.ts
│       └── components/
├── prisma/
│   └── schema.prisma
├── public/
│   └── uploads/                 # 软链接或实际存储
└── package.json
```

---

## 14. 待确认事项

以下问题在后续阶段确认：

1. **AI 生成人物形象**：AI 从零生成虚拟 IP 的具体实现方式（接入哪个 Provider？）
2. **ComfyUI 远程地址**：ComfyUI 服务的部署地址和端口
3. **即梦/万象 Provider**：具体使用哪家，API 文档是否到位
4. **视频分享链接**：是否真的需要局域网分享功能
5. **WebSocket 推送**：后续是否升级任务通知为实时推送

---

## 15. 风险与对策

| 风险 | 对策 |
|------|------|
| 单人开发周期长 | 分 Phase，Phase 1 先跑通最小闭环 |
| 工具 Provider 接入复杂 | 先内置 ComfyUI Provider 作为参考实现 |
| 素材库查询性能 | MySQL 索引 + 分页，MVP 阶段足够 |
| 视频生成耗时 | 异步任务 + 状态轮询，不阻塞 UI |
