type ScalarFieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'file'
  | 'enum'

type FieldType = ScalarFieldType | 'array' | 'object'

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

type SchemaInfo = ScalarSchemaInfo | ArraySchemaInfo | ObjectSchemaInfo

export { fieldFormatValues }
export type {
  ScalarFieldType,
  FieldType,
  FieldFormat,
  SchemaInfo,
  ScalarSchemaInfo,
  ArraySchemaInfo,
  ObjectSchemaInfo,
}
