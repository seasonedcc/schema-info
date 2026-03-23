import type { FieldFormat, FieldType, SchemaInfo } from '../types'

type ValibotPipeAction = {
  kind: string
  type: string
}

type ValibotInternalSchema = {
  kind: 'schema'
  type: string
  wrapped?: ValibotInternalSchema
  default?: unknown
  options?: unknown[]
  pipe?: ValibotPipeAction[]
  '~standard'?: { vendor?: string }
  [key: string]: unknown
}

const valibotFormatMap: Record<string, FieldFormat> = {
  email: 'email',
  url: 'url',
  uuid: 'uuid',
  cuid2: 'cuid2',
  ulid: 'ulid',
  emoji: 'emoji',
  base64: 'base64',
  nanoid: 'nanoid',
  iso_date: 'date',
  iso_date_time: 'datetime',
  iso_time: 'time',
  iso_timestamp: 'datetime',
  iso_time_second: 'time',
  iso_week: 'date',
  ipv4: 'ipv4',
  ipv6: 'ipv6',
  ip: 'ip',
}

function asValibotSchema(schema: unknown): ValibotInternalSchema | null {
  const candidate = schema as Partial<ValibotInternalSchema>
  if (candidate?.kind !== 'schema' || typeof candidate?.type !== 'string') {
    return null
  }

  const vendor = candidate['~standard']?.vendor
  if (vendor !== 'valibot') return null

  return candidate as ValibotInternalSchema
}

/**
 * Detect whether the given value is a Valibot schema.
 *
 * @param schema - Any value to check
 * @returns `true` when the value is a Valibot v1+ schema instance
 *
 * @example
 * ```ts
 * import * as v from 'valibot'
 * isValibotSchema(v.string()) // true
 * isValibotSchema('hello')    // false
 * ```
 */
function isValibotSchema(schema: unknown): boolean {
  return asValibotSchema(schema) !== null
}

const typeMap: Record<string, FieldType> = {
  string: 'string',
  number: 'number',
  boolean: 'boolean',
  date: 'date',
}

function extractDefault(
  schema: ValibotInternalSchema,
  current?: SchemaInfo['getDefaultValue']
) {
  if (schema.default === undefined) return current
  const raw = schema.default
  return typeof raw === 'function' ? (raw as () => unknown) : () => raw
}

/**
 * Extract {@link SchemaInfo} from a Valibot schema.
 *
 * Recursively unwraps wrapper types (`optional`, `nullable`, `nullish`)
 * to reach the base type. Pipe actions (validations, transforms) are
 * spread onto the schema object by Valibot, so they are transparent
 * and require no special handling.
 *
 * @param schema - A Valibot schema instance
 * @param optional - Accumulated optionality from outer wrappers
 * @param nullable - Accumulated nullability from outer wrappers
 * @param getDefaultValue - Default value getter from an outer wrapper
 * @param enumValues - Enum values carried from an outer wrapper
 * @returns Metadata describing the field's type, optionality, nullability,
 *   default value and enum values
 *
 * @example
 * ```ts
 * import * as v from 'valibot'
 * fromValibot(v.optional(v.string()))
 * // { type: 'string', optional: true, nullable: false }
 * ```
 */
function fromValibot(
  schema: unknown,
  optional = false,
  nullable = false,
  getDefaultValue?: SchemaInfo['getDefaultValue'],
  enumValues?: SchemaInfo['enumValues']
): SchemaInfo {
  const vSchema = asValibotSchema(schema)

  if (!vSchema) {
    return { type: null, optional, nullable, getDefaultValue, enumValues }
  }

  const { type } = vSchema

  if (type === 'optional') {
    return fromValibot(
      vSchema.wrapped,
      true,
      nullable,
      extractDefault(vSchema, getDefaultValue),
      enumValues
    )
  }

  if (type === 'nullable') {
    return fromValibot(
      vSchema.wrapped,
      optional,
      true,
      extractDefault(vSchema, getDefaultValue),
      enumValues
    )
  }

  if (type === 'nullish') {
    return fromValibot(
      vSchema.wrapped,
      true,
      true,
      extractDefault(vSchema, getDefaultValue),
      enumValues
    )
  }

  if (type === 'picklist' || type === 'enum') {
    return {
      type: 'enum',
      optional,
      nullable,
      getDefaultValue,
      enumValues: (vSchema.options ?? []) as string[],
    }
  }

  let format: FieldFormat | undefined
  if (vSchema.pipe) {
    for (const action of vSchema.pipe) {
      if (action.kind === 'validation' && action.type in valibotFormatMap) {
        format = valibotFormatMap[action.type]
        break
      }
    }
  }

  return {
    type: typeMap[type] ?? null,
    ...(format && { format }),
    optional,
    nullable,
    getDefaultValue,
    enumValues,
  }
}

/**
 * Extract field schemas from a Valibot object schema.
 *
 * Handles `optional(object(...))` and `nullable(object(...))` wrappers
 * by unwrapping via the `wrapped` property.
 *
 * @param schema - A Valibot schema that may be or contain an object schema
 * @returns A record mapping field names to their Valibot field schemas,
 *   or `null` if the schema is not an object type
 */
function extractValibotFields(schema: unknown): Record<string, unknown> | null {
  const vSchema = asValibotSchema(schema)
  if (!vSchema) return null

  if (vSchema.type === 'object' && vSchema.entries) {
    return vSchema.entries as Record<string, unknown>
  }

  if (
    (vSchema.type === 'optional' ||
      vSchema.type === 'nullable' ||
      vSchema.type === 'nullish') &&
    vSchema.wrapped
  ) {
    return extractValibotFields(vSchema.wrapped)
  }

  return null
}

export { isValibotSchema, fromValibot, extractValibotFields }
