import { fromArkType, isArkTypeSchema } from './adapters/arktype'
import { fromEffect, isEffectSchema } from './adapters/effect'
import {
  extractJoiArrayItem,
  extractJoiFields,
  fromJoi,
  isJoiSchema,
} from './adapters/joi'
import {
  extractValibotArrayItem,
  extractValibotFields,
  fromValibot,
  isValibotSchema,
} from './adapters/valibot'
import {
  extractYupArrayItem,
  extractYupFields,
  fromYup,
  isYupSchema,
} from './adapters/yup'
import {
  extractZodArrayItem,
  extractZodFields,
  fromZod,
  isZodSchema,
} from './adapters/zod'
import type { SchemaInfo } from './types'

const empty: SchemaInfo = { type: null, optional: false, nullable: false }

function enrichWithRecursion(
  info: SchemaInfo,
  schema: unknown,
  extractArrayItem: (s: unknown) => unknown | null,
  extractFields: (s: unknown) => Record<string, unknown> | null
): SchemaInfo {
  if (info.type === 'array') {
    const rawItem = extractArrayItem(schema)
    if (rawItem) {
      info.item = schemaInfo(rawItem)
    }
  }
  if (info.type === 'object') {
    const rawFields = extractFields(schema)
    if (rawFields) {
      info.fields = {}
      for (const key of Object.keys(rawFields)) {
        info.fields[key] = schemaInfo(rawFields[key])
      }
    }
  }
  return info
}

/**
 * Extract field metadata from a schema produced by any supported
 * validation library.
 *
 * The library is detected automatically by inspecting the schema
 * object's internal structure. Currently supports:
 *
 * - **Zod 4+**
 * - **Yup 1.x**
 * - **Valibot 1.x**
 * - **ArkType 2.x**
 * - **Effect Schema 3.x**
 * - **Joi 18.x**
 *
 * @param schema - A schema field from any supported library, or `undefined`
 * @returns Metadata describing the field's type, optionality, nullability,
 *   default value and enum values
 *
 * @example
 * ```ts
 * import { schemaInfo } from 'schema-info'
 * import * as z from 'zod'
 *
 * const info = schemaInfo(z.string().optional())
 * // { type: 'string', optional: true, nullable: false }
 * ```
 */
function schemaInfo(schema?: unknown): SchemaInfo {
  if (!schema) return empty
  if (isZodSchema(schema))
    return enrichWithRecursion(
      fromZod(schema),
      schema,
      extractZodArrayItem,
      extractZodFields
    )
  if (isYupSchema(schema))
    return enrichWithRecursion(
      fromYup(schema),
      schema,
      extractYupArrayItem,
      extractYupFields
    )
  if (isValibotSchema(schema))
    return enrichWithRecursion(
      fromValibot(schema),
      schema,
      extractValibotArrayItem,
      extractValibotFields
    )
  if (isArkTypeSchema(schema)) return fromArkType(schema)
  if (isEffectSchema(schema)) return fromEffect(schema)
  if (isJoiSchema(schema))
    return enrichWithRecursion(
      fromJoi(schema),
      schema,
      extractJoiArrayItem,
      extractJoiFields
    )
  return empty
}

export { schemaInfo }
