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
})
