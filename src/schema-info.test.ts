import { describe, expect, it } from 'vitest'
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
