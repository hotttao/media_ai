export const EXTRACT_MATERIAL_INFO_PROMPT = `
分析用户上传的素材图片，提取素材信息用于视频生成。

请从图片中提取以下信息：

1. 素材名称：根据图片内容推断素材名称/标题
2. 素材类型：根据内容判断是服装(CLOTHING)、场景(SCENE)、动作(ACTION)、妆容(MAKEUP)、配饰(ACCESSORY)还是其他(OTHER)
3. 素材描述：详细描述素材内容、特点、风格
4. 推荐标签：提取3-5个相关标签，用于素材分类和搜索

分析要求：
1. 仔细观察素材特点，特别是细节
2. 标签应该准确反映素材内容
3. 用中文回复，描述要具体

返回格式（JSON）：
{
  "name": "素材名称",
  "type": "CLOTHING|SCENE|ACTION|MAKEUP|ACCESSORY|OTHER",
  "description": "素材描述",
  "tags": ["标签1", "标签2", "标签3"]
}
`
