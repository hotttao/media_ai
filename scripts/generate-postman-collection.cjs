const fs = require('fs')
const path = require('path')

const specPath = path.join(process.cwd(), 'docs', 'openapi.json')
const outputPath = path.join(process.cwd(), 'docs', 'media-ai.postman_collection.json')
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'))

const methodNames = new Set(['get', 'post', 'put', 'patch', 'delete'])
const baseUrl = spec.servers?.[0]?.url || 'http://localhost:3000'

const collectionVariables = [
  ['baseUrl', baseUrl],
  ['csrfToken', ''],
  ['email', 'postman-user-{{$timestamp}}@example.com'],
  ['password', 'password123'],
  ['nickname', 'Postman Tester'],
  ['teamName', 'Postman Test Team'],
  ['teamId', 'REPLACE_WITH_TEAM_ID'],
  ['inviteCode', 'REPLACE_WITH_INVITE_CODE'],
  ['ipId', 'REPLACE_WITH_IP_ID'],
  ['productId', 'REPLACE_WITH_PRODUCT_ID'],
  ['materialId', 'REPLACE_WITH_MATERIAL_ID'],
  ['generatedMaterialType', 'modelImage'],
  ['movementId', 'REPLACE_WITH_MOVEMENT_ID'],
  ['taskId', 'REPLACE_WITH_TASK_ID'],
  ['videoId', 'REPLACE_WITH_VIDEO_ID'],
  ['imageId', 'REPLACE_WITH_IMAGE_ID'],
  ['modelImageId', 'REPLACE_WITH_MODEL_IMAGE_ID'],
  ['styleImageId', 'REPLACE_WITH_STYLE_IMAGE_ID'],
  ['firstFrameId', 'REPLACE_WITH_FIRST_FRAME_ID'],
  ['workflowCode', 'product-video'],
  ['productMainImageUrl', 'https://example.com/images/product-main.jpg'],
  ['productDetailImageUrl', 'https://example.com/images/product-detail.jpg'],
  ['avatarUrl', 'https://example.com/images/avatar.jpg'],
  ['materialUrl', 'https://example.com/images/material.jpg'],
  ['generatedImageUrl', 'https://example.com/images/generated.jpg'],
  ['runningHubTaskId', 'REPLACE_WITH_RUNNINGHUB_TASK_ID'],
  ['sampleImagePath', 'C:\\path\\to\\sample.jpg'],
].map(([key, value]) => ({ key, value, type: 'string' }))

const variableByParam = {
  id: 'id',
  ipId: 'ipId',
  imageId: 'imageId',
  type: 'generatedMaterialType',
  code: 'workflowCode',
}

