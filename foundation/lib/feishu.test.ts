import { describe, expect, it } from 'vitest'

describe('Feishu 模块 - 真实调用', () => {
  it('发送文本消息并打印请求详情', async () => {
    console.log('FEISHU_APP_ID:', process.env.FEISHU_APP_ID ? '已配置' : '未配置')
    console.log('FEISHU_APP_SECRET:', process.env.FEISHU_APP_SECRET ? '已配置' : '未配置')
    console.log('FEISHU_RECEIVE_ID:', process.env.FEISHU_RECEIVE_ID ? '已配置' : '未配置')

    const { sendTextMessage } = await import('@/foundation/lib/feishu')
    const result = await sendTextMessage('媒体AI测试', '这是一条测试消息')
    console.log('发送结果:', result ? '成功' : '失败')
    expect(typeof result).toBe('boolean')
  })
})