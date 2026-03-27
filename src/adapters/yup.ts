import type { FieldFormat, FieldType, SchemaInfo } from '../types'

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
  return asYupSchema(schema) !== null
}

const typeMap: Record<string, FieldType> = {
  string: 'string',
  number: 'number',
  boolean: 'boolean',
  date: 'date',
  array: 'array',
  object: 'object',
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
function fromYup(schema: unknown): SchemaInfo {
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

  const enumValues = Array.from(yupSchema._whitelist) as string[]
  if (enumValues.length > 0) {
    return {
      type: 'enum',
      optional,
      nullable,
      getDefaultValue,
      enumValues,
    }
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
  const yupSchema = asYupSchema(schema)
  if (!yupSchema || yupSchema.type !== 'object') return null
  // biome-ignore lint/suspicious/noExplicitAny: Yup internal structure
  const fields = (schema as any)?.fields
  if (!fields || typeof fields !== 'object') return null
  return fields
}

function extractYupArrayItem(schema: unknown): unknown | null {
  const yupSchema = asYupSchema(schema)
  if (!yupSchema || yupSchema.type !== 'array') return null
  // biome-ignore lint/suspicious/noExplicitAny: Yup internal structure
  return (schema as any).innerType ?? null
}

export { isYupSchema, fromYup, extractYupFields, extractYupArrayItem }
