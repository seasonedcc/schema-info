/**
 * Supported field types recognized by schema introspection.
 *
 * @example
 * ```ts
 * const t: FieldType = 'string'
 * ```
 */
type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'enum'

/**
 * Metadata extracted from a schema field by {@link schemaInfo}.
 *
 * This is the universal output type — regardless of which schema library
 * produced the original field definition, the result is always a
 * `SchemaInfo` object.
 *
 * @example
 * ```ts
 * const info: SchemaInfo = {
 *   type: 'string',
 *   optional: false,
 *   nullable: true,
 * }
 * ```
 */
type SchemaInfo = {
  type: FieldType | null
  optional: boolean
  nullable: boolean
  getDefaultValue?: () => unknown
  enumValues?: string[]
}

export type { FieldType, SchemaInfo }
