
## 虚拟IP带货视频的智能体应用
我想做一个虚拟ip人物以及用这个虚拟人物生成带货视频的智能体应用。形态是一个 web 应用。这是关于这个应用应该包含哪些功能的详细文档。

应用概述:
1. 目标用户: 内容创作者\网红\KOL
2. 目标: 降低用户生成带货视频的成本，提高效率。能日产 50+ 条视频


## 1. 功能点一: 虚拟ip定义

每个虚拟ip包括多维度的属性信息，这些信息随着应用的完善会不断扩展:

### 1.1 基本信息
1. 年龄
2. 性别
3. 身高
4. 体重
5. 三围
6. 学历
7. 专业
8. 人物平面图
9. 人物三视图
10. 人物九视图
11. 昵称
12. 头像
13. 简介

### 1.2 人物性格
1. 性格
2. 经典装饰（这个人物喜欢佩戴的饰品，比如说发卡，手表）
3. 经典动作（在拍摄视频的招牌动作，能侧面体现人物性格）等等。
4. 口头禅

这一部分信息是为了后面生成视频，让人物更加真实并且有个性，不会那么ai化。

### 1.3 人物平台信息
1. 虚拟IP 已经注册的平台信息，可注册的平台包括抖音，视频号，快手，小红书等等
2. 账号ID

等等

## 2. 功能点二: 视频生成提示词。

### 2.1 提示词核心要素
首先我认为一个带货视频包括如下核心部分

|核心要素|表现形式|要素解释|
|:---|:---|:---|
|人物|图片，平面图、三视图、九视图||
|服装|图片|人物所穿戴的服装|
|商品|图片|商品的平面图、三视图，如果商品是衣服，无需这一部分，直接使用服装|
|场景|图片|人物所在场景|
|动作|文字，视频|动作的表现形式，经过动作迁移模型抽象后保留的动作视频信息|
|表情|文字|人物的表情|
|妆容|文字|在人物图片上生成的定妆图片|
|光影|文字|光影的表现形式，通常要跟场景适配|
|构图|文字|表述人物在这个图里边的构图|
|特殊要求|文字|特殊的要求，比如说人物在视频中需要出现的场景，或者人物在视频中需要出现的物品|

用户生成视频的方式工具可能有多种，具体方式后面会讨论。但是无论那种方式都需要包括上述核心要素。

## 2.2 素材库
应用需要给每一个核心建立一个素材库，系统可以提供默认共享的素材库，用户也可以上传自己的素材库


## 3. 功能点三: 视频生成。

视频生成有多种方式，每个方式对应一组不同的工具和生成流程。为了详细说明这个流程，我们先需要讲清楚系统可使用的工具。

### 3.1 视频生成工具设计
所有的工具:
1. 可以包含多数输入，每一个输入都对应一个前面提到的提示词核心要素
2. 可以包含多数输出，每一个输出都对应一个前面提到的提示词核心要素或者最终生成的带货视频，如果是最终生成的带货视频，输出只能是一个视频。
3. 多个工具组合在一起可以形成一个视频生成流程。这个视频生成流程的最终输出是一个带货视频。

目前系统支持的工具有两种:
1. 基于即梦、万象等大模型生成的工具
2. 基于 comfyui 工作流生成的工具

### 3.2 视频生成的工作流
1. 用户首先要选择一个虚拟 IP
2. 选择一个视频生成方式，选择完成后，会根据视频生成方式对应的输入显示，用户需要输入的核心要素。
3. 生成最终视频生成的提示词和所包含的所有核心素材，展示给用户确认
4. 确认生成视频，调用视频生成工作流，生成视频

虽然上面提到了很多提示词核心要素。但是这些提示词不一定都需要作为工作流的输入，他们有不同的生效阶段。这样可以更加精细化控制视频生成过程。下面是一些典型的阶段。

### 3.3 添加妆容
当用户添加妆容时，可以让用户选择人物、服装，生成带妆容的人物平面图、三视图、九视图。工作流在使用人物时，可以选择原始人物图，也可以直接使用带定妆照的人物图。

### 3.4 添加经典装饰
过程与添加妆容相同，生成带装饰的人物平面图、三视图、九视图。

## 4. 首页以及其他功能

