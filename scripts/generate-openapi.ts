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

extendZodWithOpenApi(z)

const rootDir = dirname(fileURLToPath(new URL('../package.json', import.meta.url)))
const apiDir = join(rootDir, 'app', 'api')
const outputFile = join(rootDir, 'docs', 'openapi.json')
const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const

type HttpMethod = typeof httpMethods[number]
type MethodSchemaMap = Partial<Record<HttpMethod, ZodTypeAny>>

const registry = new OpenAPIRegistry()
const schemas = {
  CreateMaterial: registry.register('CreateMaterial', createMaterialSchema),
  MaterialFilter: registry.register('MaterialFilter', materialFilterSchema),
  CreateProduct: registry.register('CreateProduct', createProductSchema),
  UpdateProduct: registry.register('UpdateProduct', updateProductSchema),
  ProductFilter: registry.register('ProductFilter', productFilterSchema),
  ExtractProductInfo: registry.register('ExtractProductInfo', extractProductInfoSchema),
  CreateVirtualIp: registry.register('CreateVirtualIp', createIpSchema),
  UpdateVirtualIp: registry.register('UpdateVirtualIp', updateIpSchema),
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
])

const requestBodySchemas: Record<string, MethodSchemaMap> = {
  '/api/ips': { POST: schemas.CreateVirtualIp },
  '/api/ips/{id}': { PUT: schemas.UpdateVirtualIp },
  '/api/materials': { POST: schemas.CreateMaterial },
  '/api/products': { POST: schemas.CreateProduct },
  '/api/products/{id}': { PATCH: schemas.UpdateProduct },
  '/api/products/extract': { POST: schemas.ExtractProductInfo },
}

const querySchemas: Record<string, MethodSchemaMap> = {
  '/api/materials': { GET: schemas.MaterialFilter },
  '/api/products': { GET: schemas.ProductFilter },
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

function buildResponses(source: string, method: HttpMethod) {
  return Object.fromEntries(findStatuses(source, method).map((status) => [
    status,
    {
      description: status.startsWith('2') ? 'Success' : 'Error',
      content: {
        'application/json': {
          schema: {},
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
    const operation: Record<string, unknown> = {
      tags: [openApiPath.split('/')[2] ?? 'api'],
      summary: `${method} ${titleFromPath(openApiPath) || 'api'}`,
      operationId: `${method.toLowerCase()}${openApiPath.replace(/\/api|\{|\}/g, '').replace(/[^a-zA-Z0-9]+(.)/g, (_, char: string) => char.toUpperCase())}`,
      parameters: buildParameters(openApiPath, methodBlock, querySchema),
      responses: buildResponses(methodBlock, method),
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
