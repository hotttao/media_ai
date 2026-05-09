# 工具开发文档

本目录包含项目中各类工具的开发文档和使用指南。

## 文档索引

### 即梦 AI 工具

| 文档 | 说明 |
|------|------|
| [jimeng-cli.md](./jimeng-cli.md) | 即梦 CLI 命令行工具完整使用文档 |
| [image-blend.md](./image-blend.md) | 双图编辑功能的技术实现和接口文档 |

### CapCut CLI 工具

| 文档 | 说明 |
|------|------|
| [capcut-cli.md](./capcut-cli.md) | CapCut CLI 接口协议文档（Provider 定义契约） |

## 快速开始

### 使用双图编辑

1. 访问 `/tools` 页面
2. 点击"双图编辑"工具卡片
3. 点击"立即使用"
4. 上传两张图片
5. 输入编辑描述
6. 点击生成按钮

### 调用 API

```bash
curl -X POST http://localhost:3000/api/tools/image-blend \
  -H "Content-Type: application/json" \
  -d '{
    "imageA": "https://example.com/image-a.jpg",
    "imageB": "https://example.com/image-b.jpg",
    "prompt": "将图片B中的人物融合到图片A的场景中"
  }'
```

## 开发指南

### 添加新工具

1. 在 `foundation/providers/` 创建 Provider 类
2. 在 `app/api/tools/` 创建 API 路由
3. 在 `app/(app)/tools/` 创建工具页面
4. 在 `app/api/tools/route.ts` 注册工具
5. 更新 `app/(app)/tools/page.tsx` 添加跳转链接
6. 编写文档

### Provider 类结构

```typescript
export class XxxProvider {
  providerName = 'xxx'

  async execute(toolId: string, inputs: Record<string, string | null>): Promise<ToolResult> {
    // 实现逻辑
  }
}
```