首页:
1. 需要包含一个聊天窗口，这个后面我会实现一个智能体，自动生成视频，这个功能暂时保留，只保留一个对话框即可。
2. 中部需要把所有可用工作作为卡片，供用户查看使用
3. 底部用户可以查看和维护自己的资产。包括素材库以及最终生成的视频。


## 4. 产品库
虚拟IP 的最终目标是生成带货视频。所以需要增加一个产品库。由于不同的品类，展示方式差异非常巨大。所以我不打算通用支持所有品类。目前只支持服装这一个品类。

### 4.1 产品库设计
1. 用户可以上传产品图片。在上传时可以添加各种描述信息，包括产品名称、适用人群(男装、女装、童装等)、产品细节、展示动作。数据保存在 product 表中。
2. 除了一张产品图，用户还能上传多张产品副图。除了产品图，用户还能添加多张产品细节图，展示产品的设计用料等等细节。
2. 下面是关于展示动作的详细的描述:
    - 这个动作是和产品细节以及核心要素里的动作相关联的。动作的核心是展示产品的细节，突出卖点
    - 后续系统会根据产品库里填写的展示动作，去核心要素的动作库里搜索匹配动作，作为推荐，供用户使用
    - 我的想法是，每个产品都有一些特殊设计、特点。需要设计一些动作展示这些细节。产品特点、特殊动作、动作素材库最终会都会作为输入提示词，用于生成视频
3. 因为当前限定是服装品类。所以服装是商品同样也是素材库。

### 4.2 服装视频生成流程
服装视频的生成流程如下:
1. 用户选择一个商品
2. 用户选择一个虚拟IP
3. 生成虚拟 IP 穿着服装的模特图: 
    - 这一步，用户需要从产品素材库中选择一张产品图、多张产品细节图
    - 结合虚拟 IP 的全身图调用模特图生成工具。生成虚拟 IP 穿着服装的模特图。
    - 每个 IP，每个产品，只能有一张模特图，如果产品素材库中有模特图，用户可以直接选择使用，也可以从头生成。然后覆盖产品素材库中的模特图。
4. 生成虚拟IP 的定妆图(原名称为效果图)
    - 这一步需要用户选择如下核心要素
        a. 姿势
        b. 妆容(可选)
        c. 饰品
    - 结合虚拟 IP 的模特图，调用定妆图生成工具生成定妆图。
    - 将生成的效果图更新到产品素材库表 product_materials 中。
    - 每一个IP 每个产品，可以有多张定妆图。用户可以直接从产品的定妆图中直接选择。
5. 生成首帧图:
    - 这一步用户需要选择如下核心要素:
        - 场景
        - 构图(可选)
    - 结合虚拟 IP 的模特图，调用场景替换工具生成首帧图。
    - 将生成的首帧图更新到产品素材库表 product_materials 中。用户也可以直接从产品素材中的首帧图直接选择。
6. 生成视频
    - 这一步需要用户选择如下核心要素:
        - 动作
    - 结合首帧，调用视频生成工具，生成带货视频。
7. 最终生成的视频保存到用户视频资产中。这个表可能还没有需要设计一下。    

### 4.3 使用到的工具
1. 双图编辑工具: 输入是两个图片，以及多张副图、和一段提示描述，用于完成图片编辑。
2. 多图编辑工具: 输入是多张图片，和一段提示描述，内部多次调用双图编辑工具，每次输入的是上一步处理好的图以及另一张图。完成多张图片的编辑。
3. 模特图生成工具: 内部调用双图编辑工具，内置提示词
4. 定妆图生成工具: 内部调用双图编辑工具，内置提示词
1. 场景替换工具: 内部调用双图编辑工具，内置提示词。输入是两张图片，和一段提示描述，用于将任务放置到特定场景中。
2. 图生视频工具
4. 动作迁移工具

### 4.4 如何使用工具
1. 如果动作是文字，调用图生视频工具，传入首帧图、动作提示词，生成视频
3. 如果动作是视频，调用动作迁移工具，传入首帧图、动作视频，生成视频


## 5. 素材库更新

