import { describe, expect, it } from 'vitest'
import * as yup from 'yup'
import { schemaInfo } from '../schema-info'

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

  it('extracts info from object type', () => {
    const info = schemaInfo(yup.object())
    expect(info.type).toBe('object')
    expect(info.optional).toBe(true)
  })

  it('extracts info from array type', () => {
    const info = schemaInfo(yup.array().of(yup.string()))
    expect(info.type).toBe('array')
    expect(info.optional).toBe(true)
    expect(info.item?.type).toBe('string')
  })

  it('returns null for unsupported types', () => {
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

  it('extracts email format', () => {
    expect(schemaInfo(yup.string().email().required())).toMatchObject({
      type: 'string',
      format: 'email',
    })
  })

  it('extracts url format', () => {
    expect(schemaInfo(yup.string().url().required())).toMatchObject({
      type: 'string',
      format: 'url',
    })
  })

  it('extracts uuid format', () => {
    expect(schemaInfo(yup.string().uuid().required())).toMatchObject({
      type: 'string',
      format: 'uuid',
    })
  })

  it('extracts datetime format', () => {
    expect(schemaInfo(yup.string().datetime().required())).toMatchObject({
      type: 'string',
      format: 'datetime',
    })
  })

  it('does not set format on plain string', () => {
    expect(schemaInfo(yup.string().required()).format).toBeUndefined()
  })

  it('extracts file type from mixed() with File type check', () => {
    const info = schemaInfo(
      yup.mixed((input): input is File => input instanceof File)
    )
    expect(info.type).toBe('file')
    expect(info.optional).toBe(true)
    expect(info.nullable).toBe(false)
  })

  it('extracts file type from mixed() with Blob type check', () => {
    const info = schemaInfo(
      yup.mixed((input): input is Blob => input instanceof Blob)
    )
    expect(info.type).toBe('file')
    expect(info.optional).toBe(true)
    expect(info.nullable).toBe(false)
  })

  it('handles file type with required and nullable modifiers', () => {
    const info = schemaInfo(
      yup
        .mixed((input): input is File => input instanceof File)
        .required()
        .nullable()
    )
    expect(info.type).toBe('file')
    expect(info.optional).toBe(false)
    expect(info.nullable).toBe(true)
  })

  it('returns null for non-file mixed schemas', () => {
    const info = schemaInfo(
      yup.mixed((input): input is RegExp => input instanceof RegExp)
    )
    expect(info.type).toBeNull()
  })

  it('unwraps refined file schemas', () => {
    const schema = yup
      .mixed((input): input is File => input instanceof File)
      .test(
        'fileSize',
        'Max file size is 2MB',
        (v) => !v || v.size <= 2_000_000
      )
    const info = schemaInfo(schema)
    expect(info.type).toBe('file')
  })

  it('extracts array of strings', () => {
    const info = schemaInfo(yup.array().of(yup.string()))
    expect(info.type).toBe('array')
    expect(info.item?.type).toBe('string')
  })

  it('extracts array of numbers', () => {
    const info = schemaInfo(yup.array().of(yup.number()))
    expect(info.type).toBe('array')
    expect(info.item?.type).toBe('number')
  })

  it('extracts array of objects', () => {
    const info = schemaInfo(yup.array().of(yup.object({ name: yup.string() })))
    expect(info.type).toBe('array')
    expect(info.item?.type).toBe('object')
    expect(info.item?.fields?.name.type).toBe('string')
  })

  it('handles array without item type', () => {
    const info = schemaInfo(yup.array())
    expect(info.type).toBe('array')
    expect(info.item).toBeUndefined()
  })

  it('handles required array', () => {
    const info = schemaInfo(yup.array().of(yup.string()).required())
    expect(info.type).toBe('array')
    expect(info.optional).toBe(false)
    expect(info.item?.type).toBe('string')
  })

  it('handles nullable array', () => {
    const info = schemaInfo(yup.array().of(yup.string()).nullable())
    expect(info.type).toBe('array')
    expect(info.nullable).toBe(true)
    expect(info.item?.type).toBe('string')
  })

  it('handles array with default value', () => {
    const info = schemaInfo(yup.array().of(yup.string()).default(['a']))
    expect(info.type).toBe('array')
    expect(info.getDefaultValue?.()).toEqual(['a'])
  })

  it('extracts object with nested object', () => {
    const info = schemaInfo(
      yup.object({
        billing: yup.object({ street: yup.string(), city: yup.string() }),
      })
    )
    expect(info.type).toBe('object')
    expect(info.fields?.billing.type).toBe('object')
    expect(info.fields?.billing.fields?.street.type).toBe('string')
  })

  it('extracts object with array field', () => {
    const info = schemaInfo(yup.object({ tags: yup.array().of(yup.string()) }))
    expect(info.type).toBe('object')
    expect(info.fields?.tags.type).toBe('array')
    expect(info.fields?.tags.item?.type).toBe('string')
  })

  it('handles optional object', () => {
    const info = schemaInfo(yup.object({ name: yup.string() }))
    expect(info.type).toBe('object')
    expect(info.optional).toBe(true)
  })

  it('handles deep nesting: object → array → object', () => {
    const info = schemaInfo(
      yup.object({
        addresses: yup.array().of(
          yup.object({
            street: yup.string(),
            tags: yup.array().of(yup.string()),
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

  it('extracts nested arrays', () => {
    const info = schemaInfo(yup.array().of(yup.array().of(yup.number())))
    expect(info.type).toBe('array')
    expect(info.item?.type).toBe('array')
    expect(info.item?.item?.type).toBe('number')
  })
})
