import { type } from 'arktype'
import { Schema as S } from 'effect'
import Joi from 'joi'
import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import * as yup from 'yup'
import * as z from 'zod'
import { schemaFields } from './schema-fields'
import { SchemaFieldsError } from './schema-fields-error'

describe('schemaFields', () => {
  it('throws unrecognized for undefined', () => {
    expect(() => schemaFields(undefined)).toThrow(SchemaFieldsError)
    expect(() => schemaFields(undefined)).toThrow('Unrecognized schema')
  })

  it('throws unrecognized for non-schema values', () => {
    expect(() => schemaFields('hello')).toThrow(SchemaFieldsError)
    expect(() => schemaFields(42)).toThrow(SchemaFieldsError)
    expect(() => schemaFields({})).toThrow(SchemaFieldsError)
  })

  it('includes reason and schema on the error', () => {
    try {
      schemaFields('hello')
    } catch (error) {
      expect(error).toBeInstanceOf(SchemaFieldsError)
      const e = error as SchemaFieldsError
      expect(e.reason).toBe('unrecognized')
      expect(e.schema).toBe('hello')
      expect(e.library).toBeUndefined()
    }
  })
})

describe('schemaFields with Zod', () => {
  it('extracts fields from a basic object', () => {
    const fields = schemaFields(z.object({ name: z.string(), age: z.number() }))
    expect(fields).toEqual({
      name: {
        type: 'string',
        optional: false,
        nullable: false,
        getDefaultValue: undefined,
        enumValues: undefined,
      },
      age: {
        type: 'number',
        optional: false,
        nullable: false,
        getDefaultValue: undefined,
        enumValues: undefined,
      },
    })
  })

  it('extracts optional and nullable fields', () => {
    const fields = schemaFields(
      z.object({ name: z.string().optional(), bio: z.string().nullable() })
    )
    expect(fields?.name.optional).toBe(true)
    expect(fields?.bio.nullable).toBe(true)
  })

  it('extracts default values', () => {
    const fields = schemaFields(z.object({ role: z.string().default('user') }))
    expect(fields?.role.getDefaultValue?.()).toBe('user')
  })

  it('extracts enum fields', () => {
    const fields = schemaFields(
      z.object({ status: z.enum(['active', 'inactive']) })
    )
    expect(fields?.status.type).toBe('enum')
    expect(fields?.status.enumValues).toEqual(['active', 'inactive'])
  })

  it('throws not-object for non-object Zod schemas', () => {
    expect(() => schemaFields(z.string())).toThrow(SchemaFieldsError)
    expect(() => schemaFields(z.array(z.string()))).toThrow(SchemaFieldsError)
    try {
      schemaFields(z.string())
    } catch (error) {
      const e = error as SchemaFieldsError
      expect(e.reason).toBe('not-object')
      expect(e.library).toBe('Zod')
    }
  })

  it('unwraps transform wrappers', () => {
    const inner = z.object({ name: z.string() })
    const schema = inner.transform((v) => ({ ...v, extra: true }))
    const fields = schemaFields(schema)
    expect(fields).not.toBeNull()
    expect(fields?.name.type).toBe('string')
  })

  it('unwraps pipe wrappers', () => {
    const inner = z.object({ count: z.number() })
    const schema = inner.pipe(z.object({ count: z.number() }))
    const fields = schemaFields(schema)
    expect(fields?.count.type).toBe('number')
  })

  it('unwraps chained transforms', () => {
    const inner = z.object({ value: z.string() })
    const schema = inner.transform((v) => v).transform((v) => v)
    const fields = schemaFields(schema)
    expect(fields?.value.type).toBe('string')
  })

  it('unwraps preprocess wrappers', () => {
    const inner = z.object({ name: z.string() })
    const schema = z.preprocess((v) => v, inner)
    const fields = schemaFields(schema)
    expect(fields?.name.type).toBe('string')
  })

  it('unwraps readonly wrappers', () => {
    const schema = z.object({ name: z.string() }).readonly()
    const fields = schemaFields(schema)
    expect(fields?.name.type).toBe('string')
  })
})