针对服装，视频核心要素包括:
|核心要素|表现形式|要素解释|保存|
|:---|:---|:---|:---|
|人物|图片，平面图、三视图、九视图|保存在 ip_materials 表中|、
|服装|图片|人物所穿戴的服装|保存在 product_materials 中|
|商品|图片|商品的描述信息、平面图、三视图|保存在 product 表中|
|场景|图片|人物所在场景|保存在 materials 中|
|饰品|图片|人物穿戴的饰品|保存在 materials 中|
|动作|视频|动作的表现形式，经过动作迁移模型抽象后保留的动作视频信息|movement_materials 表中|
|表情|文字|人物的表情|保存在 materials 中|
|妆容|文字|在人物图片上生成的定妆图片|保存在 materials 中|
|光影|文字|光影的表现形式，通常要跟场景适配|保存在 materials 中|
|构图|文字|表述人物在这个图里边的构图|保存在 materials 中|
|特殊要求|文字|特殊的要求，比如说人物在视频中需要出现的场景，或者人物在视频中需要出现的物品|保存在 materials 中|

### 5.1 数据库更新
#### materials 表更新
materials 表结构：
```sql
CREATE TABLE materials (
  id          VARCHAR(36) PRIMARY KEY,                              -- 唯一标识符 UUID
  user_id     VARCHAR(36),                                          -- 创建者用户 ID，NULL 为系统公共素材
  team_id     VARCHAR(36),                                          -- 所属团队 ID，NULL 为个人素材
  visibility  ENUM('public', 'personal', 'team') NOT NULL,         -- 可见性：public 公共，personal 个人，team 团队
  type        ENUM('scene', 'pose', 'makeup', 'accessory', 'other') NOT NULL,  -- 素材类型
  name        VARCHAR(100) NOT NULL,                                -- 素材名称
  description TEXT,                                                 -- 素材描述（创作过程说明等）
  url         VARCHAR(500) NOT NULL,                                -- 素材文件 URL
  tags        JSON,                                                 -- 标签数组：["tag1", "tag2"]
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,                    -- 创建时间
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,  -- 更新时间
  FOREIGN KEY (user_id) REFERENCES users(id),                        -- 关联创建者
  FOREIGN KEY (team_id) REFERENCES teams(id)                        -- 关联团队
);
```

**素材类型说明：**
- scene: 场景素材
- pose: 姿势素材（图片或文字描述）
- makeup: 妆容素材
- accessory: 饰品素材
- other: 其他素材


#### 生成结果表设计（拆分方案）

为支持"不重复生成"逻辑，将 `product_materials` 拆分为三张独立表：

**模特图表 (model_images)**
| 字段 | 类型 | 说明 |
|-----|------|------|
| id | VARCHAR(36) | 主键 UUID |
| product_id | VARCHAR(36) | 商品 ID |
| ip_id | VARCHAR(36) | 虚拟 IP ID |
| url | VARCHAR(500) | 生成的模特图 URL |
| input_hash | VARCHAR(64) | 输入组合 hash，用于去重 |
| created_at | DATETIME | 创建时间 |

唯一约束: `(product_id, ip_id, input_hash)` - 保证相同输入不重复生成

**定妆图表 (style_images)**
| 字段 | 类型 | 说明 |
|-----|------|------|
| id | VARCHAR(36) | 主键 UUID |
| product_id | VARCHAR(36) | 商品 ID |
| ip_id | VARCHAR(36) | 虚拟 IP ID |
| model_image_id | VARCHAR(36) | 关联模特图 ID |
| url | VARCHAR(500) | 生成的定妆图 URL |
| pose_id | VARCHAR(36) | 姿势素材 ID |
| makeup_id | VARCHAR(36) | 妆容素材 ID |
| accessory_id | VARCHAR(36) | 饰品素材 ID |
| input_hash | VARCHAR(64) | 输入组合 hash，用于去重 |
| created_at | DATETIME | 创建时间 |

唯一约束: `(model_image_id, input_hash)` - 保证相同 pose/makeup/accessory 组合不重复生成

**首帧图表 (first_frames)**
| 字段 | 类型 | 说明 |
|-----|------|------|
| id | VARCHAR(36) | 主键 UUID |
| product_id | VARCHAR(36) | 商品 ID |
| ip_id | VARCHAR(36) | 虚拟 IP ID |
| style_image_id | VARCHAR(36) | 关联定妆图 ID（可选） |
| url | VARCHAR(500) | 生成的首帧图 URL |
| scene_id | VARCHAR(36) | 场景素材 ID |
| composition | VARCHAR(500) | 构图描述文字 |
| input_hash | VARCHAR(64) | 输入组合 hash，用于去重 |
| created_at | DATETIME | 创建时间 |

