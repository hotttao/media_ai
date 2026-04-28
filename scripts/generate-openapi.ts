import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { extendZodWithOpenApi, OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi'
import type { ZodRawShape, ZodTypeAny } from 'zod'
import { z } from 'zod'
import { createMaterialSchema, materialFilterSchema } from '../domains/materials/validators'
import {
  createProductSchema,
  extractProductInfoSchema,
  productFilterSchema,
  updateProductSchema,
} from '../domains/product/validators'
import { createIpSchema, updateIpSchema } from '../domains/virtual-ip/validators'
import {
  createMovementMaterialSchema,
  updateMovementMaterialSchema,
} from '../domains/movement-material/validators'
import {
  credentialsLoginResponseSchema,
  csrfResponseSchema,
  errorResponseSchema,
  firstFrameSaveResponseSchema,
  generatedMaterialsResponseSchema,
  generationJobResponseSchema,
  inviteCodeResponseSchema,
  ipMaterialResponseSchema,
  materialResponseSchema,
  modelImageResponseSchema,
  modelImageSaveResponseSchema,
  movementMaterialResponseSchema,
  movementResponseSchema,
  productImageResponseSchema,
  productResponseSchema,
  registerResponseSchema,
  styleImageResponseSchema,
  styleImageSaveResponseSchema,
  successResponseSchema,
  uploadResponseSchema,
  videoTaskResponseSchema,
  videoGenerationResponseSchema,
  videoSummaryResponseSchema,
  videoDetailResponseSchema,
  virtualIpResponseSchema,
  workflowResponseSchema,
  firstFrameResponseSchema,
  pendingVideoCombinationResponseSchema,
  poseMovementMapResponseSchema,
} from '../domains/api/response-validators'

extendZodWithOpenApi(z)

const rootDir = dirname(fileURLToPath(new URL('../package.json', import.meta.url)))
const apiDir = join(rootDir, 'app', 'api')
const outputFile = join(rootDir, 'docs', 'openapi.json')
const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const

type HttpMethod = typeof httpMethods[number]
type MethodSchemaMap = Partial<Record<HttpMethod, ZodTypeAny>>

const registry = new OpenAPIRegistry()
const generateVideoRequestSchema = z.object({
  ipId: z.string().optional(),
  firstFrameUrl: z.string().optional(),
  movementId: z.string().optional(),
  productMaterialId: z.string().optional(),
  step: z.string().optional(),
  styleImageId: z.string().optional(),
  sceneId: z.string().optional(),
  composition: z.string().optional(),
  imageUrl: z.string().optional(),
  poseId: z.string().optional(),
  prompt: z.string().optional(),
  firstFrameId: z.string().optional(),
  modelImageId: z.string().optional(),
}).describe('Payload for first-frame generation and final video generation.')

const schemas = {
  CreateMaterial: registry.register('CreateMaterial', createMaterialSchema),
  MaterialFilter: registry.register('MaterialFilter', materialFilterSchema),
  CreateProduct: registry.register('CreateProduct', createProductSchema),
  UpdateProduct: registry.register('UpdateProduct', updateProductSchema),
  ProductFilter: registry.register('ProductFilter', productFilterSchema),
  ExtractProductInfo: registry.register('ExtractProductInfo', extractProductInfoSchema),
  CreateVirtualIp: registry.register('CreateVirtualIp', createIpSchema),
  UpdateVirtualIp: registry.register('UpdateVirtualIp', updateIpSchema),
  CreateMovementMaterial: registry.register('CreateMovementMaterial', createMovementMaterialSchema),
  UpdateMovementMaterial: registry.register('UpdateMovementMaterial', updateMovementMaterialSchema),
  GenerateVideoRequest: registry.register('GenerateVideoRequest', generateVideoRequestSchema),
  CsrfResponse: registry.register('CsrfResponse', csrfResponseSchema),
  CredentialsLoginResponse: registry.register('CredentialsLoginResponse', credentialsLoginResponseSchema),
  ErrorResponse: registry.register('ErrorResponse', errorResponseSchema),
  SuccessResponse: registry.register('SuccessResponse', successResponseSchema),
  RegisterResponse: registry.register('RegisterResponse', registerResponseSchema),
  InviteCode: registry.register('InviteCode', inviteCodeResponseSchema),
  InviteCodeList: registry.register('InviteCodeList', z.array(inviteCodeResponseSchema)),
  VirtualIp: registry.register('VirtualIp', virtualIpResponseSchema),
  VirtualIpList: registry.register('VirtualIpList', z.array(virtualIpResponseSchema)),
  Material: registry.register('Material', materialResponseSchema),
  MaterialList: registry.register('MaterialList', z.array(materialResponseSchema)),
  IpMaterial: registry.register('IpMaterial', ipMaterialResponseSchema),
  IpMaterialList: registry.register('IpMaterialList', z.array(ipMaterialResponseSchema)),
  Product: registry.register('Product', productResponseSchema),
  ProductList: registry.register('ProductList', z.array(productResponseSchema)),
  ProductImage: registry.register('ProductImage', productImageResponseSchema),
  ModelImage: registry.register('ModelImage', modelImageResponseSchema),
  ModelImageList: registry.register('ModelImageList', z.array(modelImageResponseSchema)),
  ModelImageSaveResponse: registry.register('ModelImageSaveResponse', modelImageSaveResponseSchema),
  StyleImageSaveResponse: registry.register('StyleImageSaveResponse', styleImageSaveResponseSchema),
  StyleImageList: registry.register('StyleImageList', z.array(styleImageResponseSchema)),
  FirstFrameSaveResponse: registry.register('FirstFrameSaveResponse', firstFrameSaveResponseSchema),
  FirstFrameList: registry.register('FirstFrameList', z.array(firstFrameResponseSchema)),
  GeneratedMaterialsResponse: registry.register('GeneratedMaterialsResponse', generatedMaterialsResponseSchema),
  VideoTask: registry.register('VideoTask', videoTaskResponseSchema),
  VideoTaskList: registry.register('VideoTaskList', z.array(videoTaskResponseSchema)),
  Workflow: registry.register('Workflow', workflowResponseSchema),
  WorkflowList: registry.register('WorkflowList', z.array(workflowResponseSchema)),
  Movement: registry.register('Movement', movementResponseSchema),
  MovementList: registry.register('MovementList', z.array(movementResponseSchema)),
  MovementMaterial: registry.register('MovementMaterial', movementMaterialResponseSchema),
  MovementMaterialList: registry.register('MovementMaterialList', z.array(movementMaterialResponseSchema)),
  UploadResponse: registry.register('UploadResponse', uploadResponseSchema),
  GenerationJobResponse: registry.register('GenerationJobResponse', generationJobResponseSchema),
  VideoGenerationResponse: registry.register('VideoGenerationResponse', videoGenerationResponseSchema),
  VideoSummary: registry.register('VideoSummary', videoSummaryResponseSchema),
  VideoSummaryList: registry.register('VideoSummaryList', z.array(videoSummaryResponseSchema)),
  VideoDetail: registry.register('VideoDetail', videoDetailResponseSchema),
  PendingVideoCombinationList: registry.register('PendingVideoCombinationList', z.array(pendingVideoCombinationResponseSchema)),
  PoseMovementMapList: registry.register('PoseMovementMapList', z.array(poseMovementMapResponseSchema)),
}

const schemaRefBySchema = new Map<ZodTypeAny, string>([
  [schemas.CreateMaterial, 'CreateMaterial'],
  [schemas.MaterialFilter, 'MaterialFilter'],
  [schemas.CreateProduct, 'CreateProduct'],
  [schemas.UpdateProduct, 'UpdateProduct'],
  [schemas.ProductFilter, 'ProductFilter'],
  [schemas.ExtractProductInfo, 'ExtractProductInfo'],
  [schemas.CreateVirtualIp, 'CreateVirtualIp'],
  [schemas.UpdateVirtualIp, 'UpdateVirtualIp'],
  [schemas.CreateMovementMaterial, 'CreateMovementMaterial'],
  [schemas.UpdateMovementMaterial, 'UpdateMovementMaterial'],
  [schemas.GenerateVideoRequest, 'GenerateVideoRequest'],
  [schemas.CsrfResponse, 'CsrfResponse'],
  [schemas.CredentialsLoginResponse, 'CredentialsLoginResponse'],
  [schemas.ErrorResponse, 'ErrorResponse'],
  [schemas.SuccessResponse, 'SuccessResponse'],
  [schemas.RegisterResponse, 'RegisterResponse'],
  [schemas.InviteCode, 'InviteCode'],
  [schemas.InviteCodeList, 'InviteCodeList'],
  [schemas.VirtualIp, 'VirtualIp'],
  [schemas.VirtualIpList, 'VirtualIpList'],
  [schemas.Material, 'Material'],
  [schemas.MaterialList, 'MaterialList'],
  [schemas.IpMaterial, 'IpMaterial'],
  [schemas.IpMaterialList, 'IpMaterialList'],
  [schemas.Product, 'Product'],
  [schemas.ProductList, 'ProductList'],
  [schemas.ProductImage, 'ProductImage'],
  [schemas.ModelImage, 'ModelImage'],
  [schemas.ModelImageList, 'ModelImageList'],
  [schemas.ModelImageSaveResponse, 'ModelImageSaveResponse'],
  [schemas.StyleImageSaveResponse, 'StyleImageSaveResponse'],
  [schemas.StyleImageList, 'StyleImageList'],
  [schemas.FirstFrameSaveResponse, 'FirstFrameSaveResponse'],
  [schemas.FirstFrameList, 'FirstFrameList'],
  [schemas.GeneratedMaterialsResponse, 'GeneratedMaterialsResponse'],
  [schemas.VideoTask, 'VideoTask'],
  [schemas.VideoTaskList, 'VideoTaskList'],
  [schemas.Workflow, 'Workflow'],
  [schemas.WorkflowList, 'WorkflowList'],
  [schemas.Movement, 'Movement'],
  [schemas.MovementList, 'MovementList'],
  [schemas.MovementMaterial, 'MovementMaterial'],
  [schemas.MovementMaterialList, 'MovementMaterialList'],
  [schemas.UploadResponse, 'UploadResponse'],
  [schemas.GenerationJobResponse, 'GenerationJobResponse'],
  [schemas.VideoGenerationResponse, 'VideoGenerationResponse'],
  [schemas.VideoSummary, 'VideoSummary'],
  [schemas.VideoSummaryList, 'VideoSummaryList'],
  [schemas.VideoDetail, 'VideoDetail'],
  [schemas.PendingVideoCombinationList, 'PendingVideoCombinationList'],
  [schemas.PoseMovementMapList, 'PoseMovementMapList'],
])

const requestBodySchemas: Record<string, MethodSchemaMap> = {
  '/api/ips': { POST: schemas.CreateVirtualIp },
  '/api/ips/{id}': { PUT: schemas.UpdateVirtualIp },
  '/api/materials': { POST: schemas.CreateMaterial },
  '/api/movement-materials': { POST: schemas.CreateMovementMaterial },
  '/api/movements': { POST: schemas.CreateMovementMaterial },
  '/api/movements/{id}': { PATCH: schemas.UpdateMovementMaterial },
  '/api/products': { POST: schemas.CreateProduct },
  '/api/products/{id}': { PATCH: schemas.UpdateProduct },
  '/api/products/{id}/generate-video': { POST: schemas.GenerateVideoRequest },
  '/api/products/extract': { POST: schemas.ExtractProductInfo },
}

const querySchemas: Record<string, MethodSchemaMap> = {
  '/api/materials': { GET: schemas.MaterialFilter },
  '/api/products': { GET: schemas.ProductFilter },
}

const responseSchemas: Record<string, MethodSchemaMap> = {
  '/api/auth/register': { POST: schemas.RegisterResponse },
  '/api/ips': { GET: schemas.VirtualIpList, POST: schemas.VirtualIp },
  '/api/ips/{id}': { GET: schemas.VirtualIp, PUT: schemas.VirtualIp, DELETE: schemas.SuccessResponse },
  '/api/ips/{id}/images': { POST: schemas.VirtualIp },
  '/api/materials': { GET: schemas.MaterialList, POST: schemas.Material },
  '/api/materials/{id}': { GET: schemas.Material, DELETE: schemas.SuccessResponse },
  '/api/materials/extract': { POST: schemas.GenerationJobResponse },
  '/api/materials/ip/{ipId}': { GET: schemas.IpMaterialList, POST: schemas.IpMaterial },
  '/api/movement-materials': { GET: schemas.MovementMaterialList, POST: schemas.MovementMaterial },
  '/api/movements': { GET: schemas.MovementMaterialList, POST: schemas.MovementMaterial },
  '/api/movements/{id}': { GET: schemas.MovementMaterial, PATCH: schemas.MovementMaterial, DELETE: schemas.SuccessResponse },
  '/api/products': { GET: schemas.ProductList, POST: schemas.Product },
  '/api/products/{id}': { GET: schemas.Product, PATCH: schemas.Product, DELETE: schemas.SuccessResponse },
  '/api/products/{id}/first-frame': { GET: schemas.FirstFrameList, POST: schemas.FirstFrameSaveResponse },
  '/api/products/{id}/first-frames': { GET: schemas.FirstFrameList },
  '/api/products/{id}/generate-video': { POST: schemas.VideoGenerationResponse },
  '/api/products/{id}/generated-materials': { GET: schemas.GeneratedMaterialsResponse },
  '/api/products/{id}/images': { POST: schemas.ProductImage },
  '/api/products/{id}/images/{imageId}': { DELETE: schemas.SuccessResponse },
  '/api/products/{id}/model-image': { POST: schemas.ModelImageSaveResponse },
  '/api/products/{id}/model-image/save': { POST: schemas.ModelImageSaveResponse },
  '/api/products/{id}/model-images': { GET: schemas.ModelImageList },
  '/api/products/{id}/videos': { GET: schemas.VideoSummaryList },
  '/api/products/{id}/style-image': { POST: schemas.StyleImageSaveResponse },
  '/api/products/{id}/style-image/save': { POST: schemas.StyleImageSaveResponse },
  '/api/products/{id}/style-images': { GET: schemas.StyleImageList },
  '/api/products/extract': { POST: schemas.GenerationJobResponse },
  '/api/tasks': { GET: schemas.VideoTaskList },
  '/api/tasks/{id}': { GET: schemas.VideoTask },
  '/api/teams/invite-codes': { GET: schemas.InviteCodeList, POST: schemas.InviteCode },
  '/api/tools': { GET: schemas.GenerationJobResponse },
  '/api/tools/image-blend': { POST: schemas.GenerationJobResponse },
  '/api/upload': { POST: schemas.UploadResponse },
  '/api/videos': { GET: schemas.VideoSummaryList },
  '/api/videos/{videoId}': { GET: schemas.VideoDetail },
  '/api/videos/pending-combinations': { GET: schemas.PendingVideoCombinationList },
  '/api/videos/pose-movement-map': { GET: schemas.PoseMovementMapList },
  '/api/webhooks/runninghub': { POST: schemas.SuccessResponse },
  '/api/workflows': { GET: schemas.WorkflowList },
  '/api/workflows/{code}': { GET: schemas.Workflow },
  '/api/workflows/{code}/execute': { POST: schemas.VideoTask },
}

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name)

    if (entry.isDirectory()) {
      return walk(fullPath)
    }

    return entry.isFile() && entry.name === 'route.ts' ? [fullPath] : []
  })
}

