import type { FieldType, SchemaInfo } from '../types'

type YupSpec = {
  optional?: boolean
  nullable?: boolean
  default?: unknown
  [key: string]: unknown
}

type YupInternalSchema = {
  type: string
  spec: YupSpec
  _whitelist: Iterable<unknown>
  _blacklist: Iterable<unknown>
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

  return {
    type: typeMap[type] ?? null,
    optional,
    nullable,
    getDefaultValue,
  }
}

export { isYupSchema, fromYup }