function resolveRef(schema) {
  if (!schema?.$ref) return schema
  const parts = schema.$ref.replace(/^#\//, '').split('/')
  return parts.reduce((current, part) => current?.[part], spec)
}

function sampleFromSchema(schema, propertyName = '') {
  schema = resolveRef(schema) || {}
  if (schema.example !== undefined) return schema.example
  if (schema.default !== undefined) return schema.default
  if (schema.enum?.length) return schema.enum[0]
  if (schema.anyOf?.length) return sampleFromSchema(schema.anyOf[0], propertyName)
  if (schema.oneOf?.length) return sampleFromSchema(schema.oneOf[0], propertyName)
  if (schema.allOf?.length) return Object.assign({}, ...schema.allOf.map((item) => sampleFromSchema(item, propertyName)))

  if (schema.type === 'object' || schema.properties) {
    const result = {}
    const properties = schema.properties || {}
    for (const [key, value] of Object.entries(properties)) {
      result[key] = sampleFromSchema(value, key)
    }
    return result
  }

  if (schema.type === 'array') return [sampleFromSchema(schema.items, propertyName)]
  if (schema.type === 'integer') return 1
  if (schema.type === 'number') return 170
  if (schema.type === 'boolean') return false

  const lower = propertyName.toLowerCase()
  if (lower.includes('email')) return '{{email}}'
  if (lower.includes('password')) return '{{password}}'
  if (lower === 'teamid') return '{{teamId}}'
  if (lower === 'ipid') return '{{ipId}}'
  if (lower === 'productid') return '{{productId}}'
  if (lower === 'modelimageid') return '{{modelImageId}}'
  if (lower === 'styleimageid') return '{{styleImageId}}'
  if (lower.includes('imageurl') || lower === 'url') return '{{generatedImageUrl}}'
  if (lower.includes('avatar')) return '{{avatarUrl}}'
  if (lower.includes('name')) return `Postman ${propertyName || 'Name'}`
  if (lower.includes('description')) return 'Created from Postman collection.'
  if (lower.includes('tag')) return 'postman'
  return `sample-${propertyName || 'value'}`
}

function operationSample(pathName, method, op) {
  const requestSchema = Object.values(op.requestBody?.content || {})[0]?.schema
  const generated = requestSchema ? sampleFromSchema(requestSchema) : undefined
  const key = `${method.toUpperCase()} ${pathName}`

  const overrides = {
    'POST /api/auth/register': {
      email: '{{email}}',
      password: '{{password}}',
      nickname: '{{nickname}}',
      teamName: '{{teamName}}',
      inviteCode: '',
    },
    'POST /api/materials/extract': { text: '红色连衣裙，适合夏季通勤，优雅轻熟风。' },
    'POST /api/products/extract': { text: '男士黑色运动夹克，防风面料，适合户外跑步。' },
    'POST /api/products/{id}/images': {
      url: '{{productDetailImageUrl}}',
      isMain: false,
      order: 1,
    },
    'POST /api/products/{id}/model-image': {
      ipId: '{{ipId}}',
      productMainImageUrl: '{{productMainImageUrl}}',
      productDetailImageUrls: ['{{productDetailImageUrl}}'],
    },
    'POST /api/products/{id}/model-image/save': {
      ipId: '{{ipId}}',
      imageUrl: '{{generatedImageUrl}}',
    },
    'POST /api/products/{id}/style-image': {
      modelImageId: '{{modelImageId}}',
      pose: 'standing front view',
      makeupUrl: '{{materialUrl}}',
      accessoryUrl: '{{materialUrl}}',
    },
    'POST /api/products/{id}/style-image/save': {
      modelImageId: '{{modelImageId}}',
      poseId: '{{materialId}}',
      makeupId: '{{materialId}}',
      accessoryId: '{{materialId}}',
      imageUrl: '{{generatedImageUrl}}',
    },
    'POST /api/products/{id}/first-frame': {
      styleImageId: '{{styleImageId}}',
      sceneId: '{{materialId}}',
      composition: 'full body centered, clean product showcase',
      imageUrl: '{{generatedImageUrl}}',
    },
    'POST /api/products/{id}/generate-video': {
      ipId: '{{ipId}}',
      firstFrameUrl: '{{generatedImageUrl}}',
      movementId: '{{movementId}}',
      sceneId: '{{materialId}}',
      poseId: '{{materialId}}',
      firstFrameId: '{{firstFrameId}}',
      styleImageId: '{{styleImageId}}',
      modelImageId: '{{modelImageId}}',
    },
    'POST /api/teams/invite-codes': { teamId: '{{teamId}}' },
    'POST /api/tools/image-blend': {
      imageUrls: ['{{productMainImageUrl}}', '{{avatarUrl}}'],
      prompt: 'Blend the product naturally onto the model.',
    },
    'POST /api/webhooks/runninghub': {
      taskId: '{{runningHubTaskId}}',
      status: 'SUCCESS',
      output: { imageUrl: '{{generatedImageUrl}}' },
    },
    'POST /api/workflows/{code}/execute': {
      productId: '{{productId}}',
      ipId: '{{ipId}}',
      materialIds: ['{{materialId}}'],
      inputs: { prompt: 'Generate a short fashion product video.' },
    },
  }

  return overrides[key] || generated || {}
}

function variableNameForPathParam(pathName, paramName) {
  if (paramName !== 'id') return variableByParam[paramName] || paramName
  if (pathName.includes('/api/products/')) return 'productId'
  if (pathName.includes('/api/ips/')) return 'ipId'
  if (pathName.includes('/api/materials/')) return 'materialId'
  if (pathName.includes('/api/movements/')) return 'movementId'
  if (pathName.includes('/api/videos/')) return 'videoId'
  if (pathName.includes('/api/tasks/')) return 'taskId'
  return 'id'
}

function toPostmanPath(pathName) {
  return pathName.replace(/\{([^}]+)\}/g, (_, paramName) => `{{${variableNameForPathParam(pathName, paramName)}}}`)
}

function querySample(param) {
  const name = param.name.toLowerCase()
  if (name === 'type') return 'SCENE'
  if (name === 'search') return 'postman'
  if (name === 'targetaudience') return 'MENS'
  if (name === 'where') return 'all'
  if (name === 'ipid') return '{{ipId}}'
  if (name === 'modelimageid') return '{{modelImageId}}'
  if (name === 'styleimageid') return '{{styleImageId}}'
  return sampleFromSchema(param.schema, param.name)
}

function formDataFor(pathName, op) {
  const schema = Object.values(op.requestBody?.content || {})[0]?.schema || {}
  const properties = schema.properties || {}
  const defaults = {
    file: { type: 'file', src: '{{sampleImagePath}}' },
    avatar: { type: 'file', src: '{{sampleImagePath}}' },
    fullBody: { type: 'file', src: '{{sampleImagePath}}' },
    threeView: { type: 'file', src: '{{sampleImagePath}}' },
    nineView: { type: 'file', src: '{{sampleImagePath}}' },
    subDir: { type: 'text', value: 'postman' },
    type: { type: 'text', value: 'MAKEUP' },
    name: { type: 'text', value: 'Postman Material' },
    description: { type: 'text', value: 'Uploaded from Postman collection.' },
    tags: { type: 'text', value: '["postman","sample"]' },
  }
  const keys = Object.keys(properties).length ? Object.keys(properties) : Object.keys(defaults)
  if (pathName === '/api/ips/{id}/images') keys.push('avatar', 'fullBody', 'threeView', 'nineView')
  return [...new Set(keys)].map((key) => ({ key, ...(defaults[key] || { type: 'text', value: String(sampleFromSchema(properties[key], key)) }) }))
}

