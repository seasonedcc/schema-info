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
import { extractJoiFields, fromJoi, isJoiSchema } from './adapters/joi'
import {
  extractValibotFields,
  fromValibot,
  isValibotSchema,
} from './adapters/valibot'
import { extractYupFields, fromYup, isYupSchema } from './adapters/yup'
import { extractZodFields, fromZod, isZodSchema } from './adapters/zod'
import type { SchemaInfo } from './types'

function mapRecord(
  fields: Record<string, unknown>,
  mapper: (field: unknown) => SchemaInfo
): Record<string, SchemaInfo> {
  const result: Record<string, SchemaInfo> = {}
  for (const key of Object.keys(fields)) {
    result[key] = mapper(fields[key])
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
 * @param schema - An object schema from any supported library, or any other value
 * @returns A record mapping field names to their metadata, or `null`
 *   if the schema is not a recognized object type
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
function schemaFields(schema: unknown): Record<string, SchemaInfo> | null {
  if (!schema) return null

  if (isZodSchema(schema)) {
    const fields = extractZodFields(schema)
    if (!fields) return null
    return mapRecord(fields, fromZod)
  }

  if (isYupSchema(schema)) {
    const fields = extractYupFields(schema)
    if (!fields) return null
    return mapRecord(fields, fromYup)
  }

  if (isValibotSchema(schema)) {
    const fields = extractValibotFields(schema)
    if (!fields) return null
    return mapRecord(fields, fromValibot)
  }

  if (isArkTypeSchema(schema)) {
    const fieldInfos = extractArkTypeFields(schema)
    if (!fieldInfos) return null
    const result: Record<string, SchemaInfo> = {}
    for (const field of fieldInfos) {
      const info = extractFromNode(field.value)
      result[field.key] = { ...info, optional: field.optional || info.optional }
    }
    return result
  }

  if (isEffectSchema(schema)) {
    const fieldInfos = extractEffectFields(schema)
    if (!fieldInfos) return null
    const result: Record<string, SchemaInfo> = {}
    for (const field of fieldInfos) {
      const info = extractFromAST(field.ast, field.optional)
      result[field.key] = info
    }
    return result
  }

  if (isJoiSchema(schema)) {
    const fields = extractJoiFields(schema)
    if (!fields) return null
    return mapRecord(fields, fromJoi)
  }

  return null
}

export { schemaFields }