唯一约束: `(product_id, ip_id, scene_id, input_hash)` - 保证相同 scene/composition 组合不重复生成

**去重逻辑**
```
1. 计算输入组合的 hash
   - 模特图: hash(product_main_image + detail_images)
   - 定妆图: hash(pose + makeup + accessory)
   - 首帧图: hash(scene + composition)

2. 查询是否已存在相同 hash 的记录

3. 如存在则直接返回，不重新生成
```


#### movement_materials 表新增
需要包含如下字段:
1. url: 动作视频的地址，非必须
2. content: 动作的文字描述，不能为空
3. clothing: 视频中人物穿戴的服装
4. scope: 这个动作视频适合哪类衣服

### 5.2 素材库自动更新


这个链接是我之前使用飞书维护的素材库 https://ocnw7i1lu3nc.feishu.cn/base/V3Bhbd1jJaJnffsg13ZcsPCYnBd?table=tblivEw2X0LgrHdk&view=vewoELKhP7  里面有如下几个字段:   1. 场景
2. 文生图提示词
3. 图生视频提示词

工具实现以下功能：
1. 将所有场景添加素材库中
2. 从文生图提示词，提取人物姿势、妆容、构图、光影、表情这些核心要素的描述
3. 从图生视频提示词中，提取出人物表情、动作这些核心要素的描述
4. 将提取到的核心要素更新到数据库中 

接入飞书 API 实现数据读取，数据存放的字段参考上面的数据库设计。


## 6. 场景关联
### 6.1 虚拟 IP 关联场景
我的需求是这样:

虚拟IP详情页，增加两个功能。
1. IP 素材。妆容、装饰、定制服装。改为展示模特图、定妆图、首帧图。默认展示三个。有个按钮点击可以展示全部。        
2. 添加一个使用场景。这里可以配置虚拟IP使用的场景。后面生成视频时，每个虚拟IP可以使用的场景只能从配置的场景中选择。

请结合需求修复

### 6.2 商品关联场景
产品详情页，增加服装适配场景。即服装更适合哪些场景。

## 7. 姿势到动作映射
增加功能:
1. 我要在核心素材库表里增加一个 prompt 提示词列。用于后面辅助生成视频。在核心素材库更新和添加页面，增加对这个字段的编辑。
2. 我需要增加一个姿势到动作的一对多的映射。作用是在生成视频时，对于特定的姿势，只能使用限定范围的专用动作。除了与姿势限定的动作。动作还可以包含多个通用动作。姿势可以使用关联任何动作，可以使用通用动作。但是页面需要标注出哪些是通用动作，哪些是专用动作
3. video 的结果里需要保存，使用的场景ID，姿势ID，动作ID，首帧图对应的ID，定妆图对应的ID，模特图对应的ID。这样我可以了解每个视频的生成过程。
4. 给首帧图、定妆图、模特图，增加一个字段 prompt 记录生成视频时，使用的提示词。

所有都完成后，更新 openapi 文档和 postman 文档。

## 8. 视频生成详情
增加功能: 1. 完善视频详情页面，可以看见生成的所有视频。点击某一个视频，可以观看视频，可以查看视频的生成过程。


## 9. 视频生成工具实现
首页视频工具进去可以看到很多视频生成工具，现在都没有实现。现在我们来实现他

### 9.1 模特图生成
点进去，用户需要选择两个参数:
1. 产品
2. 虚拟IP

每一个参数都可以选择多个。用户点击生成时。需要对他们的做一个组合。
用户需要先选择虚拟IP，然后选择产品，产品需要过滤那些已经生成过模特图的，只展示未生成过的。也只提交未生成的组合


对每一个组合调用接口:

```
  curl -X POST http://127.0.0.1:8765/v1/single/model-image \
    -H "Content-Type: application/json" \
    -d '{"productId": "3813528280213094793", "ipId": "981cd79c-5973-429a-8edf-dff3eda45014"}'
```

### 9.2 定妆图生成

点进去，用户需要选择两个参数:
1. 模特图
2. 姿势

