import { type } from 'arktype'
import { describe, expect, it } from 'vitest'
import { schemaInfo } from '../schema-info'

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

  it('extracts info from object type', () => {
    const info = schemaInfo(type({ name: 'string' }))
    expect(info.type).toBe('object')
    expect(info.optional).toBe(false)
    expect(info.fields?.name.type).toBe('string')
  })

  it('handles number with optional and nullable', () => {
    const info = schemaInfo(type('number | null | undefined'))
    expect(info.type).toBe('number')
    expect(info.optional).toBe(true)
    expect(info.nullable).toBe(true)
  })

  it('extracts email format', () => {
    expect(schemaInfo(type('string.email'))).toMatchObject({
      type: 'string',
      format: 'email',
    })
  })

  it('extracts url format', () => {
    expect(schemaInfo(type('string.url'))).toMatchObject({
      type: 'string',
      format: 'url',
    })
  })

  it('extracts uuid format', () => {
    expect(schemaInfo(type('string.uuid'))).toMatchObject({
      type: 'string',
      format: 'uuid',
    })
  })

  it('extracts ipv4 format', () => {
    expect(schemaInfo(type('string.ip.v4'))).toMatchObject({
      type: 'string',
      format: 'ipv4',
    })
  })

  it('extracts ipv6 format', () => {
    expect(schemaInfo(type('string.ip.v6'))).toMatchObject({
      type: 'string',
      format: 'ipv6',
    })
  })

  it('does not set format on plain string', () => {
    expect(schemaInfo(type('string')).format).toBeUndefined()
  })

  it('does not set format on constrained string', () => {
    expect(schemaInfo(type('string > 3')).format).toBeUndefined()
  })

  it('extracts file type from File', () => {
    expect(schemaInfo(type('File'))).toEqual({
      type: 'file',
      optional: false,
      nullable: false,
    })
  })

  it('extracts file type from Blob', () => {
    expect(schemaInfo(type('Blob'))).toEqual({
      type: 'file',
      optional: false,
      nullable: false,
    })
  })

  it('handles optional File', () => {
    const info = schemaInfo(type('File | undefined'))
    expect(info.type).toBe('file')
    expect(info.optional).toBe(true)
  })

  it('handles nullable File', () => {
    const info = schemaInfo(type('File | null'))
    expect(info.type).toBe('file')
    expect(info.nullable).toBe(true)
  })

  it('unwraps refined file schemas', () => {
    const schema = type('File').narrow((f, ctx) => {
      if (f.size > 2_000_000) return ctx.mustBe('under 2MB')
      return true
    })
    const info = schemaInfo(schema)
    expect(info.type).toBe('file')
    expect(info.optional).toBe(false)
    expect(info.nullable).toBe(false)
  })

  it('extracts array of strings', () => {
    const info = schemaInfo(type('string[]'))
    expect(info.type).toBe('array')
    expect(info.optional).toBe(false)
    expect(info.nullable).toBe(false)
    expect(info.item?.type).toBe('string')
  })

  it('extracts array of numbers', () => {
    const info = schemaInfo(type('number[]'))
    expect(info.type).toBe('array')
    expect(info.item?.type).toBe('number')
  })

  it('extracts array of dates', () => {
    const info = schemaInfo(type('Date[]'))
    expect(info.type).toBe('array')
    expect(info.item?.type).toBe('date')
  })

  it('extracts array of objects', () => {
    const info = schemaInfo(type({ name: 'string' }).array())
    expect(info.type).toBe('array')
    expect(info.item?.type).toBe('object')
    expect(info.item?.fields?.name.type).toBe('string')
  })

  it('extracts nested arrays', () => {
    const info = schemaInfo(type('number[][]'))
    expect(info.type).toBe('array')
    expect(info.item?.type).toBe('array')
    expect(info.item?.item?.type).toBe('number')
  })

  it('handles optional array', () => {
    const info = schemaInfo(type('string[] | undefined'))
    expect(info.type).toBe('array')
    expect(info.optional).toBe(true)
    expect(info.item?.type).toBe('string')
  })

  it('handles nullable array', () => {
    const info = schemaInfo(type('string[] | null'))
    expect(info.type).toBe('array')
    expect(info.nullable).toBe(true)
    expect(info.item?.type).toBe('string')
  })

  it('extracts object with nested object', () => {
    const info = schemaInfo(
      type({
        billing: { street: 'string', city: 'string' },
      })
    )
    expect(info.type).toBe('object')
    expect(info.fields?.billing.type).toBe('object')
    expect(info.fields?.billing.fields?.street.type).toBe('string')
    expect(info.fields?.billing.fields?.city.type).toBe('string')
  })

  it('extracts object with array field', () => {
    const info = schemaInfo(type({ tags: 'string[]' }))
    expect(info.type).toBe('object')
    expect(info.fields?.tags.type).toBe('array')
    expect(info.fields?.tags.item?.type).toBe('string')
  })

  it('handles optional object field', () => {
    const info = schemaInfo(type({ 'name?': 'string' }))
    expect(info.type).toBe('object')
    expect(info.fields?.name.type).toBe('string')
    expect(info.fields?.name.optional).toBe(true)
  })

  it('handles deep nesting: object → array → object', () => {
    const info = schemaInfo(
      type({
        addresses: type({ street: 'string', tags: 'string[]' }).array(),
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
