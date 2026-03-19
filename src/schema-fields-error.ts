/**
 * The reason why {@link SchemaFieldsError} was thrown.
 *
 * - `'unrecognized'` — the value does not match any supported schema library
 * - `'not-object'` — the schema was recognized but is not an object type
 */
type SchemaFieldsErrorReason = 'unrecognized' | 'not-object'

/**
 * Thrown by {@link schemaFields} when it cannot extract fields from
 * the given schema.
 *
 * @example
 * ```ts
 * import { schemaFields, SchemaFieldsError } from 'schema-info'
 *
 * try {
 *   schemaFields(z.string())
 * } catch (error) {
 *   if (error instanceof SchemaFieldsError) {
 *     error.reason  // 'not-object'
 *     error.library // 'Zod'
 *   }
 * }
 * ```
 */
class SchemaFieldsError extends Error {
  constructor(
    public readonly schema: unknown,
    public readonly reason: SchemaFieldsErrorReason,
    public readonly library?: string
  ) {
    const message =
      reason === 'unrecognized'
        ? 'Unrecognized schema: schemaFields requires a schema from a supported library (Zod, Yup, Valibot, ArkType, Effect Schema, or Joi)'
        : `Expected an object schema from ${library}, but received a non-object schema (e.g. string, number, array). Use schemaInfo() for individual field schemas.`
    super(message)
    this.name = 'SchemaFieldsError'
  }
}

export { SchemaFieldsError }
export type { SchemaFieldsErrorReason }