function toOpenApiPath(routeFile: string) {
  const relativePath = relative(apiDir, dirname(routeFile))
    .split(sep)
    .map((segment) => {
      const match = segment.match(/^\[\[?\.{0,3}(.+?)\]?\]$/)
      return match ? `{${match[1]}}` : segment
    })
    .join('/')

  return `/api/${relativePath}`.replace(/\/$/, '')
}

function unique<T>(values: T[]) {
  return [...new Set(values)]
}

function findExportedMethods(source: string) {
  return httpMethods.filter((method) => {
    const pattern = new RegExp(`export\\s+async\\s+function\\s+${method}\\b|export\\s+const\\s+${method}\\b`)
    return pattern.test(source)
  })
}

function findMethodBlock(source: string, method: HttpMethod) {
  const functionStart = source.search(new RegExp(`export\\s+async\\s+function\\s+${method}\\b|export\\s+const\\s+${method}\\b`))
  if (functionStart === -1) {
    return ''
  }

  const nextMethodStart = httpMethods
    .filter((candidate) => candidate !== method)
    .map((candidate) => source.slice(functionStart + 1).search(new RegExp(`export\\s+async\\s+function\\s+${candidate}\\b|export\\s+const\\s+${candidate}\\b`)))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0]

  return nextMethodStart === undefined
    ? source.slice(functionStart)
    : source.slice(functionStart, functionStart + 1 + nextMethodStart)
}