每一个参数都可以选择多个。用户点击生成时。需要对他们的做一个组合。
用户需要先选择姿势，然后选择模特图，定妆图需要过滤那些已经生成过定妆图的，只展示未生成过的。也只提交未生成的组合


对每一个组合调用接口:

```
curl -X POST http://127.0.0.1:8765/v1/single/style-image \
    -H "Content-Type: application/json" \
    -d '{"modelImageId": "xxx", "poseId": "yyy"}'
```


### 9.3 首帧图生产
点进去，用户需要选择两个参数:
1. 定妆图
2. 场景

每一个参数都可以选择多个。用户点击生成时。需要对他们的做一个组合。
用户需要先选择场景，然后选择定妆图，定妆图需要过滤那些已经生成过定妆图的，只展示未生成过的。也只提交未生成的组合


对每一个组合调用接口:

```
curl -X POST http://127.0.0.1:8765/v1/single/first-frame-image \
    -H "Content-Type: application/json" \
    -d '{"styleImageId": "xxx", "sceneId": "yyy"}'
```

这三个工具，都是两两组合，组合内还有过滤逻辑。有什么好的 UI组件方便选择。


### 9.4 即梦生图工具
即梦生图任务，用户需要选择三个参数:
1. 人物
2. 服装
3. 场景

每一个参数都是可以多选的。用户点击生成时。需要对他们的做一个组合。

对每一个组合调用接口:

```
POST http://localhost:8765/v1/single/jimeng-image                                                                                                                                                              


  {
    "styleImageId": "style_abc123",
    "sceneId": "scene_xyz",
    "force": false
  }
```

即梦生图工具，是直接生成的首帧图，它不符合系统当前从 模特图 -> 定妆图 -> 首帧图的流程。但是为了让首帧图符合整个系统的设计规范即

能从首帧图反推到定妆图在反推到模特图。我可以这样做么？
1. 发送任务前要检查，组合内容 人物+服装有没有对应的 modelImageId，如果没有，不允许发送生图任务，如果有读取 modelImageId。
2. 在素材库内生成一个特殊的 pose id，用这个图书的 pose id + modelImageId 生成一条 styleImageId，对应的 url 是空字符串或者是默认的图片。
3. 用这个 styleImageId 和 scenceID 发送请求。



### 9.4 即梦生视频工具
即梦生图任务，用户需要选择三个参数:
1. 首帧图
2. 动作

每一个参数都是可以多选的。用户点击生成时。需要对他们的做一个组合。

对每一个组合调用接口:

```
  POST http://localhost:8765/v1/single/jimeng-video                                                                                                                                                              
                            

  {
    "productId": "prod_001",
    "ipId": "ip_001",
    "firstFrameId": "ff_abc",
    "movementId": "mov_xyz",
    "prompt": "自定义 prompt",
    "force": false
  }
```


## 10. 每日发布计划以及相关功能优化
### 产品详情页
产品详情页现有一个生成视频的按钮，本来的目标是进去生成视频的向导页面。但是这样的逻辑太长，点击太慢了。现在做如下优化:
1. 添加生图按钮：
    - 进入到现在的生成视频向导页面，但是每一步不是让用户选择怎么生成图片，而是展示每一个步骤下，所有排列组合，哪些已经生成哪些未生成，也可以可以筛选快速切换
    - 举例来说: 以定妆图为例，定妆图生成有四个选项 模特图-姿势-饰品-妆容，页面要显示这四个条件下所有排列组合，然后标识出，哪些已经生成，哪些未生成。还要有一列展示备选图(备选图是什么后面详细描述)
    - 模特图，首帧图的逻辑类似。他们怎么排列组合要看对应表的唯一键
    - 第一步不变是选择虚拟IP，最后一步是生成视频。生成视图就是进入到与下面点击生成视频同样的按钮
    - 对于未生图的组合，可以点击 gpt 生图、即梦生图(只对首帧图可用)，点击后调用相应的视频生成工具发送生图请求。组合可多选。
    - 如果所有的组合都生成完了，上传和生成不可选。
    - 首帧图表要增加一个平台字段，表示首帧图是哪个平台生成的，也要添加成唯一键。还有要一个是否确认标识，这个跟备选图有关系。后面详述。
