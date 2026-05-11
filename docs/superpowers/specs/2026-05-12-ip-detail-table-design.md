# IP 详情页表格化改造设计文档

## 1. 背景

优化 `/daily-publish-plan/ip/{ipId}?productId={productId}` 页面，将剪辑成片从列表形式改为表格形式，并增加 inline 编辑能力。

## 2. 改造内容

### 2.1 表格列设计

| 列名 | 字段 | 控件类型 | 说明 |
|------|------|---------|------|
| 视频 | url | 封面+播放 | 点击播放 |
| 音乐 | music_id | 文本展示 | 仅展示，剪辑时设置 |
| 模板 | template_name | 文本展示 | - |
| 封面图 | thumbnail | 图片上传 | 支持上传替换 |
| 发布标题 | title | 文本输入 | 可编辑 |
| 发布内容 | content | 文本输入 | 可编辑 |
| 状态 | status | 标签 | pending/completed/failed |
| 合格 | is_qualified | 复选框 | 开关 |
| 发布 | is_published | 复选框 | 开关 |
| 操作 | - | 按钮组 | AI填充/确认 |

### 2.2 顶部区域改造

**删除：**
- "选择发布视频 添加商品" 区块

**按钮调整：**
- "剪辑、新增" 按钮移入 "AI 生成视频" 区块

### 2.3 字段说明

- `music_id`：在剪辑流程中设置，表格中仅展示不可编辑
- `template_name`：剪辑时选择的模板名称，仅展示
- `thumbnail`：支持上传图片替换
- `title` / `content`：可 inline 编辑
- `is_qualified` / `is_published`：复选框开关

### 2.4 AI 填充按钮

AI 填充功能后续实现，当前页面先预留按钮位置。

## 3. API 需求

### 3.1 更新 VideoPush

```
POST /api/video-push/update
{
  "videoPushId": "xxx",
  "thumbnail": "url",
  "title": "string",
  "content": "string",
  "isQualified": boolean,
  "isPublished": boolean
}
```

### 3.2 获取背景音乐列表（素材库）

```
GET /api/materials?type=BACKGROUND_MUSIC
```

## 4. 实现计划

1. 改造页面组件，将 clips 列表改为表格展示
2. 实现 inline 编辑能力
3. 实现封面上传功能
4. 实现确认按钮提交更新
5. 调整顶部按钮布局

## 5. 状态说明

### VideoPush.status
| 状态 | 含义 |
|------|------|
| pending | 待处理 |
| clipping | 剪辑中 |
| completed | 已完成 |
| failed | 失败 |

### is_qualified / is_published
- 默认 false
- is_published = true 表示已发布
- is_qualified = true 表示达标可发布