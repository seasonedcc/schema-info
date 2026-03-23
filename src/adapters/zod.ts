import type { FieldFormat, FieldType, SchemaInfo } from '../types'
import { fieldFormatValues } from '../types'

type ZodInternalDef = {
  type: string
  format?: string
  innerType?: unknown
  in?: unknown
  out?: unknown
  defaultValue?: unknown
  values?: Iterable<unknown>
  options?: unknown[]
  [key: string]: unknown
}

function getZodDef(schema: unknown): ZodInternalDef | null {
  // biome-ignore lint/suspicious/noExplicitAny: Zod internal structure is not typed
  return (schema as any)?._zod?.def ?? null
}

function getZodFormat(schema: unknown): FieldFormat | undefined {
  const def = getZodDef(schema)
  // biome-ignore lint/suspicious/noExplicitAny: Zod internal structure is not typed
  const raw = def?.format ?? (schema as any)?._zod?.bag?.format
  if (typeof raw === 'string' && fieldFormatValues.has(raw)) {
    return raw as FieldFormat
  }
  return undefined
}

function getZodValues(schema: unknown): Iterable<unknown> | null {
  // biome-ignore lint/suspicious/noExplicitAny: Zod internal structure is not typed
  return (schema as any)?._zod?.values ?? null
}

/**
 * Detect whether the given value is a Zod 4+ schema.
 *
 * @param schema - Any value to check
 * @returns `true` when the value is a Zod schema instance
 *
 * @example
 * ```ts
 * import * as z from 'zod'
 * isZodSchema(z.string()) // true
 * isZodSchema('hello')    // false
 * ```
 */
function isZodSchema(schema: unknown): boolean {
  return getZodDef(schema) !== null
}

function isZodBooleanLiteralUnion(schemas: unknown[]) {
  if (schemas.length !== 2) return false
  const values = schemas.map((s) => {
    const d = getZodDef(s)
    if (d?.type !== 'literal' || !d.values) return undefined
    const vals = Array.from(d.values as Iterable<unknown>)
    return vals.length === 1 ? vals[0] : undefined
  })
  return values.includes(true) && values.includes(false)
}

function flattenZodUnionOptions(options: unknown[]): unknown[] {
  const result: unknown[] = []
  for (const option of options) {
    const def = getZodDef(option)
    if (def?.type === 'union' && def.options) {
      result.push(...flattenZodUnionOptions(def.options))
    } else {
      result.push(option)
    }
  }
  return result
}

const typeMap: Record<string, FieldType> = {
  string: 'string',
  number: 'number',
  boolean: 'boolean',
  date: 'date',
  enum: 'enum',
}

/**
 * Extract {@link SchemaInfo} from a Zod 4+ schema.
 *
 * Recursively unwraps modifier types (`optional`, `nullable`, `default`,
 * `pipe`) to reach the base type. Transforms are opaque and yield
 * `type: null`.
 *
 * @param schema - A Zod schema instance
 * @param optional - Accumulated optionality from outer wrappers
 * @param nullable - Accumulated nullability from outer wrappers
 * @param getDefaultValue - Default value getter from an outer `default` wrapper
 * @param enumValues - Enum values carried from an outer wrapper
 * @returns Metadata describing the field's type, optionality, nullability,
 *   default value and enum values
 *
 * @example
 * ```ts
 * import * as z from 'zod'
 * fromZod(z.string().optional())
 * // { type: 'string', optional: true, nullable: false }
 * ```
 */
