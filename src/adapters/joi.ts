import type { FieldFormat, FieldType, SchemaInfo } from '../types'

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

const typeMap: Record<string, FieldType> = {
  string: 'string',
  number: 'number',
  boolean: 'boolean',
  date: 'date',
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
function fromJoi(schema: unknown): SchemaInfo {
  const joiSchema = asJoiSchema(schema)

  if (!joiSchema) {
    return { type: null, optional: false, nullable: false }
  }

  const optional = joiSchema._flags.presence !== 'required'
  const valids = joiSchema._valids?._values
  const nullable = valids?.has(null) === true
  const getDefaultValue =
    'default' in joiSchema._flags ? () => joiSchema._flags.default : undefined

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
    }
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
