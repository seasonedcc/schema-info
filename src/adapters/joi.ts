import type { FieldType, SchemaInfo } from '../types'

const JoiSymbol = Symbol.for('@hapi/joi/schema')

type JoiSchema = {
  type: string
  _flags: Record<string, unknown>
  _valids?: { _values?: Set<unknown> }
  [key: symbol]: unknown
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

  return {
    type: typeMap[joiSchema.type] ?? null,
    optional,
    nullable,
    getDefaultValue,
  }
}

export { isJoiSchema, fromJoi }
