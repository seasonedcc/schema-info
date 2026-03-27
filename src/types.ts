type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'file'
  | 'enum'
  | 'array'
  | 'object'

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

type SchemaInfo = {
  type: FieldType | null
  format?: FieldFormat
  optional: boolean
  nullable: boolean
  getDefaultValue?: () => unknown
  enumValues?: string[]
  item?: SchemaInfo
  fields?: Record<string, SchemaInfo>
}

export { fieldFormatValues }
export type { FieldType, FieldFormat, SchemaInfo }
