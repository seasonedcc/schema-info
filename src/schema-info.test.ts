import { type } from 'arktype'
import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import * as yup from 'yup'
import * as z from 'zod'
import { schemaInfo } from './schema-info'

describe('schemaInfo', () => {
  it('returns null type when schema is undefined', () => {
    expect(schemaInfo()).toEqual({
      type: null,
      optional: false,
      nullable: false,
    })
  })

  it('extracts info from primitive schemas', () => {
    expect(schemaInfo(z.string())).toEqual({
      type: 'string',
      optional: false,
      nullable: false,
      getDefaultValue: undefined,
      enumValues: undefined,
    })
  })

  it('marks optional and nullable schemas correctly', () => {
    const info = schemaInfo(z.number().optional().nullable())
    expect(info).toEqual({
      type: 'number',
      optional: true,
      nullable: true,
      getDefaultValue: undefined,
      enumValues: undefined,
    })
  })

  it('collects default value getter', () => {
    const info = schemaInfo(z.string().default('foo'))
    expect(info.type).toBe('string')
    expect(typeof info.getDefaultValue).toBe('function')
    expect(info.getDefaultValue?.()).toBe('foo')
  })

  it('unwraps nested schemas and effects', () => {
    const schema = z
      .string()
      .default('bar')
      .optional()
      .nullable()
      .transform((v) => v)
    const info = schemaInfo(schema)
    expect(info.type).toBe('string')
    expect(info.optional).toBe(true)
    expect(info.nullable).toBe(true)
    expect(info.getDefaultValue?.()).toBe('bar')
  })

  it('returns enum values', () => {
    const info = schemaInfo(z.enum(['a', 'b']))
    expect(info).toEqual({
      type: 'enum',
      optional: false,
      nullable: false,
      getDefaultValue: undefined,
      enumValues: ['a', 'b'],
    })
  })

  it('handles enums with optional, nullable and default modifiers', () => {
    const schema = z.enum(['x', 'y']).optional().nullable().default('x')
    const info = schemaInfo(schema)
    expect(info.type).toBe('enum')
    expect(info.optional).toBe(true)
    expect(info.nullable).toBe(true)
    expect(info.enumValues).toEqual(['x', 'y'])
    expect(info.getDefaultValue?.()).toBe('x')
  })

  it('extracts info from boolean type', () => {
    expect(schemaInfo(z.boolean())).toEqual({
      type: 'boolean',
      optional: false,
      nullable: false,
      getDefaultValue: undefined,
      enumValues: undefined,
    })
  })

  it('extracts info from date type', () => {
    expect(schemaInfo(z.date())).toEqual({
      type: 'date',
      optional: false,
      nullable: false,
      getDefaultValue: undefined,
      enumValues: undefined,
    })
  })

  it('handles boolean with modifiers', () => {
    const info = schemaInfo(z.boolean().optional().default(true))
    expect(info.type).toBe('boolean')
    expect(info.optional).toBe(true)
    expect(info.getDefaultValue?.()).toBe(true)
  })

  it('handles date with modifiers', () => {
    const testDate = new Date('2025-01-01')
    const info = schemaInfo(z.date().nullable().default(testDate))
    expect(info.type).toBe('date')
    expect(info.nullable).toBe(true)
    expect(info.getDefaultValue?.()).toBe(testDate)
  })

  it('extracts input schema from pipe', () => {
    const schema = z.string().pipe(z.string().transform((v) => v.toUpperCase()))
    const info = schemaInfo(schema)
    expect(info.type).toBe('string')
    expect(info.optional).toBe(false)
    expect(info.nullable).toBe(false)
  })

  it('handles pipe with modifiers', () => {
    const schema = z
      .number()
      .pipe(z.number().transform((v) => v * 2))
      .optional()
      .nullable()
    const info = schemaInfo(schema)
    expect(info.type).toBe('number')
    expect(info.optional).toBe(true)
    expect(info.nullable).toBe(true)
  })

  it('handles pipe with default value', () => {
    const schema = z.string().pipe(z.string()).default('default')
    const info = schemaInfo(schema)
    expect(info.type).toBe('string')
    expect(info.getDefaultValue?.()).toBe('default')
  })

  it('extracts input type from transform (which creates a pipe)', () => {
    const schema = z.string().transform((v) => v.toUpperCase())
    const info = schemaInfo(schema)
    expect(info.type).toBe('string')
    expect(info.optional).toBe(false)
    expect(info.nullable).toBe(false)
  })

  it('returns null for unsupported type', () => {
    const schema = z.object({ field: z.string() })
    const info = schemaInfo(schema)
    expect(info).toEqual({
      type: null,
      optional: false,
      nullable: false,
      getDefaultValue: undefined,
      enumValues: undefined,
    })
  })

  it('handles nullable followed by optional', () => {
    const info = schemaInfo(z.string().nullable().optional())
    expect(info.type).toBe('string')
    expect(info.optional).toBe(true)
    expect(info.nullable).toBe(true)
  })

  it('handles optional followed by nullable', () => {
    const info = schemaInfo(z.string().optional().nullable())
    expect(info.type).toBe('string')
    expect(info.optional).toBe(true)
    expect(info.nullable).toBe(true)
  })

  it('preserves enum value order', () => {
    const info = schemaInfo(z.enum(['first', 'second', 'third']))
    expect(info.enumValues).toEqual(['first', 'second', 'third'])
  })

  it('handles enum with single value', () => {
    const info = schemaInfo(z.enum(['only']))
    expect(info.type).toBe('enum')
    expect(info.enumValues).toEqual(['only'])
  })

  it('handles deeply nested modifiers', () => {
    const schema = z
      .number()
      .default(42)
      .optional()
      .nullable()
      .transform((v) => v)
    const info = schemaInfo(schema)
    expect(info.type).toBe('number')
    expect(info.optional).toBe(true)
    expect(info.nullable).toBe(true)
    expect(info.getDefaultValue?.()).toBe(42)
  })

  it('handles complex pipe with multiple modifiers', () => {
    const schema = z
      .boolean()
      .pipe(z.boolean())
      .default(false)
      .optional()
      .nullable()
    const info = schemaInfo(schema)
    expect(info.type).toBe('boolean')
    expect(info.optional).toBe(true)
    expect(info.nullable).toBe(true)
    expect(info.getDefaultValue?.()).toBe(false)
  })

  it('handles date with all modifier types', () => {
    const testDate = new Date('2025-10-09')
    const schema = z.date().optional().nullable().default(testDate)
    const info = schemaInfo(schema)
    expect(info.type).toBe('date')
    expect(info.optional).toBe(true)
    expect(info.nullable).toBe(true)
    expect(info.getDefaultValue?.()).toBe(testDate)
  })

  it('returns null type for non-schema values', () => {
    expect(schemaInfo('not a schema')).toEqual({
      type: null,
      optional: false,
      nullable: false,
    })
    expect(schemaInfo(42)).toEqual({
      type: null,
      optional: false,
      nullable: false,
    })
    expect(schemaInfo({})).toEqual({
      type: null,
      optional: false,
      nullable: false,
    })
  })
})

