import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import { schemaInfo } from '../schema-info'

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

  it('extracts info from object type', () => {
    const info = schemaInfo(v.object({ name: v.string() }))
    expect(info.type).toBe('object')
    expect(info.optional).toBe(false)
    expect(info.fields?.name.type).toBe('string')
  })

  it('extracts info from array type', () => {
    const info = schemaInfo(v.array(v.string()))
    expect(info.type).toBe('array')
    expect(info.optional).toBe(false)
    expect(info.item?.type).toBe('string')
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

  it('extracts email format', () => {
    expect(schemaInfo(v.pipe(v.string(), v.email()))).toMatchObject({
      type: 'string',
      format: 'email',
    })
  })

  it('extracts url format', () => {
    expect(schemaInfo(v.pipe(v.string(), v.url()))).toMatchObject({
      type: 'string',
      format: 'url',
    })
  })

  it('extracts uuid format', () => {
    expect(schemaInfo(v.pipe(v.string(), v.uuid()))).toMatchObject({
      type: 'string',
      format: 'uuid',
    })
  })

  it('extracts isoDate format', () => {
    expect(schemaInfo(v.pipe(v.string(), v.isoDate()))).toMatchObject({
      type: 'string',
      format: 'date',
    })
  })

  it('extracts isoDateTime format', () => {
    expect(schemaInfo(v.pipe(v.string(), v.isoDateTime()))).toMatchObject({
      type: 'string',
      format: 'datetime',
    })
  })

  it('extracts isoTime format', () => {
    expect(schemaInfo(v.pipe(v.string(), v.isoTime()))).toMatchObject({
      type: 'string',
      format: 'time',
    })
  })

  it('extracts isoTimestamp format', () => {
    expect(schemaInfo(v.pipe(v.string(), v.isoTimestamp()))).toMatchObject({
      type: 'string',
      format: 'datetime',
    })
  })

  it('extracts isoTimeSecond format', () => {
    expect(schemaInfo(v.pipe(v.string(), v.isoTimeSecond()))).toMatchObject({
      type: 'string',
      format: 'time',
    })
  })

  it('extracts isoWeek format', () => {
    expect(schemaInfo(v.pipe(v.string(), v.isoWeek()))).toMatchObject({
      type: 'string',
      format: 'date',
    })
  })

  it('extracts ipv4 format', () => {
    expect(schemaInfo(v.pipe(v.string(), v.ipv4()))).toMatchObject({
      type: 'string',
      format: 'ipv4',
    })
  })

  it('extracts ipv6 format', () => {
    expect(schemaInfo(v.pipe(v.string(), v.ipv6()))).toMatchObject({
      type: 'string',
      format: 'ipv6',
    })
  })

  it('extracts ip format', () => {
    expect(schemaInfo(v.pipe(v.string(), v.ip()))).toMatchObject({
      type: 'string',
      format: 'ip',
    })
  })

  it('extracts cuid2 format', () => {
    expect(schemaInfo(v.pipe(v.string(), v.cuid2()))).toMatchObject({
      type: 'string',
      format: 'cuid2',
    })
  })

  it('extracts ulid format', () => {
    expect(schemaInfo(v.pipe(v.string(), v.ulid()))).toMatchObject({
      type: 'string',
      format: 'ulid',
    })
  })

  it('extracts emoji format', () => {
    expect(schemaInfo(v.pipe(v.string(), v.emoji()))).toMatchObject({
      type: 'string',
      format: 'emoji',
    })
  })

  it('extracts base64 format', () => {
    expect(schemaInfo(v.pipe(v.string(), v.base64()))).toMatchObject({
      type: 'string',
      format: 'base64',
    })
  })

  it('extracts nanoid format', () => {
    expect(schemaInfo(v.pipe(v.string(), v.nanoid()))).toMatchObject({
      type: 'string',
      format: 'nanoid',
    })
  })

  it('preserves format through optional wrapper', () => {
    const info = schemaInfo(v.optional(v.pipe(v.string(), v.email())))
    expect(info).toMatchObject({
      type: 'string',
      format: 'email',
      optional: true,
    })
  })

  it('preserves format through nullable wrapper', () => {
    const info = schemaInfo(v.nullable(v.pipe(v.string(), v.isoDate())))
    expect(info).toMatchObject({
      type: 'string',
      format: 'date',
      nullable: true,
    })
  })

  it('preserves format through nullish wrapper', () => {
    const info = schemaInfo(v.nullish(v.pipe(v.string(), v.url())))
    expect(info).toMatchObject({
      type: 'string',
      format: 'url',
      optional: true,
      nullable: true,
    })
  })

  it('does not set format on plain string', () => {
    expect(schemaInfo(v.string()).format).toBeUndefined()
  })

  it('does not set format on piped string without format validation', () => {
    expect(
      schemaInfo(v.pipe(v.string(), v.minLength(3))).format
    ).toBeUndefined()
  })

  it('extracts file type from v.instance(File)', () => {
    expect(schemaInfo(v.instance(File))).toEqual({
      type: 'file',
      optional: false,
      nullable: false,
      getDefaultValue: undefined,
      enumValues: undefined,
    })
  })

  it('extracts file type from v.instance(Blob)', () => {
    expect(schemaInfo(v.instance(Blob))).toEqual({
      type: 'file',
      optional: false,
      nullable: false,
      getDefaultValue: undefined,
      enumValues: undefined,
    })
  })

  it('handles file type with optional and nullable modifiers', () => {
    const info = schemaInfo(v.optional(v.nullable(v.instance(File))))
    expect(info.type).toBe('file')
    expect(info.optional).toBe(true)
    expect(info.nullable).toBe(true)
  })

  it('returns null for non-file instance schemas', () => {
    expect(schemaInfo(v.instance(RegExp)).type).toBeNull()
  })

  it('unwraps refined file schemas', () => {
    const schema = v.pipe(
      v.instance(File),
      v.check((f) => f.size <= 2_000_000, 'Max file size is 2MB'),
      v.check(
        (f) => f.type.startsWith('image/'),
        'Only image files are allowed'
      )
    )
    const info = schemaInfo(schema)
    expect(info.type).toBe('file')
    expect(info.optional).toBe(false)
    expect(info.nullable).toBe(false)
  })

  it('extracts array of strings', () => {
    const info = schemaInfo(v.array(v.string()))
    expect(info.type).toBe('array')
    expect(info.optional).toBe(false)
    expect(info.item?.type).toBe('string')
  })

  it('extracts array of numbers', () => {
    const info = schemaInfo(v.array(v.number()))
    expect(info.type).toBe('array')
    expect(info.item?.type).toBe('number')
  })

  it('extracts array of enums', () => {
    const info = schemaInfo(v.array(v.picklist(['a', 'b'])))
    expect(info.type).toBe('array')
    expect(info.item?.type).toBe('enum')
    expect(info.item?.enumValues).toEqual(['a', 'b'])
  })

  it('extracts array of objects', () => {
    const info = schemaInfo(
      v.array(v.object({ street: v.string(), city: v.string() }))
    )
    expect(info.type).toBe('array')
    expect(info.item?.type).toBe('object')
    expect(info.item?.fields?.street.type).toBe('string')
    expect(info.item?.fields?.city.type).toBe('string')
  })

  it('extracts nested arrays', () => {
    const info = schemaInfo(v.array(v.array(v.number())))
    expect(info.type).toBe('array')
    expect(info.item?.type).toBe('array')
    expect(info.item?.item?.type).toBe('number')
  })

  it('handles optional array', () => {
    const info = schemaInfo(v.optional(v.array(v.string())))
    expect(info.type).toBe('array')
    expect(info.optional).toBe(true)
    expect(info.item?.type).toBe('string')
  })

  it('handles nullable array', () => {
    const info = schemaInfo(v.nullable(v.array(v.string())))
    expect(info.type).toBe('array')
    expect(info.nullable).toBe(true)
    expect(info.item?.type).toBe('string')
  })

  it('handles array with default value', () => {
    const info = schemaInfo(v.optional(v.array(v.string()), ['a']))
    expect(info.type).toBe('array')
    expect(info.optional).toBe(true)
    expect(info.getDefaultValue?.()).toEqual(['a'])
    expect(info.item?.type).toBe('string')
  })

  it('handles array with pipe validation', () => {
    const info = schemaInfo(v.pipe(v.array(v.string()), v.minLength(1)))
    expect(info.type).toBe('array')
    expect(info.item?.type).toBe('string')
  })

  it('extracts object with nested object', () => {
    const info = schemaInfo(
      v.object({
        billing: v.object({ street: v.string(), city: v.string() }),
      })
    )
    expect(info.type).toBe('object')
    expect(info.fields?.billing.type).toBe('object')
    expect(info.fields?.billing.fields?.street.type).toBe('string')
  })

  it('extracts object with array field', () => {
    const info = schemaInfo(v.object({ tags: v.array(v.string()) }))
    expect(info.type).toBe('object')
    expect(info.fields?.tags.type).toBe('array')
    expect(info.fields?.tags.item?.type).toBe('string')
  })

  it('handles optional object', () => {
    const info = schemaInfo(v.optional(v.object({ name: v.string() })))
    expect(info.type).toBe('object')
    expect(info.optional).toBe(true)
    expect(info.fields?.name.type).toBe('string')
  })

  it('handles nullable object', () => {
    const info = schemaInfo(v.nullable(v.object({ name: v.string() })))
    expect(info.type).toBe('object')
    expect(info.nullable).toBe(true)
    expect(info.fields?.name.type).toBe('string')
  })

  it('handles deep nesting: object → array → object', () => {
    const info = schemaInfo(
      v.object({
        addresses: v.array(
          v.object({
            street: v.string(),
            tags: v.array(v.string()),
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
