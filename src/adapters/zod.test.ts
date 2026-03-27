import { describe, expect, it } from 'vitest'
import * as z from 'zod'
import { schemaInfo } from '../schema-info'

describe('schemaInfo with Zod', () => {
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

  it('extracts info from object type', () => {
    const schema = z.object({ field: z.string() })
    const info = schemaInfo(schema)
    expect(info.type).toBe('object')
    expect(info.optional).toBe(false)
    expect(info.nullable).toBe(false)
    expect(info.fields?.field.type).toBe('string')
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

  it('handles union with null (nullable)', () => {
    const info = schemaInfo(z.number().or(z.null()))
    expect(info.type).toBe('number')
    expect(info.optional).toBe(false)
    expect(info.nullable).toBe(true)
  })

  it('handles union with null and optional', () => {
    const info = schemaInfo(z.number().or(z.null()).optional())
    expect(info.type).toBe('number')
    expect(info.optional).toBe(true)
    expect(info.nullable).toBe(true)
  })

  it('handles union with undefined (optional)', () => {
    const info = schemaInfo(z.string().or(z.undefined()))
    expect(info.type).toBe('string')
    expect(info.optional).toBe(true)
    expect(info.nullable).toBe(false)
  })

  it('handles nested union with null and undefined', () => {
    const info = schemaInfo(z.number().or(z.null()).or(z.undefined()))
    expect(info.type).toBe('number')
    expect(info.optional).toBe(true)
    expect(info.nullable).toBe(true)
  })

  it('handles z.union syntax', () => {
    const info = schemaInfo(z.union([z.string(), z.null()]))
    expect(info.type).toBe('string')
    expect(info.optional).toBe(false)
    expect(info.nullable).toBe(true)
  })

  it('handles union of string literals as enum', () => {
    const info = schemaInfo(
      z.literal('a').or(z.literal('b')).or(z.literal('c'))
    )
    expect(info.type).toBe('enum')
    expect(info.enumValues).toEqual(['a', 'b', 'c'])
  })

  it('handles union of string literals with null as nullable enum', () => {
    const info = schemaInfo(z.literal('x').or(z.literal('y')).or(z.null()))
    expect(info.type).toBe('enum')
    expect(info.nullable).toBe(true)
    expect(info.enumValues).toEqual(['x', 'y'])
  })

  it('handles union of boolean literals as boolean', () => {
    const info = schemaInfo(z.literal(true).or(z.literal(false)))
    expect(info.type).toBe('boolean')
    expect(info.optional).toBe(false)
    expect(info.nullable).toBe(false)
  })

  it('handles union with default value', () => {
    const info = schemaInfo(z.number().or(z.null()).default(42))
    expect(info.type).toBe('number')
    expect(info.nullable).toBe(true)
    expect(info.getDefaultValue?.()).toBe(42)
  })

  it('returns null type for unsupported multi-type unions', () => {
    const info = schemaInfo(z.string().or(z.number()))
    expect(info.type).toBeNull()
    expect(info.optional).toBe(false)
    expect(info.nullable).toBe(false)
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

  it('extracts format from z.email()', () => {
    expect(schemaInfo(z.email())).toMatchObject({
      type: 'string',
      format: 'email',
    })
  })

  it('extracts format from z.string().email()', () => {
    expect(schemaInfo(z.string().email())).toMatchObject({
      type: 'string',
      format: 'email',
    })
  })

  it('extracts format from z.url()', () => {
    expect(schemaInfo(z.url())).toMatchObject({
      type: 'string',
      format: 'url',
    })
  })

  it('extracts format from z.string().url()', () => {
    expect(schemaInfo(z.string().url())).toMatchObject({
      type: 'string',
      format: 'url',
    })
  })

  it('extracts format from z.uuid()', () => {
    expect(schemaInfo(z.uuid())).toMatchObject({
      type: 'string',
      format: 'uuid',
    })
  })

  it('extracts format from z.iso.date()', () => {
    expect(schemaInfo(z.iso.date())).toMatchObject({
      type: 'string',
      format: 'date',
    })
  })

  it('extracts format from z.iso.datetime()', () => {
    expect(schemaInfo(z.iso.datetime())).toMatchObject({
      type: 'string',
      format: 'datetime',
    })
  })

  it('extracts format from z.iso.time()', () => {
    expect(schemaInfo(z.iso.time())).toMatchObject({
      type: 'string',
      format: 'time',
    })
  })

  it('extracts format from z.iso.duration()', () => {
    expect(schemaInfo(z.iso.duration())).toMatchObject({
      type: 'string',
      format: 'duration',
    })
  })

  it('extracts format from z.cuid()', () => {
    expect(schemaInfo(z.cuid())).toMatchObject({
      type: 'string',
      format: 'cuid',
    })
  })

  it('extracts format from z.cuid2()', () => {
    expect(schemaInfo(z.cuid2())).toMatchObject({
      type: 'string',
      format: 'cuid2',
    })
  })

  it('extracts format from z.ulid()', () => {
    expect(schemaInfo(z.ulid())).toMatchObject({
      type: 'string',
      format: 'ulid',
    })
  })

  it('extracts format from z.emoji()', () => {
    expect(schemaInfo(z.emoji())).toMatchObject({
      type: 'string',
      format: 'emoji',
    })
  })

  it('extracts format from z.base64()', () => {
    expect(schemaInfo(z.base64())).toMatchObject({
      type: 'string',
      format: 'base64',
    })
  })

  it('extracts format from z.jwt()', () => {
    expect(schemaInfo(z.jwt())).toMatchObject({
      type: 'string',
      format: 'jwt',
    })
  })

  it('extracts format from z.nanoid()', () => {
    expect(schemaInfo(z.nanoid())).toMatchObject({
      type: 'string',
      format: 'nanoid',
    })
  })

  it('extracts format from z.string().date()', () => {
    expect(schemaInfo(z.string().date())).toMatchObject({
      type: 'string',
      format: 'date',
    })
  })

  it('extracts format from z.string().datetime()', () => {
    expect(schemaInfo(z.string().datetime())).toMatchObject({
      type: 'string',
      format: 'datetime',
    })
  })

  it('extracts format from z.string().time()', () => {
    expect(schemaInfo(z.string().time())).toMatchObject({
      type: 'string',
      format: 'time',
    })
  })

  it('preserves format through optional wrapper', () => {
    const info = schemaInfo(z.email().optional())
    expect(info).toMatchObject({
      type: 'string',
      format: 'email',
      optional: true,
    })
  })

  it('preserves format through nullable wrapper', () => {
    const info = schemaInfo(z.iso.date().nullable())
    expect(info).toMatchObject({
      type: 'string',
      format: 'date',
      nullable: true,
    })
  })

  it('preserves format through default wrapper', () => {
    const info = schemaInfo(z.email().default('a@b.com'))
    expect(info).toMatchObject({
      type: 'string',
      format: 'email',
    })
    expect(info.getDefaultValue?.()).toBe('a@b.com')
  })

  it('does not set format on plain string', () => {
    expect(schemaInfo(z.string()).format).toBeUndefined()
  })

  it('does not set format on z.date()', () => {
    expect(schemaInfo(z.date()).format).toBeUndefined()
  })

  it('extracts file type from z.instanceof(File)', () => {
    expect(schemaInfo(z.instanceof(File))).toEqual({
      type: 'file',
      optional: false,
      nullable: false,
      getDefaultValue: undefined,
      enumValues: undefined,
    })
  })

  it('extracts file type from z.instanceof(Blob)', () => {
    expect(schemaInfo(z.instanceof(Blob))).toEqual({
      type: 'file',
      optional: false,
      nullable: false,
      getDefaultValue: undefined,
      enumValues: undefined,
    })
  })

  it('handles file type with optional and nullable modifiers', () => {
    const info = schemaInfo(z.instanceof(File).optional().nullable())
    expect(info.type).toBe('file')
    expect(info.optional).toBe(true)
    expect(info.nullable).toBe(true)
  })

  it('returns null for non-file instanceof schemas', () => {
    expect(schemaInfo(z.instanceof(RegExp)).type).toBeNull()
  })

  it('unwraps refined file schemas', () => {
    const schema = z
      .instanceof(File)
      .refine((f) => f.size <= 2_000_000, 'Max file size is 2MB')
      .refine(
        (f) => f.type.startsWith('image/'),
        'Only image files are allowed'
      )
    const info = schemaInfo(schema)
    expect(info.type).toBe('file')
    expect(info.optional).toBe(false)
    expect(info.nullable).toBe(false)
  })

  it('extracts array of strings', () => {
    const info = schemaInfo(z.array(z.string()))
    expect(info.type).toBe('array')
    expect(info.optional).toBe(false)
    expect(info.nullable).toBe(false)
    expect(info.item?.type).toBe('string')
  })

  it('extracts array of numbers', () => {
    const info = schemaInfo(z.array(z.number()))
    expect(info.type).toBe('array')
    expect(info.item?.type).toBe('number')
  })

  it('extracts array of booleans', () => {
    const info = schemaInfo(z.array(z.boolean()))
    expect(info.type).toBe('array')
    expect(info.item?.type).toBe('boolean')
  })

  it('extracts array of dates', () => {
    const info = schemaInfo(z.array(z.date()))
    expect(info.type).toBe('array')
    expect(info.item?.type).toBe('date')
  })

  it('extracts array of enums', () => {
    const info = schemaInfo(z.array(z.enum(['a', 'b'])))
    expect(info.type).toBe('array')
    expect(info.item?.type).toBe('enum')
    expect(info.item?.enumValues).toEqual(['a', 'b'])
  })

  it('extracts array of files', () => {
    const info = schemaInfo(z.array(z.instanceof(File)))
    expect(info.type).toBe('array')
    expect(info.item?.type).toBe('file')
  })

  it('extracts array of objects', () => {
    const info = schemaInfo(
      z.array(z.object({ street: z.string(), city: z.string() }))
    )
    expect(info.type).toBe('array')
    expect(info.item?.type).toBe('object')
    expect(info.item?.fields?.street.type).toBe('string')
    expect(info.item?.fields?.city.type).toBe('string')
  })

  it('extracts nested arrays', () => {
    const info = schemaInfo(z.array(z.array(z.number())))
    expect(info.type).toBe('array')
    expect(info.item?.type).toBe('array')
    expect(info.item?.item?.type).toBe('number')
  })

  it('handles optional array', () => {
    const info = schemaInfo(z.array(z.string()).optional())
    expect(info.type).toBe('array')
    expect(info.optional).toBe(true)
    expect(info.item?.type).toBe('string')
  })

  it('handles nullable array', () => {
    const info = schemaInfo(z.array(z.string()).nullable())
    expect(info.type).toBe('array')
    expect(info.nullable).toBe(true)
    expect(info.item?.type).toBe('string')
  })

  it('handles array with default value', () => {
    const info = schemaInfo(z.array(z.string()).default(['a']))
    expect(info.type).toBe('array')
    expect(info.getDefaultValue?.()).toEqual(['a'])
    expect(info.item?.type).toBe('string')
  })

  it('handles array inside pipe', () => {
    const schema = z
      .array(z.string())
      .pipe(z.array(z.string()).transform((v) => v))
    const info = schemaInfo(schema)
    expect(info.type).toBe('array')
    expect(info.item?.type).toBe('string')
  })

  it('extracts object with nested object', () => {
    const info = schemaInfo(
      z.object({
        billing: z.object({ street: z.string(), city: z.string() }),
      })
    )
    expect(info.type).toBe('object')
    expect(info.fields?.billing.type).toBe('object')
    expect(info.fields?.billing.fields?.street.type).toBe('string')
    expect(info.fields?.billing.fields?.city.type).toBe('string')
  })

  it('extracts object with array field', () => {
    const info = schemaInfo(z.object({ tags: z.array(z.string()) }))
    expect(info.type).toBe('object')
    expect(info.fields?.tags.type).toBe('array')
    expect(info.fields?.tags.item?.type).toBe('string')
  })

  it('handles optional object', () => {
    const info = schemaInfo(z.object({ name: z.string() }).optional())
    expect(info.type).toBe('object')
    expect(info.optional).toBe(true)
    expect(info.fields?.name.type).toBe('string')
  })

  it('handles nullable object', () => {
    const info = schemaInfo(z.object({ name: z.string() }).nullable())
    expect(info.type).toBe('object')
    expect(info.nullable).toBe(true)
    expect(info.fields?.name.type).toBe('string')
  })

  it('handles deep nesting: object → array → object', () => {
    const info = schemaInfo(
      z.object({
        addresses: z.array(
          z.object({
            street: z.string(),
            tags: z.array(z.string()),
          })
        ),
      })
    )
    expect(info.type).toBe('object')
    expect(info.fields?.addresses.type).toBe('array')
    expect(info.fields?.addresses.item?.type).toBe('object')
    expect(info.fields?.addresses.item?.fields?.street.type).toBe('string')
    expect(info.fields?.addresses.item?.fields?.tags.type).toBe('array')
    expect(info.fields?.addresses.item?.fields?.tags.item?.type).toBe('string')
  })
})