describe('schemaInfo with Yup', () => {
  it('extracts info from primitive schemas', () => {
    expect(schemaInfo(yup.string().required())).toEqual({
      type: 'string',
      optional: false,
      nullable: false,
    })
  })

  it('treats Yup schemas as optional by default', () => {
    const info = schemaInfo(yup.string())
    expect(info.type).toBe('string')
    expect(info.optional).toBe(true)
  })

  it('marks required schemas as not optional', () => {
    const info = schemaInfo(yup.number().required())
    expect(info.type).toBe('number')
    expect(info.optional).toBe(false)
  })

  it('marks nullable schemas correctly', () => {
    const info = schemaInfo(yup.string().required().nullable())
    expect(info.type).toBe('string')
    expect(info.optional).toBe(false)
    expect(info.nullable).toBe(true)
  })

  it('handles optional and nullable together', () => {
    const info = schemaInfo(yup.number().nullable())
    expect(info.type).toBe('number')
    expect(info.optional).toBe(true)
    expect(info.nullable).toBe(true)
  })

  it('collects default value getter', () => {
    const info = schemaInfo(yup.string().required().default('foo'))
    expect(info.type).toBe('string')
    expect(typeof info.getDefaultValue).toBe('function')
    expect(info.getDefaultValue?.()).toBe('foo')
  })

  it('handles default with modifiers', () => {
    const info = schemaInfo(yup.string().nullable().default('bar'))
    expect(info.type).toBe('string')
    expect(info.optional).toBe(true)
    expect(info.nullable).toBe(true)
    expect(info.getDefaultValue?.()).toBe('bar')
  })

  it('returns enum values from oneOf', () => {
    const info = schemaInfo(yup.string().oneOf(['a', 'b']).required())
    expect(info).toEqual({
      type: 'enum',
      optional: false,
      nullable: false,
      enumValues: ['a', 'b'],
    })
  })

  it('handles enums with optional, nullable and default modifiers', () => {
    const info = schemaInfo(
      yup.string().oneOf(['x', 'y']).nullable().default('x')
    )
    expect(info.type).toBe('enum')
    expect(info.optional).toBe(true)
    expect(info.nullable).toBe(true)
    expect(info.enumValues).toEqual(['x', 'y'])
    expect(info.getDefaultValue?.()).toBe('x')
  })

  it('extracts info from boolean type', () => {
    expect(schemaInfo(yup.boolean().required())).toEqual({
      type: 'boolean',
      optional: false,
      nullable: false,
    })
  })

  it('extracts info from date type', () => {
    expect(schemaInfo(yup.date().required())).toEqual({
      type: 'date',
      optional: false,
      nullable: false,
    })
  })

  it('handles boolean with modifiers', () => {
    const info = schemaInfo(yup.boolean().default(true))
    expect(info.type).toBe('boolean')
    expect(info.optional).toBe(true)
    expect(info.getDefaultValue?.()).toBe(true)
  })

  it('handles date with modifiers', () => {
    const testDate = new Date('2025-01-01')
    const info = schemaInfo(yup.date().required().nullable().default(testDate))
    expect(info.type).toBe('date')
    expect(info.nullable).toBe(true)
    expect(info.getDefaultValue?.()).toEqual(testDate)
  })

  it('returns null for unsupported types', () => {
    expect(schemaInfo(yup.object())).toEqual({
      type: null,
      optional: true,
      nullable: false,
    })
    expect(schemaInfo(yup.array())).toEqual({
      type: null,
      optional: true,
      nullable: false,
    })
    expect(schemaInfo(yup.mixed())).toEqual({
      type: null,
      optional: true,
      nullable: false,
    })
  })

  it('preserves enum value order', () => {
    const info = schemaInfo(yup.string().oneOf(['first', 'second', 'third']))
    expect(info.enumValues).toEqual(['first', 'second', 'third'])
  })

  it('handles enum with single value', () => {
    const info = schemaInfo(yup.string().oneOf(['only']))
    expect(info.type).toBe('enum')
    expect(info.enumValues).toEqual(['only'])
  })

  it('is transparent to transforms', () => {
    const info = schemaInfo(
      yup
        .string()
        .required()
        .transform((v) => v?.toUpperCase())
    )
    expect(info.type).toBe('string')
    expect(info.optional).toBe(false)
  })

  it('handles date with all modifier types', () => {
    const testDate = new Date('2025-10-09')
    const info = schemaInfo(yup.date().nullable().default(testDate))
    expect(info.type).toBe('date')
    expect(info.optional).toBe(true)
    expect(info.nullable).toBe(true)
    expect(info.getDefaultValue?.()).toEqual(testDate)
  })
})