2. 添加生视频按钮
    - 进入到这个页面时，页面需要展示所有首帧图+动作的组合，显示组合中哪些已经生成视频了，哪些未生成，以筛选未生成或者已经生成的组合。
    - 对于未生成视频的组合，可以点击即梦生视频，点击后调用相应的视频生成工具发送生视频请求。组合可多选
    - 对于已经生成视频的组合，可以点击即梦生视频，但是要确认是否重新生成。
    - 姿势和动作有对应关系，首帧图中有姿势信息，需要用来过滤动作。限定用户只能选择首帧图中包含的姿势。
3. 添加加入当日发布按钮(作用后面描述)
    - 当日发布按钮有一个右边的浮窗，类似商城购物车，用户将产品添加到当日发布计划后，就可以在浮窗内看到
    - 用户也可以在产品首页，批量添加产品到当日发布计划。

### 备选图
即梦生图工具中也描述了，即梦可能生成多张图片，一开始计划都放在首帧图表中，但是这样太过混乱。我还是认为需要选择一张最好的图作为首帧图。
所以我决定增加一个备选图标，有如下几个字段:
1. 素材类型: 定妆图，模特图、首帧图、ai视频
2. 关联ID: 关联的首帧图ID，模特图ID，定妆图ID，ai视频ID
3. 素材URL: 素材的url

以用户上传首帧图为例子，其他图片视频类似。即梦调用工具也是调用的上传接口回传的视频，这个地方是统一的。
1. 尝试往首帧图插入记录，如果唯一键冲突说明首帧图已经存在，则跳过，获取对应首帧图的ID作为关联ID，然后将用户上传的素材写入备选表(上传的路径还是按照首帧图的路径)。
2. 如果没有对应首帧图，就直接在首帧图插入，获取首帧图的ID作为关联ID，然后在将这个素材写入备选图一份。
3. 用户在上面所说的生图向导页面，可以从备选图中选择确认哪一张图为需要的首帧图。确认好之后，用选择的图片路径更新首帧图标中的路径。

增加备选图的好处是，我可以记录所有生成的图片、视频，不丢失。

### 视频剪辑和发布
调用即梦生视频后生成的是 ai 视频。一个产品+虚拟IP的组合，可以生成多张首帧图，每个首帧图通过不同动作可以生成多条 ai 视频。这些 ai 视频作为一个集合(ai 素材库)，可以剪辑出多条视频可发布视频。这些视频保存在 video_push 表中。这个表包含以下信息 
1. 输入视频: ai 视频的 id，列表，表示这条可发布视频时基于哪些 ai 视频剪辑出来的，去重字段之一
2. 剪辑模板: 剪辑模板 id，剪辑模板是核心素材库新增的素材之一。
3. 输出视频: 剪辑出来的视频的 id
4. 背景音乐： 背景音乐的 id，背景音乐是核心素材库新增的素材之一。
5. 封面模板： 封面模板的 id，封面模板是核心素材库新增的素材之一。
6. 标题： 视频的标题。
7. 描述： 视频的描述。
8. 封面:  视频的封面，基于封面模板生成的封面。标题、描述、封面，是通过 ai 生成的，这是另一个工具后面我们会详细介绍他如何实现。
8. 是否达标: 手工检验字段，标识视频质量是否达标，达标的视频就是可发布视频。
9. 是否发布: 是否在平台上发布

剪辑工具的交互接口我还么设计好。后面我们在讨论。

### 视频详情
首页视频tab页现在进去可以看到所有视频、未生成组合。这个我感觉不实用。我现在希望用户点击每日生成计划，可以进入到这个页面的当日发布计划子页，在里面能看到用户所选择的所有产品的一下信息:
1. 最上层是虚拟IP 的筛选
2. 下面是每个虚拟 IP 对应要发布产品的视频详情，包括产品图片、已有 ai视频数量、已经发布视频数量、可发布视频数量、可剪辑视频数量。以及操作列，选择当天要发布的视频。
    - 已有 ai 视频: videos 表里保存的 ai 视频数量。
    - 已发布视频数量: video_push 表里保存的标识的已经发布的视频数量。
    - 可发布视频数量: video_push 表里保存的标识的可发布，未发布的视频数量。
    - 可剪辑视频数量: 当用户新生成 ai 视频后，ai 素材库就会扩充，扩充后用户就可以多剪辑出新的视频。这个字段保存的就是还能剪辑出多少视频
    - 可新增 ai 视频数: 当用户，新增姿势、动作等等元素时，通过排列组合就可以生成更多的 ai 视频，这个字段就是减去已生成的 ai 视频，当前素材库组合还能生成的 ai 视频数量。

