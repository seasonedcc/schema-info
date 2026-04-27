import type { FieldFormat, ScalarFieldType, SchemaInfo } from '../types'
import { collapseUnionScalars } from '../types'

const JoiSymbol = Symbol.for('@hapi/joi/schema')

type JoiRule = {
  name: string
  args?: Record<string, unknown>
}

type JoiSchema = {
  type: string
  _flags: Record<string, unknown>
  _rules: JoiRule[]
  _valids?: { _values?: Set<unknown> }
  [key: symbol]: unknown
}

const joiFormatMap: Record<string, FieldFormat> = {
  email: 'email',
  uri: 'url',
  guid: 'uuid',
  isoDate: 'datetime',
  isoDuration: 'duration',
  ip: 'ip',
  base64: 'base64',
}

function asJoiSchema(schema: unknown): JoiSchema | null {
  const candidate = schema as Partial<JoiSchema>
  if (!candidate || typeof candidate !== 'object') return null
  if (!(JoiSymbol in candidate)) return null
  if (typeof candidate.type !== 'string') return null
  return candidate as JoiSchema
}

/**
 * Detect whether the given value is a Joi schema.
 *
 * @param schema - Any value to check
 * @returns `true` when the value is a Joi schema instance
 *
 * @example
 * ```ts
 * import Joi from 'joi'
 * isJoiSchema(Joi.string()) // true
 * isJoiSchema('hello')      // false
 * ```
 */
function isJoiSchema(schema: unknown): boolean {
  return asJoiSchema(schema) !== null
}

const typeMap: Record<string, ScalarFieldType> = {
  string: 'string',
  number: 'number',
  boolean: 'boolean',
  date: 'date',
}

type JoiAltSwitch = { is?: unknown; then?: unknown; otherwise?: unknown }
type JoiAltMatch = {
  schema?: unknown
  ref?: { path?: unknown[] }
  switch?: JoiAltSwitch[]
}

function extractFromAlternatives(
  schema: unknown,
  recurse: (s: unknown) => SchemaInfo,
  optional: boolean,
  nullable: boolean,
  getDefaultValue: SchemaInfo['getDefaultValue']
): SchemaInfo {
  const matches =
    (schema as { $_terms?: { matches?: JoiAltMatch[] } }).$_terms?.matches ?? []

  let discriminator: string | undefined
  let rawOptions: unknown[] = []

  const conditional = matches.find(
    (m) => m.ref && Array.isArray(m.ref.path) && m.ref.path.length > 0
  )
  if (conditional?.ref?.path && conditional.ref.path.length > 0) {
    const path = conditional.ref.path
    if (path.length === 1 && typeof path[0] === 'string') {
      discriminator = path[0]
    }
    rawOptions = (conditional.switch ?? [])
      .map((sw) => sw.then)
      .filter((s): s is unknown => s !== undefined && s !== null)
  } else {
    rawOptions = matches
      .map((m) => m.schema)
      .filter((s): s is unknown => s !== undefined && s !== null)
  }

  if (rawOptions.length === 0) {
    return { type: null, optional, nullable, getDefaultValue }
  }
  if (rawOptions.length === 1) {
    const info = recurse(rawOptions[0])
    return { ...info, optional, nullable, getDefaultValue }
  }

  const optionInfos = rawOptions.map((o) => recurse(o))
  const collapsed = collapseUnionScalars(optionInfos)
  if (collapsed) {
    return { ...collapsed, optional, nullable, getDefaultValue }
  }

  if (!discriminator) {
    discriminator = detectJoiDiscriminator(rawOptions)
  }

  return {
    type: 'union',
    options: optionInfos,
    ...(discriminator && { discriminator }),
    optional,
    nullable,
    getDefaultValue,
  }
}

function detectJoiDiscriminator(options: unknown[]): string | undefined {
  const objectSchemas = options
    .map((o) => asJoiSchema(o))
    .filter((s): s is JoiSchema => s !== null && s.type === 'object')
  if (objectSchemas.length !== options.length) return undefined
  if (objectSchemas.length < 2) return undefined

  const candidates = new Map<string, Set<string>>()
  const firstKeys = getJoiObjectKeys(objectSchemas[0])
  for (const [key, fieldSchema] of firstKeys) {
    const value = singleStringOnlyValue(fieldSchema)
    if (value === undefined) continue
    candidates.set(key, new Set([value]))
  }

  for (let i = 1; i < objectSchemas.length; i++) {
    const keyMap = getJoiObjectKeys(objectSchemas[i])
    const visited = new Set<string>()
    for (const [key, fieldSchema] of keyMap) {
      if (!candidates.has(key)) continue
      const value = singleStringOnlyValue(fieldSchema)
      if (value === undefined) {
        candidates.delete(key)
        continue
      }
      const values = candidates.get(key)
      if (!values || values.has(value)) {
        candidates.delete(key)
        continue
      }
      values.add(value)
      visited.add(key)
    }
    for (const key of Array.from(candidates.keys())) {
      if (!visited.has(key)) candidates.delete(key)
    }
  }

  if (candidates.size === 0) return undefined
  return candidates.keys().next().value
}

