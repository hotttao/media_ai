import { NextResponse } from 'next/server'
import { sendTextMessage } from '@/foundation/lib/feishu'

export async function GET() {
  console.log('[Test Feishu] Starting test...')
  console.log('FEISHU_APP_ID:', process.env.FEISHU_APP_ID ? 'set' : 'NOT SET')
  console.log('FEISHU_APP_SECRET:', process.env.FEISHU_APP_SECRET ? 'set' : 'NOT SET')
  console.log('FEISHU_RECEIVE_ID:', process.env.FEISHU_RECEIVE_ID ? 'set' : 'NOT SET')

  try {
    const result = await sendTextMessage('测试标题', '这是一条测试消息')
    console.log('[Test Feishu] Result:', result)
    return NextResponse.json({ success: result, message: result ? '发送成功' : '发送失败' })
  } catch (error) {
    console.error('[Test Feishu] Error:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}