操作:
1. 发布视频: 可以进到可发布视频列表选择今天要发布的视频，每个产品可以发布多条视频
2. 剪辑视频: 调用剪辑工具，剪辑出所有视频
3. 新增 ai 视频: 跳转到产品的生图页面，让用户去生成新的 ai 视频。

这里面的设计的功能很多。又不懂的一定要问我。重点理解需求里面的整个处理的流程。后续用户在使用系统时，一定是以产品为中心的：
1. 用户会先选品。选好之后加入当日发布计划。
2. 查看发布计划，如果产品有可发布视频，直接选择
3. 如果没有，就要按照可剪辑视频 -> 可新增 ai 视频 这样的顺序，检测基于产品当前的素材库是否还能生成更多的视频。如果不能就要提醒用户要更新素材库。


## 11. 组合引擎模块设计

### 11.1 问题背景

当前系统计算组合数量的逻辑分散在各处，导致：
- 难以维护和扩展
- 新增组合要素（如产品副图）改动范围大
- 统计计算不统一
- pose-movement 关联关系处理逻辑不统一

### 11.2 核心需求

**统一组合引擎模块**，所有组件复用：
- 计算 product + IP 的各种组合
- 支持快速统计（不依赖数据库，量大时可缓存）
- 支持约束规则系统，方便扩展

### 11.3 数据关联关系

```
Product ──1:N──> Video ──属于──> IP
                 │
                 └── VideoPush（发布状态）
```

- 一个 **Product** 可以有多个 **IP** 的视频
- **Video** 属于某个 **IP**，有 `ipId`
- **VideoPush** 记录视频的发布状态（qualified, published）

### 11.4 需要计算的统计指标

| 指标 | 说明 | 计算方式 |
|------|------|----------|
| AI视频数 (aiVideoCount) | 该 product + ip 组合下，所有 AI 生成的视频总数 | `db.video.count({ where: { productId, ipId } })` |
| 已发布数 (publishedCount) | 已经发布到平台（isPublished=true）的视频数量 | `db.videoPush.count({ where: { productId, ipId, isPublished: true } })` |
| 可发布数 (pushableCount) | 质量合格（isQualified=true）但尚未发布（isPublished=false）的视频数量 | `db.videoPush.count({ where: { productId, ipId, isQualified: true, isPublished: false } })` |
| 可新增AI视频数 (newGeneratableCount) | 根据排列组合规则，还能新生成多少 AI 视频 | `理论最大组合数 - 已生成的视频数` |
| 可剪辑数 (clippableCount) | 可以进行剪辑的视频数量（有素材但尚未生成视频的组合） | 待确认 |

**可新增AI视频数计算流程：**
```
1. 获取有效的 pose-movement 组合（考虑关联关系）
2. 获取 scene、styleImage 等其他要素
3. 计算理论最大组合数 = pose_movement_combinations × scenes × styleImages × ...
4. 可新增 = max(0, 理论最大组合数 - 已有视频数)
```

### 11.5 组合类型

| 类型 | 组成要素 | 说明 |
|------|----------|------|
| modelImage | 模特图 | product + ip → 模特图 |
| styleImage | 定妆图 | modelImage + pose + makeup + accessory |
| firstFrame | 首帧图 | styleImage + scene + composition |
| video | 视频 | firstFrame + movement（多要素组合） |

### 11.6 Pose-Movement 关联关系（关键！）

**不是直接组合，而是关联关系：**
- 动作(Movement)分为 `general`（通用）和 `pose-specific`（绑定pose）
- 绑定pose的动作只能用于关联的pose
- `getAllowedMovementsForPose()` 过滤逻辑：
  ```typescript
  if (!poseId) return all movements
  return movements.filter(m => m.isGeneral || m.poseIds.includes(poseId))
  ```

### 11.7 未来约束扩展

| 约束 | 作用对象 | 说明 |
|------|----------|------|
| MovementConstraint | PRODUCT | product 只能使用特定范围的动作 |
| SceneConstraint | IP | IP 只能使用特定范围的场景 |
| PoseConstraint | PRODUCT/IP | 限制使用的 pose |
| MaterialConstraint | PRODUCT/IP | 限制使用的素材 |