function fromZod(
  schema: unknown,
  optional = false,
  nullable = false,
  getDefaultValue?: SchemaInfo['getDefaultValue'],
  enumValues?: SchemaInfo['enumValues'],
  format?: FieldFormat
): SchemaInfo {
  const def = getZodDef(schema)

  if (!def) {
    return {
      type: null,
      ...(format && { format }),
      optional,
      nullable,
      getDefaultValue,
      enumValues,
    }
  }

  const { type } = def

  if (type === 'transform') {
    return {
      type: null,
      ...(format && { format }),
      optional,
      nullable,
      getDefaultValue,
      enumValues,
    }
  }

  if (type === 'pipe') {
    return fromZod(
      def.in,
      optional,
      nullable,
      getDefaultValue,
      enumValues,
      format ?? getZodFormat(schema)
    )
  }

  if (type === 'optional') {
    return fromZod(
      def.innerType,
      true,
      nullable,
      getDefaultValue,
      enumValues,
      format
    )
  }

  if (type === 'nullable') {
    return fromZod(
      def.innerType,
      optional,
      true,
      getDefaultValue,
      enumValues,
      format
    )
  }

  if (type === 'default') {
    return fromZod(
      def.innerType,
      optional,
      nullable,
      () => def.defaultValue,
      enumValues,
      format
    )
  }

  if (type === 'union' && def.options) {
    const branches = flattenZodUnionOptions(def.options)
    let isOptional = optional
    let isNullable = nullable
    const remaining: unknown[] = []

    for (const option of branches) {
      const optionDef = getZodDef(option)
      if (optionDef?.type === 'null') {
        isNullable = true
      } else if (optionDef?.type === 'undefined') {
        isOptional = true
      } else {
        remaining.push(option)
      }
    }

    const allStringLiterals =
      remaining.length > 0 &&
      remaining.every((option) => {
        const d = getZodDef(option)
        if (d?.type !== 'literal' || !d.values) return false
        const vals = Array.from(d.values as Iterable<unknown>)
        return vals.length === 1 && typeof vals[0] === 'string'
      })

    if (allStringLiterals) {
      const values = remaining.flatMap((option) => {
        const d = getZodDef(option)
        if (!d?.values) return []
        return Array.from(d.values as Iterable<unknown>) as string[]
      })
      return {
        type: 'enum',
        optional: isOptional,
        nullable: isNullable,
        getDefaultValue,
        enumValues: values,
      }
    }

    if (isZodBooleanLiteralUnion(remaining)) {
      return {
        type: 'boolean',
        optional: isOptional,
        nullable: isNullable,
        getDefaultValue,
        enumValues,
      }
    }

    if (remaining.length === 1) {
      return fromZod(
        remaining[0],
        isOptional,
        isNullable,
        getDefaultValue,
        enumValues,
        format
      )
    }

    return {
      type: null,
      optional: isOptional,
      nullable: isNullable,
      getDefaultValue,
      enumValues,
    }
  }

  if (type === 'enum') {
    const values = Array.from(getZodValues(schema) || []) as string[]
    return {
      type: 'enum',
      optional,
      nullable,
      getDefaultValue,
      enumValues: values,
    }
  }

  const resolvedFormat = format ?? getZodFormat(schema)
  return {
    type: typeMap[type] ?? null,
    ...(resolvedFormat && { format: resolvedFormat }),
    optional,
    nullable,
    getDefaultValue,
    enumValues,
  }
}

function getZodShape(schema: unknown): Record<string, unknown> | null {
  // biome-ignore lint/suspicious/noExplicitAny: Zod internal structure is not typed
  if ((schema as any)?.shape) return (schema as any).shape

  const def = getZodDef(schema)
  if (!def) return null

  if (def.type === 'pipe') {
    // biome-ignore lint/suspicious/noExplicitAny: Zod internal structure is not typed
    if ((def.in as any)?.shape) return (def.in as any).shape
    // biome-ignore lint/suspicious/noExplicitAny: Zod internal structure is not typed
    if ((def.out as any)?.shape) return (def.out as any).shape
    return getZodShape(def.in) ?? getZodShape(def.out)
  }

  if (
    def.type === 'readonly' ||
    def.type === 'optional' ||
    def.type === 'nullable' ||
    def.type === 'default'
  ) {
    return getZodShape(def.innerType)
  }

  if (def.type === 'union' && def.options) {
    const branches = flattenZodUnionOptions(def.options)
    for (const branch of branches) {
      const branchDef = getZodDef(branch)
      if (branchDef?.type === 'null' || branchDef?.type === 'undefined')
        continue
      const shape = getZodShape(branch)
      if (shape) return shape
    }
  }

  return null
}

/**
 * Extract field schemas from a Zod object schema.
 *
 * Unwraps pipes, transforms, readonly, optional, nullable, and default
 * wrappers to find the underlying object's `shape` property.
 *
 * @param schema - A Zod schema that may be or contain an object schema
 * @returns A record mapping field names to their Zod field schemas,
 *   or `null` if the schema is not an object type
 */
function extractZodFields(schema: unknown): Record<string, unknown> | null {
  if (!isZodSchema(schema)) return null
  return getZodShape(schema)
}

export { isZodSchema, fromZod, extractZodFields }
