import type { FieldType, SchemaInfo } from '../types'

type ZodInternalDef = {
  type: string
  innerType?: unknown
  in?: unknown
  out?: unknown
  defaultValue?: unknown
  values?: Iterable<unknown>
  [key: string]: unknown
}

function getZodDef(schema: unknown): ZodInternalDef | null {
  // biome-ignore lint/suspicious/noExplicitAny: Zod internal structure is not typed
  return (schema as any)?._zod?.def ?? null
}

function getZodValues(schema: unknown): Iterable<unknown> | null {
  // biome-ignore lint/suspicious/noExplicitAny: Zod internal structure is not typed
  return (schema as any)?._zod?.values ?? null
}

function isZodSchema(schema: unknown): boolean {
  return getZodDef(schema) !== null
}

const typeMap: Record<string, FieldType> = {
  string: 'string',
  number: 'number',
  boolean: 'boolean',
  date: 'date',
  enum: 'enum',
}

function fromZod(
  schema: unknown,
  optional = false,
  nullable = false,
  getDefaultValue?: SchemaInfo['getDefaultValue'],
  enumValues?: SchemaInfo['enumValues']
): SchemaInfo {
  const def = getZodDef(schema)

  if (!def) {
    return { type: null, optional, nullable, getDefaultValue, enumValues }
  }

  const { type } = def

  if (type === 'transform') {
    return { type: null, optional, nullable, getDefaultValue, enumValues }
  }

  if (type === 'pipe') {
    return fromZod(def.in, optional, nullable, getDefaultValue, enumValues)
  }

  if (type === 'optional') {
    return fromZod(def.innerType, true, nullable, getDefaultValue, enumValues)
  }

  if (type === 'nullable') {
    return fromZod(def.innerType, optional, true, getDefaultValue, enumValues)
  }

  if (type === 'default') {
    return fromZod(
      def.innerType,
      optional,
      nullable,
      () => def.defaultValue,
      enumValues
    )
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

  return {
    type: typeMap[type] ?? null,
    optional,
    nullable,
    getDefaultValue,
    enumValues,
  }
}

export { isZodSchema, fromZod }
