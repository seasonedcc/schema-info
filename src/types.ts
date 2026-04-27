type ScalarFieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'file'
  | 'enum'

type FieldType = ScalarFieldType | 'array' | 'object' | 'union' | 'recursive'

type FieldFormat =
  | 'date'
  | 'datetime'
  | 'time'
  | 'duration'
  | 'email'
  | 'url'
  | 'uuid'
  | 'cuid'
  | 'cuid2'
  | 'ulid'
  | 'emoji'
  | 'base64'
  | 'jwt'
  | 'nanoid'
  | 'ip'
  | 'ipv4'
  | 'ipv6'

const fieldFormatValues: Set<string> = new Set([
  'date',
  'datetime',
  'time',
  'duration',
  'email',
  'url',
  'uuid',
  'cuid',
  'cuid2',
  'ulid',
  'emoji',
  'base64',
  'jwt',
  'nanoid',
  'ip',
  'ipv4',
  'ipv6',
])

type BaseSchemaInfo = {
  format?: FieldFormat
  optional: boolean
  nullable: boolean
  getDefaultValue?: () => unknown
  enumValues?: string[]
}

type ScalarSchemaInfo = BaseSchemaInfo & {
  type: ScalarFieldType | null
}

type ArraySchemaInfo = BaseSchemaInfo & {
  type: 'array'
  item: SchemaInfo
}

type ObjectSchemaInfo = BaseSchemaInfo & {
  type: 'object'
  fields: Record<string, SchemaInfo>
}

type UnionSchemaInfo = BaseSchemaInfo & {
  type: 'union'
  options: SchemaInfo[]
  discriminator?: string
}

type RecursiveSchemaInfo = BaseSchemaInfo & {
  type: 'recursive'
}

type SchemaInfo =
  | ScalarSchemaInfo
  | ArraySchemaInfo
  | ObjectSchemaInfo
  | UnionSchemaInfo
  | RecursiveSchemaInfo

const pureScalarTypes: ReadonlySet<ScalarFieldType> = new Set([
  'string',
  'number',
  'boolean',
  'date',
  'file',
])

function isPureScalarType(
  type: SchemaInfo['type']
): type is 'string' | 'number' | 'boolean' | 'date' | 'file' {
  return type !== null && pureScalarTypes.has(type as ScalarFieldType)
}

function collapseUnionScalars(options: SchemaInfo[]): SchemaInfo | null {
  if (options.length === 0) return null
  const first = options[0]
  if (first.type === 'enum' && options.every((o) => o.type === 'enum')) {
    const merged: string[] = []
    const seenValues = new Set<string>()
    for (const o of options) {
      for (const v of o.enumValues ?? []) {
        if (!seenValues.has(v)) {
          seenValues.add(v)
          merged.push(v)
        }
      }
    }
    return {
      type: 'enum',
      optional: false,
      nullable: false,
      enumValues: merged,
    }
  }
  const firstType = first.type
  if (
    isPureScalarType(firstType) &&
    options.every((o) => o.type === firstType)
  ) {
    return { type: firstType, optional: false, nullable: false }
  }
  return null
}

export { fieldFormatValues, collapseUnionScalars }
export type {
  ScalarFieldType,
  FieldType,
  FieldFormat,
  SchemaInfo,
  ScalarSchemaInfo,
  ArraySchemaInfo,
  ObjectSchemaInfo,
  UnionSchemaInfo,
  RecursiveSchemaInfo,
}