describe('schemaFields with Yup', () => {
  it('extracts fields from a basic object', () => {
    const fields = schemaFields(
      yup.object({
        name: yup.string().required(),
        age: yup.number().required(),
      })
    )
    expect(fields?.name.type).toBe('string')
    expect(fields?.name.optional).toBe(false)
    expect(fields?.age.type).toBe('number')
  })

  it('extracts optional and nullable fields', () => {
    const fields = schemaFields(
      yup.object({
        bio: yup.string(),
        note: yup.string().required().nullable(),
      })
    )
    expect(fields?.bio.optional).toBe(true)
    expect(fields?.note.nullable).toBe(true)
  })

  it('extracts default values', () => {
    const fields = schemaFields(
      yup.object({ role: yup.string().required().default('user') })
    )
    expect(fields?.role.getDefaultValue?.()).toBe('user')
  })

  it('extracts enum fields', () => {
    const fields = schemaFields(
      yup.object({
        status: yup.string().oneOf(['active', 'inactive']).required(),
      })
    )
    expect(fields?.status.type).toBe('enum')
    expect(fields?.status.enumValues).toEqual(['active', 'inactive'])
  })

  it('throws not-object for non-object Yup schemas', () => {
    expect(() => schemaFields(yup.string())).toThrow(SchemaFieldsError)
    try {
      schemaFields(yup.string())
    } catch (error) {
      const e = error as SchemaFieldsError
      expect(e.reason).toBe('not-object')
      expect(e.library).toBe('Yup')
    }
  })

  it('works with transformed objects', () => {
    const schema = yup
      .object({ name: yup.string().required() })
      .transform((v) => v)
    const fields = schemaFields(schema)
    expect(fields?.name.type).toBe('string')
  })
})

describe('schemaFields with Valibot', () => {
  it('extracts fields from a basic object', () => {
    const fields = schemaFields(v.object({ name: v.string(), age: v.number() }))
    expect(fields?.name.type).toBe('string')
    expect(fields?.age.type).toBe('number')
  })

  it('extracts optional and nullable fields', () => {
    const fields = schemaFields(
      v.object({ bio: v.optional(v.string()), note: v.nullable(v.string()) })
    )
    expect(fields?.bio.optional).toBe(true)
    expect(fields?.note.nullable).toBe(true)
  })

  it('extracts default values', () => {
    const fields = schemaFields(
      v.object({ role: v.optional(v.string(), 'user') })
    )
    expect(fields?.role.getDefaultValue?.()).toBe('user')
  })

  it('extracts enum fields', () => {
    const fields = schemaFields(
      v.object({ status: v.picklist(['active', 'inactive']) })
    )
    expect(fields?.status.type).toBe('enum')
    expect(fields?.status.enumValues).toEqual(['active', 'inactive'])
  })

  it('throws not-object for non-object Valibot schemas', () => {
    expect(() => schemaFields(v.string())).toThrow(SchemaFieldsError)
    try {
      schemaFields(v.string())
    } catch (error) {
      const e = error as SchemaFieldsError
      expect(e.reason).toBe('not-object')
      expect(e.library).toBe('Valibot')
    }
  })

  it('works with piped objects', () => {
    const schema = v.pipe(
      v.object({ name: v.string() }),
      v.check(() => true)
    )
    const fields = schemaFields(schema)
    expect(fields?.name.type).toBe('string')
  })
})