### 11.8 约束规则系统设计

#### 核心类型定义

```typescript
// 约束类型
type ConstraintType = 'POSE' | 'MOVEMENT' | 'SCENE' | 'MATERIAL' | 'STYLE' | 'CUSTOM'

// 约束作用对象
type ConstraintSubjectType = 'PRODUCT' | 'IP'

// 约束定义
interface Constraint {
  id: string
  type: ConstraintType
  subjectType: ConstraintSubjectType  // 约束作用于 PRODUCT 还是 IP
  subjectId: string                   // 具体 ID
  allowedValues: string[]             // 允许的值列表
  priority: number                     // 优先级，数字越大越优先
  description?: string
}

// 素材池
interface MaterialPool {
  poses: Pose[]
  movements: Movement[]
  scenes: Scene[]
  styleImages: StyleImage[]
  modelImages: ModelImage[]
}

// 组合配置
interface CombinationConfig {
  type: CombinationType
  includeQualified?: boolean  // 是否包含已合格
  includePublished?: boolean // 是否包含已发布
  constraints?: Constraint[]  // 额外约束
}

// 组合结果
interface CombinationResult {
  combinations: Combination[]
  stats: CombinationStats
  appliedConstraints: Constraint[]  // 实际应用的约束
}

// 统计
interface CombinationStats {
  total: number
  qualified: number
  published: number
  pending: number  // 可发布未发布
  newGeneratable: number  // 可新增AI视频数
}
```

#### 约束注册表

```typescript
class ConstraintRegistry {
  private constraints: Map<string, Constraint> = new Map()

  // 注册约束
  register(constraint: Constraint): void

  // 获取适用于某 product 的约束
  getForProduct(productId: string): Constraint[]

  // 获取适用于某 IP 的约束
  getForIP(ipId: string): Constraint[]

  // 获取所有适用的约束
  getAllApplicable(productId: string, ipId: string): Constraint[]
}
```

#### 组合引擎核心

```typescript
class CombinationEngine {
  private registry: ConstraintRegistry
  private cache: Map<string, CombinationResult>

  // 注册约束
  addConstraint(constraint: Constraint): void

  // 计算组合
  compute(productId: string, ipId: string, config: CombinationConfig): CombinationResult

  // 应用约束过滤素材
  private applyConstraints(
    productId: string,
    ipId: string,
    pool: MaterialPool,
    constraints: Constraint[]
  ): MaterialPool

  // movement 约束过滤（考虑 pose-movement 关联）
  private filterMovementsWithConstraints(
    movements: Movement[],
    poses: Pose[],
    movementConstraint: Constraint
  ): Movement[]
}
```

#### 约束变更时缓存失效

```typescript
// 约束变更时触发
invalidateRelatedCache(constraint: Constraint): void

// 素材变更时触发
invalidateMaterialCache(productId: string, ipId?: string): void
```

### 11.9 使用示例

```typescript
// 添加 product 级别的 movement 约束
engine.addConstraint({
  id: 'prod_mv_limit_123',
  type: 'MOVEMENT',
  subjectType: 'PRODUCT',
  subjectId: 'prod_123',
  allowedValues: ['mv_001', 'mv_002', 'mv_003'],
  priority: 10,
  description: '产品123只能使用指定的动作'
})

// 添加 IP 级别的 scene 约束
engine.addConstraint({
  id: 'ip_scene_limit_456',
  type: 'SCENE',
  subjectType: 'IP',
  subjectId: 'ip_456',
  allowedValues: ['scene_001', 'scene_002'],
  priority: 10,
  description: 'IP456只能使用指定的场景'
})

// 计算统计
const result = engine.compute('prod_123', 'ip_456', {
  type: 'VIDEO',
  includeQualified: true,
  includePublished: false
})

console.log(result.stats)
// { total: 50, qualified: 20, published: 10, pending: 10, newGeneratable: 30 }
```

### 11.10 设计原则

- **规则化**而非硬编码：新增约束类型只需实现接口
- **可组合**：约束可叠加，按优先级生效
- **可缓存**：支持内存缓存/DB缓存
- **失效机制**：素材或约束变更时自动失效
- **统一计算**：所有统计指标通过同一引擎计算