describe('schemaInfo with Valibot', () => {
  it('extracts info from primitive schemas', () => {
    expect(schemaInfo(v.string())).toEqual({
      type: 'string',
      optional: false,
      nullable: false,
      getDefaultValue: undefined,
      enumValues: undefined,
    })
  })

  it('marks optional schemas correctly', () => {
    const info = schemaInfo(v.optional(v.number()))
    expect(info.type).toBe('number')
    expect(info.optional).toBe(true)
    expect(info.nullable).toBe(false)
  })

  it('marks nullable schemas correctly', () => {
    const info = schemaInfo(v.nullable(v.string()))
    expect(info.type).toBe('string')
    expect(info.optional).toBe(false)
    expect(info.nullable).toBe(true)
  })

  it('handles nullish (optional + nullable)', () => {
    const info = schemaInfo(v.nullish(v.number()))
    expect(info.type).toBe('number')
    expect(info.optional).toBe(true)
    expect(info.nullable).toBe(true)
  })

  it('handles optional and nullable together', () => {
    const info = schemaInfo(v.optional(v.nullable(v.string())))
    expect(info.type).toBe('string')
    expect(info.optional).toBe(true)
    expect(info.nullable).toBe(true)
  })

  it('collects default value getter from optional', () => {
    const info = schemaInfo(v.optional(v.string(), 'foo'))
    expect(info.type).toBe('string')
    expect(info.optional).toBe(true)
    expect(typeof info.getDefaultValue).toBe('function')
    expect(info.getDefaultValue?.()).toBe('foo')
  })

  it('collects default value getter from nullish', () => {
    const info = schemaInfo(v.nullish(v.number(), 42))
    expect(info.type).toBe('number')
    expect(info.optional).toBe(true)
    expect(info.nullable).toBe(true)
    expect(info.getDefaultValue?.()).toBe(42)
  })

  it('handles function defaults', () => {
    const info = schemaInfo(v.optional(v.string(), () => 'dynamic'))
    expect(info.getDefaultValue?.()).toBe('dynamic')
  })

  it('returns enum values from picklist', () => {
    const info = schemaInfo(v.picklist(['a', 'b']))
    expect(info).toEqual({
      type: 'enum',
      optional: false,
      nullable: false,
      getDefaultValue: undefined,
      enumValues: ['a', 'b'],
    })
  })

  it('handles picklist with optional, nullable and default modifiers', () => {
    const info = schemaInfo(v.optional(v.nullable(v.picklist(['x', 'y'])), 'x'))
    expect(info.type).toBe('enum')
    expect(info.optional).toBe(true)
    expect(info.nullable).toBe(true)
    expect(info.enumValues).toEqual(['x', 'y'])
    expect(info.getDefaultValue?.()).toBe('x')
  })

  it('extracts info from boolean type', () => {
    expect(schemaInfo(v.boolean())).toEqual({
      type: 'boolean',
      optional: false,
      nullable: false,
      getDefaultValue: undefined,
      enumValues: undefined,
    })
  })

  it('extracts info from date type', () => {
    expect(schemaInfo(v.date())).toEqual({
      type: 'date',
      optional: false,
      nullable: false,
      getDefaultValue: undefined,
      enumValues: undefined,
    })
  })

  it('handles boolean with modifiers', () => {
    const info = schemaInfo(v.optional(v.boolean(), true))
    expect(info.type).toBe('boolean')
    expect(info.optional).toBe(true)
    expect(info.getDefaultValue?.()).toBe(true)
  })

  it('handles date with modifiers', () => {
    const testDate = new Date('2025-01-01')
    const info = schemaInfo(v.nullable(v.date(), testDate))
    expect(info.type).toBe('date')
    expect(info.nullable).toBe(true)
    expect(info.getDefaultValue?.()).toEqual(testDate)
  })

  it('is transparent to pipe with validations', () => {
    const info = schemaInfo(v.pipe(v.string(), v.minLength(3)))
    expect(info.type).toBe('string')
    expect(info.optional).toBe(false)
    expect(info.nullable).toBe(false)
  })

  it('handles pipe with wrappers', () => {
    const info = schemaInfo(
      v.pipe(v.optional(v.string(), 'hi'), v.minLength(1))
    )
    expect(info.type).toBe('string')
    expect(info.optional).toBe(true)
    expect(info.nullable).toBe(false)
    expect(info.getDefaultValue?.()).toBe('hi')
  })

  it('handles wrappers around piped schemas', () => {
    const info = schemaInfo(v.optional(v.pipe(v.string(), v.minLength(3))))
    expect(info.type).toBe('string')
    expect(info.optional).toBe(true)
  })

  it('returns null for unsupported types', () => {
    expect(schemaInfo(v.object({ name: v.string() }))).toEqual({
      type: null,
      optional: false,
      nullable: false,
      getDefaultValue: undefined,
      enumValues: undefined,
    })
    expect(schemaInfo(v.array(v.string()))).toEqual({
      type: null,
      optional: false,
      nullable: false,
      getDefaultValue: undefined,
      enumValues: undefined,
    })
  })

  it('preserves picklist value order', () => {
    const info = schemaInfo(v.picklist(['first', 'second', 'third']))
    expect(info.enumValues).toEqual(['first', 'second', 'third'])
  })

  it('handles picklist with single value', () => {
    const info = schemaInfo(v.picklist(['only']))
    expect(info.type).toBe('enum')
    expect(info.enumValues).toEqual(['only'])
  })

  it('handles date with all modifier types', () => {
    const testDate = new Date('2025-10-09')
    const info = schemaInfo(v.nullish(v.date(), testDate))
    expect(info.type).toBe('date')
    expect(info.optional).toBe(true)
    expect(info.nullable).toBe(true)
    expect(info.getDefaultValue?.()).toEqual(testDate)
  })
})