function urlEncodedDataFor(op) {
  const schema = op.requestBody?.content?.['application/x-www-form-urlencoded']?.schema || {}
  const properties = schema.properties || {}
  const defaults = {
    csrfToken: '{{csrfToken}}',
    email: '{{email}}',
    password: '{{password}}',
    json: 'true',
  }

  return Object.keys(properties).map((key) => ({
    key,
    value: defaults[key] || String(sampleFromSchema(properties[key], key)),
    type: 'text',
  }))
}

function captureTests(pathName, method) {
  const captures = []
  const key = `${method.toUpperCase()} ${pathName}`
  const map = {
    'GET /api/auth/csrf': [['csrfToken', 'json.csrfToken']],
    'POST /api/auth/register': [['teamId', 'json.user && json.user.teamId']],
    'POST /api/ips': [['ipId', 'json.id']],
    'POST /api/materials': [['materialId', 'json.id']],
    'POST /api/movements': [['movementId', 'json.id']],
    'POST /api/products': [['productId', 'json.id']],
    'POST /api/products/{id}/images': [['imageId', 'json.id']],
    'POST /api/products/{id}/model-image/save': [['modelImageId', 'json.modelImageId']],
    'POST /api/products/{id}/style-image/save': [['styleImageId', 'json.styleImageId']],
    'POST /api/products/{id}/first-frame': [['firstFrameId', 'json.firstFrameId']],
    'POST /api/products/{id}/generate-video': [['videoId', 'json.videoId']],
    'POST /api/teams/invite-codes': [['inviteCode', 'json.code']],
  }
  for (const [name, expression] of map[key] || []) {
    captures.push(`if (${expression}) pm.collectionVariables.set('${name}', ${expression});`)
  }
  return captures.length ? [
    'pm.test("Status code is below 500", function () { pm.expect(pm.response.code).to.be.below(500); });',
    'let json = {}; try { json = pm.response.json(); } catch (e) {}',
    ...captures,
  ] : ['pm.test("Status code is below 500", function () { pm.expect(pm.response.code).to.be.below(500); });']
}

function makeItem(pathName, method, op) {
  const postmanPath = toPostmanPath(pathName)
  const parameters = op.parameters || []
  const query = parameters
    .filter((param) => param.in === 'query')
    .map((param) => ({ key: param.name, value: String(querySample(param)), disabled: !param.required }))

  const headers = []
  const contentTypes = Object.keys(op.requestBody?.content || {})
  let body
  if (contentTypes.includes('multipart/form-data')) {
    body = { mode: 'formdata', formdata: formDataFor(pathName, op) }
  } else if (contentTypes.includes('application/x-www-form-urlencoded')) {
    headers.push({ key: 'Content-Type', value: 'application/x-www-form-urlencoded' })
    body = { mode: 'urlencoded', urlencoded: urlEncodedDataFor(op) }
  } else if (contentTypes.includes('application/json')) {
    headers.push({ key: 'Content-Type', value: 'application/json' })
    body = { mode: 'raw', raw: JSON.stringify(operationSample(pathName, method, op), null, 2), options: { raw: { language: 'json' } } }
  }

  return {
    name: op.summary || `${method.toUpperCase()} ${pathName}`,
    request: {
      method: method.toUpperCase(),
      header: headers,
      url: {
        raw: `{{baseUrl}}${postmanPath}${query.length ? '?' + query.map((item) => `${item.key}=${encodeURIComponent(item.value)}`).join('&') : ''}`,
        host: ['{{baseUrl}}'],
        path: postmanPath.replace(/^\//, '').split('/'),
        query,
      },
      ...(body ? { body } : {}),
      description: [op.description, op.operationId ? `operationId: ${op.operationId}` : undefined].filter(Boolean).join('\n\n'),
    },
    event: [{ listen: 'test', script: { type: 'text/javascript', exec: captureTests(pathName, method) } }],
  }
}

const folders = new Map()
for (const [pathName, pathItem] of Object.entries(spec.paths || {})) {
  for (const [method, op] of Object.entries(pathItem)) {
    if (!methodNames.has(method)) continue
    const folderName = op.tags?.[0] || 'default'
    if (!folders.has(folderName)) folders.set(folderName, [])
    folders.get(folderName).push(makeItem(pathName, method, op))
  }
}

const collection = {
  info: {
    name: `${spec.info?.title || 'API'} Postman Tests`,
    description: 'Generated from docs/openapi.json. Collection variables include ready-to-edit sample IDs, URLs, and file path placeholders. Requests include example bodies and basic tests that capture created IDs where possible.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  variable: collectionVariables,
  item: [
    ...[...folders.entries()].map(([name, item]) => ({ name, item })),
  ],
}

fs.writeFileSync(outputPath, `${JSON.stringify(collection, null, 2)}\n`)
console.log(`Generated ${outputPath}`)
