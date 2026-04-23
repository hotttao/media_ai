# 即梦 CLI 使用文档

## 概述

即梦 CLI (dreamina) 是一个命令行工具，用于调用字节跳动的 AI 生成服务，支持图生视频、多图编辑等功能。

## 基础命令格式

### 1. 图生视频 (image2video)

将单张图片生成视频。

```bash
dreamina image2video \
  --image /path/to/image.png \
  --prompt="镜头慢慢推近" \
  --duration=5 \
  --poll=30
```

**参数说明：**

| 参数 | 必填 | 说明 | 默认值 |
|------|------|------|--------|
| `--image` | 是 | 输入图片路径 | - |
| `--prompt` | 是 | 视频描述/动作指令 | - |
| `--duration` | 否 | 视频时长(秒) | 5 |
| `--ratio` | 否 | 画面比例 | 9:16 |
| `--model_version` | 否 | 模型版本 | seedance2.0 |
| `--video_resolution` | 否 | 视频分辨率 | 720p |

### 2. 多图混合视频 (multimodal2video)

将多张图片混合生成视频，支持指定图片中的人物关系。

```bash
dreamina multimodal2video \
  --image "/path/to/image1.jpg" \
  --image "/path/to/image2.jpg" \
  --prompt="@图片1 是人物'西门孝哥'。@图片2 是人物'冷凝'。西门孝哥悬浮于半空，冷凝瘫坐在地。照片级真实，电影质感。" \
  --duration 5 \
  --ratio 9:16 \
  --model_version seedance2.0 \
  --video_resolution 720p
```

**参数说明：**

| 参数 | 必填 | 说明 | 默认值 |
|------|------|------|--------|
| `--image` | 是 | 输入图片路径，可多个 | - |
| `--prompt` | 是 | 视频描述，支持 @图片N 引用特定图片 | - |
| `--duration` | 否 | 视频时长(秒) | 5 |
| `--ratio` | 否 | 画面比例 | 9:16 |
| `--model_version` | 否 | 模型版本 | seedance2.0 |
| `--video_resolution` | 否 | 视频分辨率 | 720p |

### 3. 查询任务结果 (query_result)

根据 submit_id 查询任务结果。

```bash
# 查询结果
dreamina query_result --submit_id=<your_submit_id>

# 查询结果并下载到指定目录
dreamina query_result --submit_id=<your_submit_id> --download_dir=./downloads
```

### 4. 列出任务 (list_task)

查看已提交的任务列表。

```bash
# 查看所有任务
dreamina list_task

# 仅查看成功的任务
dreamina list_task --gen_status=success

# 根据 submit_id 筛选特定任务
dreamina list_task --submit_id=<your_submit_id>
```

## 输出说明

### 任务提交成功

提交任务后会返回 `submit_id`：
```
submit_id=abc123def456
```

### 任务状态

- `SUCCESS` - 任务成功完成
- `FAILED` - 任务失败
- `PENDING` / `PROCESSING` - 处理中

## 常见问题

### 1. 轮询超时

如果任务处理时间过长，可以使用 `--poll` 参数指定轮询间隔秒数。

### 2. 异步任务处理

对于未使用 `--poll` 或轮询超时的任务，会返回 `submit_id`，需要手动调用 `query_result` 查询结果。

### 3. 图片格式

支持 jpg、png 等常见图片格式，建议使用 1024x1024 或更高分辨率的图片。

## 与项目集成

项目中通过 `JimengCliProvider` 类封装 CLI 调用，详见：
- `foundation/providers/JimengCliProvider.ts`