describe('schemaInfo with ArkType', () => {
  it('extracts info from string type', () => {
    expect(schemaInfo(type('string'))).toEqual({
      type: 'string',
      optional: false,
      nullable: false,
    })
  })

  it('extracts info from number type', () => {
    expect(schemaInfo(type('number'))).toEqual({
      type: 'number',
      optional: false,
      nullable: false,
    })
  })

  it('extracts info from boolean type', () => {
    expect(schemaInfo(type('boolean'))).toEqual({
      type: 'boolean',
      optional: false,
      nullable: false,
    })
  })

  it('extracts info from Date type', () => {
    expect(schemaInfo(type('Date'))).toEqual({
      type: 'date',
      optional: false,
      nullable: false,
    })
  })

  it('marks optional types via union with undefined', () => {
    const info = schemaInfo(type('string | undefined'))
    expect(info.type).toBe('string')
    expect(info.optional).toBe(true)
    expect(info.nullable).toBe(false)
  })

  it('marks nullable types via union with null', () => {
    const info = schemaInfo(type('string | null'))
    expect(info.type).toBe('string')
    expect(info.optional).toBe(false)
    expect(info.nullable).toBe(true)
  })

  it('handles optional and nullable together', () => {
    const info = schemaInfo(type('string | null | undefined'))
    expect(info.type).toBe('string')
    expect(info.optional).toBe(true)
    expect(info.nullable).toBe(true)
  })

  it('handles optional boolean', () => {
    const info = schemaInfo(type('boolean | undefined'))
    expect(info.type).toBe('boolean')
    expect(info.optional).toBe(true)
    expect(info.nullable).toBe(false)
  })

  it('handles nullable boolean', () => {
    const info = schemaInfo(type('boolean | null'))
    expect(info.type).toBe('boolean')
    expect(info.optional).toBe(false)
    expect(info.nullable).toBe(true)
  })

  it('handles optional Date', () => {
    const info = schemaInfo(type('Date | undefined'))
    expect(info.type).toBe('date')
    expect(info.optional).toBe(true)
  })

  it('handles nullable Date', () => {
    const info = schemaInfo(type('Date | null'))
    expect(info.type).toBe('date')
    expect(info.nullable).toBe(true)
  })

  it('returns enum values from literal union', () => {
    const info = schemaInfo(type("'a' | 'b' | 'c'"))
    expect(info.type).toBe('enum')
    expect(info.optional).toBe(false)
    expect(info.nullable).toBe(false)
    expect(info.enumValues).toEqual(['a', 'b', 'c'])
  })

  it('handles enum with nullable', () => {
    const info = schemaInfo(type("'x' | 'y' | null"))
    expect(info.type).toBe('enum')
    expect(info.nullable).toBe(true)
    expect(info.enumValues).toEqual(['x', 'y'])
  })

  it('handles enum with single value', () => {
    const info = schemaInfo(type("'only'"))
    expect(info.type).toBe('enum')
    expect(info.enumValues).toEqual(['only'])
  })

  it('handles constrained string (intersection)', () => {
    const info = schemaInfo(type('string > 3'))
    expect(info.type).toBe('string')
    expect(info.optional).toBe(false)
  })

  it('handles constrained number (intersection)', () => {
    const info = schemaInfo(type('number > 0'))
    expect(info.type).toBe('number')
    expect(info.optional).toBe(false)
  })

  it('returns null for unsupported types', () => {
    expect(schemaInfo(type({ name: 'string' }))).toEqual({
      type: null,
      optional: false,
      nullable: false,
    })
  })

  it('handles number with optional and nullable', () => {
    const info = schemaInfo(type('number | null | undefined'))
    expect(info.type).toBe('number')
    expect(info.optional).toBe(true)
    expect(info.nullable).toBe(true)
  })
})