function findPathParams(openApiPath: string) {
  return unique([...openApiPath.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]))
}

function findQueryParams(source: string) {
  return unique([...source.matchAll(/(?:searchParams|request\.nextUrl\.searchParams)\.get\(['"`]([^'"`]+)['"`]\)/g)]
    .map((match) => match[1]))
}

function findFormDataFields(source: string) {
  if (!/formData\s*=\s*await\s+request\.formData\(\)/.test(source)) {
    return []
  }

  return unique([...source.matchAll(/formData\.get\(['"`]([^'"`]+)['"`]\)/g)].map((match) => match[1]))
}

function usesJsonBody(source: string) {
  return /await\s+request\.json\(\)/.test(source)
}

function findStatuses(source: string, method: HttpMethod) {
  const block = findMethodBlock(source, method)
  const explicitStatuses = [...block.matchAll(/status:\s*(\d{3})/g)].map((match) => match[1])
  const defaults = method === 'POST' ? ['200', '201'] : ['200']

  return unique([...defaults, ...explicitStatuses]).sort()
}

function unwrapOptional(schema: ZodTypeAny): ZodTypeAny {
  let current = schema

  while (current instanceof z.ZodOptional || current instanceof z.ZodNullable || current instanceof z.ZodDefault) {
    current = current._def.innerType
  }

  return current
}

function getObjectShape(schema: ZodTypeAny): ZodRawShape {
  const unwrapped = unwrapOptional(schema)
  if (unwrapped instanceof z.ZodObject) {
    return unwrapped.shape
  }

  return {}
}

function schemaToParameterSchema(schema: ZodTypeAny) {
  const unwrapped = unwrapOptional(schema)

  if (unwrapped instanceof z.ZodEnum) {
    return { type: 'string', enum: unwrapped.options }
  }

  if (unwrapped instanceof z.ZodNumber) {
    return { type: 'number' }
  }

  if (unwrapped instanceof z.ZodBoolean) {
    return { type: 'boolean' }
  }

  if (unwrapped instanceof z.ZodArray) {
    return { type: 'array', items: { type: 'string' } }
  }

  return { type: 'string' }
}

function buildParameters(openApiPath: string, source: string, querySchema?: ZodTypeAny) {
  const queryShape = querySchema ? getObjectShape(querySchema) : {}

  return [
    ...findPathParams(openApiPath).map((name) => ({
      name,
      in: 'path',
      required: true,
      schema: { type: 'string' },
    })),
    ...findQueryParams(source).map((name) => {
      const schema = queryShape[name]

      return {
        name,
        in: 'query',
        required: false,
        description: schema?._def?.description,
        schema: schema ? schemaToParameterSchema(schema) : { type: 'string' },
      }
    }),
  ]
}

function getSchemaRef(schema: ZodTypeAny) {
  const name = schemaRefBySchema.get(schema)
  return name ? { $ref: `#/components/schemas/${name}` } : undefined
}

function buildRequestBody(source: string, schema?: ZodTypeAny) {
  const schemaRef = schema ? getSchemaRef(schema) : undefined
  if (schemaRef) {
    return {
      required: true,
      content: {
        'application/json': {
          schema: schemaRef,
        },
      },
    }
  }

  const formFields = findFormDataFields(source)
  if (formFields.length > 0) {
    return {
      required: true,
      content: {
        'multipart/form-data': {
          schema: {
            type: 'object',
            properties: Object.fromEntries(formFields.map((field) => [field, { type: 'string' }])),
          },
        },
      },
    }
  }

  if (!usesJsonBody(source)) {
    return undefined
  }

  return {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          additionalProperties: true,
        },
      },
    },
  }
}

function buildResponses(source: string, method: HttpMethod, successSchema?: ZodTypeAny) {
  return Object.fromEntries(findStatuses(source, method).map((status) => [
    status,
    {
      description: status.startsWith('2') ? 'Success' : 'Error',
      content: {
        'application/json': {
          schema: status.startsWith('2')
            ? getSchemaRef(successSchema ?? schemas.SuccessResponse) ?? {}
            : getSchemaRef(schemas.ErrorResponse) ?? {},
        },
      },
    },
  ]))
}

function titleFromPath(openApiPath: string) {
  return openApiPath
    .replace(/^\/api\/?/, '')
    .replace(/[{}]/g, '')
    .split('/')
    .filter(Boolean)
    .map((part) => part.replace(/-/g, ' '))
    .join(' ')
}

const routeFiles = walk(apiDir).sort()
const paths: Record<string, Record<string, unknown>> = {}

for (const routeFile of routeFiles) {
  const source = readFileSync(routeFile, 'utf8')
  const openApiPath = toOpenApiPath(routeFile)
  const methods = findExportedMethods(source)

  if (methods.length === 0) {
    continue
  }

  paths[openApiPath] ??= {}

  for (const method of methods) {
    const methodBlock = findMethodBlock(source, method)
    const querySchema = querySchemas[openApiPath]?.[method]
    const bodySchema = requestBodySchemas[openApiPath]?.[method]
    const responseSchema = responseSchemas[openApiPath]?.[method]
    const operation: Record<string, unknown> = {
      tags: [openApiPath.split('/')[2] ?? 'api'],
      summary: `${method} ${titleFromPath(openApiPath) || 'api'}`,
      operationId: `${method.toLowerCase()}${openApiPath.replace(/\/api|\{|\}/g, '').replace(/[^a-zA-Z0-9]+(.)/g, (_, char: string) => char.toUpperCase())}`,
      parameters: buildParameters(openApiPath, methodBlock, querySchema),
      responses: buildResponses(methodBlock, method, responseSchema),
    }

    const requestBody = buildRequestBody(methodBlock, bodySchema)
    if (requestBody && !['GET', 'HEAD', 'DELETE'].includes(method)) {
      operation.requestBody = requestBody
    }

    if (Array.isArray(operation.parameters) && operation.parameters.length === 0) {
      delete operation.parameters
    }

    paths[openApiPath][method.toLowerCase()] = operation
  }
}

paths['/api/auth/csrf'] = {
  get: {
    tags: ['auth'],
    summary: 'GET NextAuth CSRF token',
    operationId: 'getAuthCsrf',
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: getSchemaRef(schemas.CsrfResponse),
          },
        },
      },
    },
  },
}

