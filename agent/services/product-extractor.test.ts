import { extractProductInfo } from './product-extractor'
import { models } from '../../core/llm'
import { generateText } from 'ai'
import { readFileSync } from 'fs'
import { join } from 'path'
import { EXTRACT_PRODUCT_INFO_PROMPT } from '../prompts/product'

describe('extractProductInfo', () => {
  // Path from agent/services/ up to project root (../../), then into docs
  const testImagePath = join(__dirname, '../../docs/virtual_ip/服装/5d7788b73604b9e9f302dbeacc61a0c8.jpg')

  beforeAll(() => {
    expect(() => readFileSync(testImagePath)).not.toThrow()
  })

  it('should extract product info using MiniMax model via llm.ts', async () => {
    const imageBuffer = readFileSync(testImagePath)
    const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`

    // Use messages format for vision
    const { text } = await generateText({
      model: models.extract,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: EXTRACT_PRODUCT_INFO_PROMPT },
            { type: 'image', image: base64Image },
          ],
        },
      ],
    }, { maxSteps: 10, timeoutMs: 30000 })

    console.log('MiniMax response:', text)
    expect(text).toBeDefined()
    expect(text.length).toBeGreaterThan(0)
  }, 60000)

  it('should use extract model from llm.ts', () => {
    expect(models.extract).toBeDefined()
    expect(models.memory).toBeDefined()
    expect(models.compactor).toBeDefined()
  })
})
