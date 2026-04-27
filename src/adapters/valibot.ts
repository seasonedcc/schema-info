import type { FieldFormat, ScalarFieldType, SchemaInfo } from '../types'
import { collapseUnionScalars } from '../types'

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

function isFileOrBlobConstructor(cls: unknown): boolean {
  return (
    (typeof File !== 'undefined' && cls === File) ||
    (typeof Blob !== 'undefined' && cls === Blob)
  )
}

const typeMap: Record<string, ScalarFieldType> = {
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
  recurse: (s: unknown) => SchemaInfo,
  optional = false,
  nullable = false,
  getDefaultValue?: SchemaInfo['getDefaultValue'],
  enumValues?: SchemaInfo['enumValues'],
  seen: Set<unknown> = new Set()
): SchemaInfo {
  const vSchema = asValibotSchema(schema)

  if (!vSchema) {
    return { type: null, optional, nullable, getDefaultValue, enumValues }
  }

  const { type } = vSchema

  if (type === 'optional') {
    return fromValibot(
      vSchema.wrapped,
      recurse,
      true,
      nullable,
      extractDefault(vSchema, getDefaultValue),
      enumValues,
      seen
    )
  }

  if (type === 'nullable') {
    return fromValibot(
      vSchema.wrapped,
      recurse,
      optional,
      true,
      extractDefault(vSchema, getDefaultValue),
      enumValues,
      seen
    )
  }

  if (type === 'nullish') {
    return fromValibot(
      vSchema.wrapped,
      recurse,
      true,
      true,
      extractDefault(vSchema, getDefaultValue),
      enumValues,
      seen
    )
  }

  if (type === 'literal') {
    const lit = (vSchema as { literal?: unknown }).literal
    if (typeof lit === 'string') {
      return { type: 'string', optional, nullable, getDefaultValue, enumValues }
    }
    if (typeof lit === 'number') {
      return { type: 'number', optional, nullable, getDefaultValue, enumValues }
    }
    if (typeof lit === 'boolean') {
      return {
        type: 'boolean',
        optional,
        nullable,
        getDefaultValue,
        enumValues,
      }
    }
    return { type: null, optional, nullable, getDefaultValue, enumValues }
  }

  if (type === 'lazy') {
    if (seen.has(schema)) {
      return {
        type: 'recursive',
        optional,
        nullable,
        getDefaultValue,
        enumValues,
      }
    }
    const getter = (vSchema as { getter?: () => unknown }).getter
    if (typeof getter !== 'function') {
      return { type: null, optional, nullable, getDefaultValue, enumValues }
    }
    seen.add(schema)
    try {
      return fromValibot(
        getter(),
        recurse,
        optional,
        nullable,
        getDefaultValue,
        enumValues,
        seen
      )
    } finally {
      seen.delete(schema)
    }
  }

  if (type === 'union' || type === 'variant') {
    const rawOptions = (vSchema.options ?? []) as ValibotInternalSchema[]
    let isOptional = optional
    let isNullable = nullable
    const remaining: ValibotInternalSchema[] = []
    for (const option of rawOptions) {
      if (option.type === 'null') isNullable = true
      else if (option.type === 'undefined') isOptional = true
      else remaining.push(option)
    }

    const allStringLiterals =
      remaining.length > 0 &&
      remaining.every(
        (o) =>
          o.type === 'literal' &&
          typeof (o as { literal?: unknown }).literal === 'string'
      )
    if (allStringLiterals) {
      return {
        type: 'enum',
        optional: isOptional,
        nullable: isNullable,
        getDefaultValue,
        enumValues: remaining.map(
          (o) => (o as unknown as { literal: string }).literal
        ),
      }
    }

    const isBooleanLiteralPair =
      remaining.length === 2 &&
      remaining.every((o) => o.type === 'literal') &&
      remaining.some((o) => (o as { literal?: unknown }).literal === true) &&
      remaining.some((o) => (o as { literal?: unknown }).literal === false)
    if (isBooleanLiteralPair) {
      return {
        type: 'boolean',
        optional: isOptional,
        nullable: isNullable,
        getDefaultValue,
        enumValues,
      }
    }

    if (remaining.length === 1) {
      return fromValibot(
        remaining[0],
        recurse,
        isOptional,
        isNullable,
        getDefaultValue,
        enumValues,
        seen
      )
    }

    if (remaining.length === 0) {
      return {
        type: null,
        optional: isOptional,
        nullable: isNullable,
        getDefaultValue,
        enumValues,
      }
    }

    const optionInfos = remaining.map((o) => recurse(o))
    const collapsed = collapseUnionScalars(optionInfos)
    if (collapsed) {
      return {
        ...collapsed,
        optional: isOptional,
        nullable: isNullable,
        getDefaultValue,
      }
    }
    const variantKey =
      type === 'variant'
        ? (vSchema as unknown as { key?: unknown }).key
        : undefined
    const discriminator =
      typeof variantKey === 'string' ? variantKey : undefined
    return {
      type: 'union',
      options: optionInfos,
      ...(discriminator && { discriminator }),
      optional: isOptional,
      nullable: isNullable,
      getDefaultValue,
      enumValues,
    }
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

  if (type === 'instance') {
    // biome-ignore lint/suspicious/noExplicitAny: Valibot uses 'class' as property name
    const cls = (vSchema as any).class
    if (isFileOrBlobConstructor(cls)) {
      return {
        type: 'file',
        optional,
        nullable,
        getDefaultValue,
        enumValues,
      }
    }
  }

  if (type === 'array') {
    const item = vSchema.item
    if (!item)
      return { type: null, optional, nullable, getDefaultValue, enumValues }
    return {
      type: 'array',
      item: recurse(item),
      optional,
      nullable,
      getDefaultValue,
      enumValues,
    }
  }

  if (type === 'object' && vSchema.entries) {
    const entries = vSchema.entries as Record<string, unknown>
    const fields: Record<string, SchemaInfo> = {}
    for (const key of Object.keys(entries)) {
      fields[key] = recurse(entries[key])
    }
    return {
      type: 'object',
      fields,
      optional,
      nullable,
      getDefaultValue,
      enumValues,
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

  if (vSchema.type === 'lazy') {
    const getter = (vSchema as { getter?: () => unknown }).getter
    if (typeof getter === 'function') {
      return extractValibotFields(getter())
    }
  }

  return null
}

export { isValibotSchema, fromValibot, extractValibotFields }