function getJoiObjectKeys(schema: JoiSchema): Map<string, unknown> {
  const result = new Map<string, unknown>()
  // biome-ignore lint/suspicious/noExplicitAny: Joi internal structure
  const keys = (schema as any).$_terms?.keys as
    | { key: string; schema: unknown }[]
    | undefined
  if (keys && Array.isArray(keys)) {
    for (const entry of keys) {
      result.set(entry.key, entry.schema)
    }
  }
  return result
}

function singleStringOnlyValue(schema: unknown): string | undefined {
  const joi = asJoiSchema(schema)
  if (!joi) return undefined
  if (joi._flags.only !== true) return undefined
  const values = joi._valids?._values
  if (!values || values.size !== 1) return undefined
  const [value] = [...values]
  return typeof value === 'string' ? value : undefined
}

/**
 * Extract {@link SchemaInfo} from a Joi schema.
 *
 * Reads `schema.type` for the base field type, `schema._flags` for
 * presence (optional/required) and default values, and `schema._valids`
 * for nullable and enum values. Joi schemas are optional by default
 * unless `.required()` is called.
 *
 * @param schema - A Joi schema instance
 * @returns Metadata describing the field's type, optionality, nullability,
 *   default value and enum values
 *
 * @example
 * ```ts
 * import Joi from 'joi'
 * fromJoi(Joi.string().required())
 * // { type: 'string', optional: false, nullable: false }
 * ```
 */
function fromJoi(
  schema: unknown,
  recurse: (s: unknown) => SchemaInfo
): SchemaInfo {
  const joiSchema = asJoiSchema(schema)

  if (!joiSchema) {
    return { type: null, optional: false, nullable: false }
  }

  const optional = joiSchema._flags.presence !== 'required'
  const valids = joiSchema._valids?._values
  const nullable = valids?.has(null) === true
  const getDefaultValue =
    'default' in joiSchema._flags ? () => joiSchema._flags.default : undefined

  if (joiSchema.type === 'link') {
    return { type: 'recursive', optional, nullable, getDefaultValue }
  }

  if (joiSchema.type === 'alternatives') {
    return extractFromAlternatives(
      schema,
      recurse,
      optional,
      nullable,
      getDefaultValue
    )
  }

  for (const rule of joiSchema._rules) {
    if (rule.name === 'instance') {
      const ctor = rule.args?.constructor
      if (
        (typeof File !== 'undefined' && ctor === File) ||
        (typeof Blob !== 'undefined' && ctor === Blob)
      ) {
        return {
          type: 'file',
          optional,
          nullable,
          getDefaultValue,
        }
      }
      return { type: null, optional, nullable, getDefaultValue }
    }
  }

  if (joiSchema.type === 'array') {
    // biome-ignore lint/suspicious/noExplicitAny: Joi internal structure
    const items = (schema as any)?.$_terms?.items as unknown[] | undefined
    const firstItem = Array.isArray(items) && items.length > 0 ? items[0] : null
    if (!firstItem) return { type: null, optional, nullable, getDefaultValue }
    return {
      type: 'array',
      item: recurse(firstItem),
      optional,
      nullable,
      getDefaultValue,
    }
  }

  if (joiSchema.type === 'object') {
    // biome-ignore lint/suspicious/noExplicitAny: Joi internal structure
    const keys = (schema as any)?.$_terms?.keys as
      | { key: string; schema: unknown }[]
      | undefined
    const fields: Record<string, SchemaInfo> = {}
    if (keys && Array.isArray(keys)) {
      for (const entry of keys) {
        fields[entry.key] = recurse(entry.schema)
      }
    }
    return { type: 'object', fields, optional, nullable, getDefaultValue }
  }

  if (joiSchema._flags.only === true && valids && valids.size > 0) {
    const enumValues = [...valids].filter(
      (v): v is string => typeof v === 'string'
    )
    if (enumValues.length > 0) {
      return {
        type: 'enum',
        optional,
        nullable,
        getDefaultValue,
        enumValues,
      }
    }
  }

  let format: FieldFormat | undefined
  for (const rule of joiSchema._rules) {
    if (rule.name in joiFormatMap) {
      format = joiFormatMap[rule.name]
      break
    }
  }

  return {
    type: typeMap[joiSchema.type] ?? null,
    ...(format && { format }),
    optional,
    nullable,
    getDefaultValue,
  }
}

/**
 * Extract field schemas from a Joi object schema.
 *
 * @param schema - A Joi schema that may be an object schema
 * @returns A record mapping field names to their Joi field schemas,
 *   or `null` if the schema is not an object type
 */
function extractJoiFields(schema: unknown): Record<string, unknown> | null {
  const joiSchema = asJoiSchema(schema)
  if (!joiSchema || joiSchema.type !== 'object') return null

  // biome-ignore lint/suspicious/noExplicitAny: Joi internal structure
  const keys = (schema as any)?.$_terms?.keys as
    | { key: string; schema: unknown }[]
    | undefined
  if (!keys || !Array.isArray(keys)) return null

  const result: Record<string, unknown> = {}
  for (const entry of keys) {
    result[entry.key] = entry.schema
  }
  return result
}

export { isJoiSchema, fromJoi, extractJoiFields }