paths['/api/auth/callback/credentials'] = {
  post: {
    tags: ['auth'],
    summary: 'POST NextAuth credentials login',
    operationId: 'postAuthCallbackCredentials',
    requestBody: {
      required: true,
      content: {
        'application/x-www-form-urlencoded': {
          schema: {
            type: 'object',
            required: ['csrfToken', 'email', 'password'],
            properties: {
              csrfToken: { type: 'string' },
              email: { type: 'string', format: 'email' },
              password: { type: 'string', format: 'password' },
              json: { type: 'string', default: 'true' },
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: getSchemaRef(schemas.CredentialsLoginResponse),
          },
        },
      },
      401: {
        description: 'Unauthorized',
        content: {
          'application/json': {
            schema: getSchemaRef(schemas.ErrorResponse),
          },
        },
      },
    },
  },
}

const generator = new OpenApiGeneratorV31(registry.definitions)
const { components } = generator.generateComponents()

const document = {
  openapi: '3.1.0',
  info: {
    title: 'Media AI API',
    version: '0.1.0',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local development server',
    },
  ],
  paths,
  components,
}

mkdirSync(dirname(outputFile), { recursive: true })
writeFileSync(outputFile, `${JSON.stringify(document, null, 2)}\n`)

console.log(`Generated ${relative(rootDir, outputFile)} with ${Object.keys(paths).length} paths.`)
