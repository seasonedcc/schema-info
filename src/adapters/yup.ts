import type { FieldFormat, ScalarFieldType, SchemaInfo } from '../types'

type YupSpec = {
  optional?: boolean
  nullable?: boolean
  default?: unknown
  [key: string]: unknown
}

type YupTest = {
  OPTIONS?: { name?: string }
}

type YupInternalSchema = {
  type: string
  spec: YupSpec
  tests: YupTest[]
  _whitelist: Iterable<unknown>
  _blacklist: Iterable<unknown>
}

const yupFormatMap: Record<string, FieldFormat> = {
  email: 'email',
  url: 'url',
  uuid: 'uuid',
  datetime: 'datetime',
}

function asYupSchema(schema: unknown): YupInternalSchema | null {
  const candidate = schema as Partial<YupInternalSchema>
  if (
    typeof candidate?.type !== 'string' ||
    typeof candidate?.spec !== 'object' ||
    candidate.spec === null ||
    !candidate._whitelist ||
    !candidate._blacklist
  ) {
    return null
  }
  return candidate as YupInternalSchema
}

type YupLazy = {
  type: 'lazy'
  resolve: (opts: { value: unknown }) => unknown
}

function asYupLazy(schema: unknown): YupLazy | null {
  if (!schema || typeof schema !== 'object') return null
  const candidate = schema as Partial<YupLazy>
  if (candidate.type !== 'lazy') return null
  if (typeof candidate.resolve !== 'function') return null
  return candidate as YupLazy
}

/**
 * Detect whether the given value is a Yup schema.
 *
 * @param schema - Any value to check
 * @returns `true` when the value is a Yup schema instance
 *
 * @example
 * ```ts
 * import * as yup from 'yup'
 * isYupSchema(yup.string()) // true
 * isYupSchema('hello')      // false
 * ```
 */
function isYupSchema(schema: unknown): boolean {
  return asYupSchema(schema) !== null || asYupLazy(schema) !== null
}

const typeMap: Record<string, ScalarFieldType> = {
  string: 'string',
  number: 'number',
  boolean: 'boolean',
  date: 'date',
}

/**
 * Extract {@link SchemaInfo} from a Yup schema.
 *
 * Reads `schema.type` for the base field type and `schema.spec` for
 * modifiers (optional, nullable, default). Enum values are read from
 * the internal `_whitelist` set, populated by `.oneOf()`. Effects like
 * `.transform()`, `.test()`, and `.when()` are transparent and do not
 * affect the extracted metadata.
 *
 * @param schema - A Yup schema instance
 * @returns Metadata describing the field's type, optionality, nullability,
 *   default value and enum values
 *
 * @example
 * ```ts
 * import * as yup from 'yup'
 * fromYup(yup.string().required())
 * // { type: 'string', optional: false, nullable: false }
 * ```
 */
function fromYup(
  schema: unknown,
  recurse: (s: unknown) => SchemaInfo,
  seen: Set<unknown> = new Set()
): SchemaInfo {
  const lazy = asYupLazy(schema)
  if (lazy) {
    if (seen.has(schema)) {
      return { type: 'recursive', optional: false, nullable: false }
    }
    seen.add(schema)
    try {
      const inner = lazy.resolve({ value: undefined })
      return fromYup(inner, recurse, seen)
    } finally {
      seen.delete(schema)
    }
  }

  const yupSchema = asYupSchema(schema)

  if (!yupSchema) {
    return { type: null, optional: false, nullable: false }
  }

  const { type, spec } = yupSchema
  const optional = spec.optional === true
  const nullable = spec.nullable === true
  const getDefaultValue = 'default' in spec ? () => spec.default : undefined

  if (type === 'mixed') {
    // biome-ignore lint/suspicious/noExplicitAny: Yup internal structure
    const typeCheck = (yupSchema as any)._typeCheck as
      | ((v: unknown) => boolean)
      | undefined
    if (typeCheck && !typeCheck('')) {
      const isFile =
        (typeof File !== 'undefined' && typeCheck(new File([], ''))) ||
        (typeof Blob !== 'undefined' && typeCheck(new Blob()))
      if (isFile) {
        return {
          type: 'file',
          optional,
          nullable,
          getDefaultValue,
        }
      }
    }
  }

  const whitelistValues = Array.from(yupSchema._whitelist)
  const enumValues = whitelistValues.filter(
    (v): v is string => typeof v === 'string'
  )
  if (enumValues.length > 0 && enumValues.length === whitelistValues.length) {
    return {
      type: 'enum',
      optional,
      nullable,
      getDefaultValue,
      enumValues,
    }
  }

  if (type === 'array') {
    // biome-ignore lint/suspicious/noExplicitAny: Yup internal structure
    const innerType = (schema as any).innerType
    if (!innerType) return { type: null, optional, nullable, getDefaultValue }
    return {
      type: 'array',
      item: recurse(innerType),
      optional,
      nullable,
      getDefaultValue,
    }
  }

  if (type === 'object') {
    // biome-ignore lint/suspicious/noExplicitAny: Yup internal structure
    const rawFields = (schema as any)?.fields
    const fields: Record<string, SchemaInfo> = {}
    if (rawFields && typeof rawFields === 'object') {
      for (const key of Object.keys(rawFields)) {
        fields[key] = recurse(rawFields[key])
      }
    }
    return { type: 'object', fields, optional, nullable, getDefaultValue }
  }

  let format: FieldFormat | undefined
  for (const test of yupSchema.tests) {
    const name = test.OPTIONS?.name
    if (name && name in yupFormatMap) {
      format = yupFormatMap[name]
      break
    }
  }

  return {
    type: typeMap[type] ?? null,
    ...(format && { format }),
    optional,
    nullable,
    getDefaultValue,
  }
}

/**
 * Extract field schemas from a Yup object schema.
 *
 * @param schema - A Yup schema that may be an object schema
 * @returns A record mapping field names to their Yup field schemas,
 *   or `null` if the schema is not an object type
 */
function extractYupFields(schema: unknown): Record<string, unknown> | null {
  const lazy = asYupLazy(schema)
  if (lazy) {
    return extractYupFields(lazy.resolve({ value: undefined }))
  }
  const yupSchema = asYupSchema(schema)
  if (!yupSchema || yupSchema.type !== 'object') return null
  // biome-ignore lint/suspicious/noExplicitAny: Yup internal structure
  const fields = (schema as any)?.fields
  if (!fields || typeof fields !== 'object') return null
  return fields
}

export { isYupSchema, fromYup, extractYupFields }