describe('schemaFields with ArkType', () => {
  it('extracts fields from a basic object', () => {
    const fields = schemaFields(type({ name: 'string', age: 'number' }))
    expect(fields?.name.type).toBe('string')
    expect(fields?.age.type).toBe('number')
  })

  it('extracts optional fields', () => {
    const fields = schemaFields(type({ name: 'string', 'age?': 'number' }))
    expect(fields?.name.optional).toBe(false)
    expect(fields?.age.optional).toBe(true)
    expect(fields?.age.type).toBe('number')
  })

  it('extracts boolean and date fields', () => {
    const fields = schemaFields(type({ active: 'boolean', created: 'Date' }))
    expect(fields?.active.type).toBe('boolean')
    expect(fields?.created.type).toBe('date')
  })

  it('throws not-object for non-object ArkType schemas', () => {
    expect(() => schemaFields(type('string'))).toThrow(SchemaFieldsError)
    try {
      schemaFields(type('string'))
    } catch (error) {
      const e = error as SchemaFieldsError
      expect(e.reason).toBe('not-object')
      expect(e.library).toBe('ArkType')
    }
  })

  it('unwraps morph (pipe) wrappers', () => {
    const schema = type({ name: 'string' }).pipe((v) => v)
    const fields = schemaFields(schema)
    expect(fields?.name.type).toBe('string')
  })
})

describe('schemaFields with Effect Schema', () => {
  it('extracts fields from a basic struct', () => {
    const fields = schemaFields(S.Struct({ name: S.String, age: S.Number }))
    expect(fields?.name.type).toBe('string')
    expect(fields?.age.type).toBe('number')
  })

  it('extracts optional fields', () => {
    const fields = schemaFields(
      S.Struct({ name: S.String, age: S.optional(S.Number) })
    )
    expect(fields?.name.optional).toBe(false)
    expect(fields?.age.optional).toBe(true)
    expect(fields?.age.type).toBe('number')
  })

  it('extracts boolean and date fields', () => {
    const fields = schemaFields(
      S.Struct({ active: S.Boolean, created: S.DateFromSelf })
    )
    expect(fields?.active.type).toBe('boolean')
    expect(fields?.created.type).toBe('date')
  })

  it('extracts enum fields', () => {
    const fields = schemaFields(
      S.Struct({ status: S.Literal('active', 'inactive') })
    )
    expect(fields?.status.type).toBe('enum')
    expect(fields?.status.enumValues).toEqual(['active', 'inactive'])
  })

  it('throws not-object for non-struct Effect schemas', () => {
    expect(() => schemaFields(S.String)).toThrow(SchemaFieldsError)
    try {
      schemaFields(S.String)
    } catch (error) {
      const e = error as SchemaFieldsError
      expect(e.reason).toBe('not-object')
      expect(e.library).toBe('Effect Schema')
    }
  })

  it('unwraps filter (refinement) wrappers', () => {
    const schema = S.Struct({ name: S.String }).pipe(S.filter(() => true))
    const fields = schemaFields(schema)
    expect(fields?.name.type).toBe('string')
  })
})

describe('schemaFields with Joi', () => {
  it('extracts fields from a basic object', () => {
    const fields = schemaFields(
      Joi.object({
        name: Joi.string().required(),
        age: Joi.number().required(),
      })
    )
    expect(fields?.name.type).toBe('string')
    expect(fields?.name.optional).toBe(false)
    expect(fields?.age.type).toBe('number')
  })

  it('extracts optional and nullable fields', () => {
    const fields = schemaFields(
      Joi.object({
        bio: Joi.string(),
        note: Joi.string().required().allow(null),
      })
    )
    expect(fields?.bio.optional).toBe(true)
    expect(fields?.note.nullable).toBe(true)
  })

  it('extracts default values', () => {
    const fields = schemaFields(
      Joi.object({ role: Joi.string().default('user') })
    )
    expect(fields?.role.getDefaultValue?.()).toBe('user')
  })

  it('extracts enum fields', () => {
    const fields = schemaFields(
      Joi.object({
        status: Joi.string().valid('active', 'inactive').required(),
      })
    )
    expect(fields?.status.type).toBe('enum')
    expect(fields?.status.enumValues).toEqual(['active', 'inactive'])
  })

  it('throws not-object for non-object Joi schemas', () => {
    expect(() => schemaFields(Joi.string())).toThrow(SchemaFieldsError)
    try {
      schemaFields(Joi.string())
    } catch (error) {
      const e = error as SchemaFieldsError
      expect(e.reason).toBe('not-object')
      expect(e.library).toBe('Joi')
    }
  })
})
