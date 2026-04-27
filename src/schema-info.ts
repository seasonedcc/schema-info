import { fromArkType, isArkTypeSchema } from './adapters/arktype'
import { fromEffect, isEffectSchema } from './adapters/effect'
import { fromJoi, isJoiSchema } from './adapters/joi'
import { fromValibot, isValibotSchema } from './adapters/valibot'
import { fromYup, isYupSchema } from './adapters/yup'
import { fromZod, isZodSchema } from './adapters/zod'
import type { SchemaInfo } from './types'

const empty: SchemaInfo = { type: null, optional: false, nullable: false }

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
  return introspect(schema, new Set())
}

function introspect(schema: unknown, seen: Set<unknown>): SchemaInfo {
  if (schema === undefined || schema === null) return empty
  const recurse = (s: unknown) => introspect(s, seen)
  if (isZodSchema(schema)) {
    return fromZod(
      schema,
      recurse,
      false,
      false,
      undefined,
      undefined,
      undefined,
      seen
    )
  }
  if (isYupSchema(schema)) return fromYup(schema, recurse, seen)
  if (isValibotSchema(schema)) {
    return fromValibot(
      schema,
      recurse,
      false,
      false,
      undefined,
      undefined,
      seen
    )
  }
  if (isArkTypeSchema(schema)) return fromArkType(schema, seen)
  if (isEffectSchema(schema)) return fromEffect(schema, seen)
  if (isJoiSchema(schema)) return fromJoi(schema, recurse)
  return empty
}

export { schemaInfo, introspect }
