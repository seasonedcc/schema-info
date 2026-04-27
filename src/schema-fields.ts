import {
  extractArkTypeFields,
  extractFromNode,
  isArkTypeSchema,
} from './adapters/arktype'
import {
  extractEffectFields,
  extractFromAST,
  isEffectSchema,
} from './adapters/effect'
import { extractJoiFields, isJoiSchema } from './adapters/joi'
import { extractValibotFields, isValibotSchema } from './adapters/valibot'
import { extractYupFields, isYupSchema } from './adapters/yup'
import { extractZodFields, isZodSchema } from './adapters/zod'
import { SchemaFieldsError } from './schema-fields-error'
import { introspect } from './schema-info'
import type { SchemaInfo } from './types'

function mapRecord(
  fields: Record<string, unknown>,
  seen: Set<unknown>
): Record<string, SchemaInfo> {
  const result: Record<string, SchemaInfo> = {}
  for (const key of Object.keys(fields)) {
    result[key] = introspect(fields[key], seen)
  }
  return result
}

/**
 * Extract field metadata from an object schema produced by any supported
 * validation library.
 *
 * Takes a schema that defines an object shape (e.g. `z.object(...)`,
 * `yup.object(...)`, `v.object(...)`) and returns a record mapping
 * each field name to its {@link SchemaInfo}. Automatically unwraps
 * transforms, pipes, refinements, and other wrappers to find the
 * underlying object.
 *
 * Currently supports:
 *
 * - **Zod 4+** — `z.object({...})` (including `.transform()`, `.pipe()`, `.refine()`)
 * - **Yup 1.x** — `yup.object({...})`
 * - **Valibot 1.x** — `v.object({...})`
 * - **ArkType 2.x** — `type({...})`
 * - **Effect Schema 3.x** — `Schema.Struct({...})`
 * - **Joi 18.x** — `Joi.object({...})`
 *
 * @param schema - An object schema from any supported library
 * @returns A record mapping field names to their metadata
 * @throws {SchemaFieldsError} When the schema is unrecognized or not an object type
 *
 * @example
 * ```ts
 * import { schemaFields } from 'schema-info'
 * import * as z from 'zod'
 *
 * const fields = schemaFields(z.object({
 *   name: z.string(),
 *   age: z.number().optional(),
 * }))
 * // {
 * //   name: { type: 'string', optional: false, nullable: false },
 * //   age: { type: 'number', optional: true, nullable: false },
 * // }
 * ```
 */
function schemaFields(schema: unknown): Record<string, SchemaInfo> {
  const seen = new Set<unknown>()
  if (schema && typeof schema === 'object') seen.add(schema)

  if (isZodSchema(schema)) {
    const fields = extractZodFields(schema)
    if (!fields) throw new SchemaFieldsError(schema, 'not-object', 'Zod')
    return mapRecord(fields, seen)
  }

  if (isYupSchema(schema)) {
    const fields = extractYupFields(schema)
    if (!fields) throw new SchemaFieldsError(schema, 'not-object', 'Yup')
    return mapRecord(fields, seen)
  }

  if (isValibotSchema(schema)) {
    const fields = extractValibotFields(schema)
    if (!fields) throw new SchemaFieldsError(schema, 'not-object', 'Valibot')
    return mapRecord(fields, seen)
  }

  if (isArkTypeSchema(schema)) {
    const fieldInfos = extractArkTypeFields(schema)
    if (!fieldInfos)
      throw new SchemaFieldsError(schema, 'not-object', 'ArkType')
    const result: Record<string, SchemaInfo> = {}
    for (const field of fieldInfos) {
      const info = extractFromNode(field.value, seen)
      result[field.key] = { ...info, optional: field.optional || info.optional }
    }
    return result
  }

  if (isEffectSchema(schema)) {
    const fieldInfos = extractEffectFields(schema)
    if (!fieldInfos)
      throw new SchemaFieldsError(schema, 'not-object', 'Effect Schema')
    const result: Record<string, SchemaInfo> = {}
    for (const field of fieldInfos) {
      const info = extractFromAST(field.ast, field.optional, false, seen)
      result[field.key] = info
    }
    return result
  }

  if (isJoiSchema(schema)) {
    const fields = extractJoiFields(schema)
    if (!fields) throw new SchemaFieldsError(schema, 'not-object', 'Joi')
    return mapRecord(fields, seen)
  }

  throw new SchemaFieldsError(schema, 'unrecognized')
}

export { schemaFields }
