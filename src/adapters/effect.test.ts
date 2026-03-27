import { Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'
import { schemaInfo } from '../schema-info'
import type { ArraySchemaInfo, ObjectSchemaInfo } from '../types'

describe('schemaInfo with Effect Schema', () => {
  it('extracts info from string type', () => {
    expect(schemaInfo(S.String)).toEqual({
      type: 'string',
      optional: false,
      nullable: false,
    })
  })

  it('extracts info from number type', () => {
    expect(schemaInfo(S.Number)).toEqual({
      type: 'number',
      optional: false,
      nullable: false,
    })
  })

  it('extracts info from boolean type', () => {
    expect(schemaInfo(S.Boolean)).toEqual({
      type: 'boolean',
      optional: false,
      nullable: false,
    })
  })

  it('extracts info from Date type', () => {
    const info = schemaInfo(S.Date)
    expect(info.type).toBe('date')
    expect(info.optional).toBe(false)
    expect(info.nullable).toBe(false)
  })

  it('extracts info from DateFromSelf type', () => {
    const info = schemaInfo(S.DateFromSelf)
    expect(info.type).toBe('date')
  })

  it('marks nullable via NullOr', () => {
    const info = schemaInfo(S.NullOr(S.String))
    expect(info.type).toBe('string')
    expect(info.optional).toBe(false)
    expect(info.nullable).toBe(true)
  })

  it('marks optional via UndefinedOr', () => {
    const info = schemaInfo(S.UndefinedOr(S.String))
    expect(info.type).toBe('string')
    expect(info.optional).toBe(true)
    expect(info.nullable).toBe(false)
  })

  it('handles NullishOr (optional + nullable)', () => {
    const info = schemaInfo(S.NullishOr(S.Number))
    expect(info.type).toBe('number')
    expect(info.optional).toBe(true)
    expect(info.nullable).toBe(true)
  })

  it('returns enum values from Literal union', () => {
    const info = schemaInfo(S.Literal('a', 'b', 'c'))
    expect(info.type).toBe('enum')
    expect(info.enumValues).toEqual(['a', 'b', 'c'])
  })

  it('handles single Literal as enum', () => {
    const info = schemaInfo(S.Literal('only'))
    expect(info.type).toBe('enum')
    expect(info.enumValues).toEqual(['only'])
  })

  it('handles Enums', () => {
    const MyEnum = { A: 'a', B: 'b' } as const
    const info = schemaInfo(S.Enums(MyEnum))
    expect(info.type).toBe('enum')
    expect(info.enumValues).toEqual(['a', 'b'])
  })

  it('handles Literal union with nullable', () => {
    const info = schemaInfo(S.NullOr(S.Literal('x', 'y')))
    expect(info.type).toBe('enum')
    expect(info.nullable).toBe(true)
    expect(info.enumValues).toEqual(['x', 'y'])
  })

  it('handles refined string', () => {
    const info = schemaInfo(S.String.pipe(S.minLength(3)))
    expect(info.type).toBe('string')
    expect(info.optional).toBe(false)
  })

  it('handles nullable Date', () => {
    const info = schemaInfo(S.NullOr(S.DateFromSelf))
    expect(info.type).toBe('date')
    expect(info.nullable).toBe(true)
  })

  it('handles optional boolean', () => {
    const info = schemaInfo(S.UndefinedOr(S.Boolean))
    expect(info.type).toBe('boolean')
    expect(info.optional).toBe(true)
  })

  it('handles optional via PropertySignature', () => {
    const info = schemaInfo(S.optional(S.String))
    expect(info.type).toBe('string')
    expect(info.optional).toBe(true)
  })

  it('extracts info from object type', () => {
    const info = schemaInfo(S.Struct({ name: S.String })) as ObjectSchemaInfo
    expect(info.type).toBe('object')
    expect(info.optional).toBe(false)
    expect(info.fields.name.type).toBe('string')
  })

  it('extracts uuid format', () => {
    expect(schemaInfo(S.UUID)).toMatchObject({
      type: 'string',
      format: 'uuid',
    })
  })

  it('extracts ulid format', () => {
    expect(schemaInfo(S.ULID)).toMatchObject({
      type: 'string',
      format: 'ulid',
    })
  })

  it('extracts datetime format from DateTimeUtc', () => {
    expect(schemaInfo(S.DateTimeUtc)).toMatchObject({
      type: 'string',
      format: 'datetime',
    })
  })

  it('does not set format on plain string', () => {
    expect(schemaInfo(S.String).format).toBeUndefined()
  })

  it('does not set format on Date (type is already date)', () => {
    expect(schemaInfo(S.Date).format).toBeUndefined()
  })

  it('extracts file type from S.instanceOf(File)', () => {
    const info = schemaInfo(S.instanceOf(File))
    expect(info.type).toBe('file')
    expect(info.optional).toBe(false)
    expect(info.nullable).toBe(false)
  })

  it('extracts file type from S.instanceOf(Blob)', () => {
    const info = schemaInfo(S.instanceOf(Blob))
    expect(info.type).toBe('file')
    expect(info.optional).toBe(false)
    expect(info.nullable).toBe(false)
  })

  it('handles nullable file type', () => {
    const info = schemaInfo(S.NullOr(S.instanceOf(File)))
    expect(info.type).toBe('file')
    expect(info.nullable).toBe(true)
  })

  it('handles optional file type', () => {
    const info = schemaInfo(S.UndefinedOr(S.instanceOf(File)))
    expect(info.type).toBe('file')
    expect(info.optional).toBe(true)
  })

  it('returns null for non-file instanceOf schemas', () => {
    expect(schemaInfo(S.instanceOf(RegExp)).type).toBeNull()
  })

  it('unwraps refined file schemas', () => {
    const schema = S.instanceOf(File).pipe(S.filter((f) => f.size <= 2_000_000))
    const info = schemaInfo(schema)
    expect(info.type).toBe('file')
    expect(info.optional).toBe(false)
    expect(info.nullable).toBe(false)
  })

  it('extracts array of strings', () => {
    const info = schemaInfo(S.Array(S.String)) as ArraySchemaInfo
    expect(info.type).toBe('array')
    expect(info.optional).toBe(false)
    expect(info.nullable).toBe(false)
    expect(info.item.type).toBe('string')
  })

  it('extracts array of numbers', () => {
    const info = schemaInfo(S.Array(S.Number)) as ArraySchemaInfo
    expect(info.type).toBe('array')
    expect(info.item.type).toBe('number')
  })

  it('extracts array of enums', () => {
    const info = schemaInfo(S.Array(S.Literal('a', 'b'))) as ArraySchemaInfo
    expect(info.type).toBe('array')
    expect(info.item.type).toBe('enum')
    expect(info.item.enumValues).toEqual(['a', 'b'])
  })

  it('extracts array of objects', () => {
    const info = schemaInfo(
      S.Array(S.Struct({ street: S.String, city: S.String }))
    ) as ArraySchemaInfo
    expect(info.type).toBe('array')
    expect(info.item.type).toBe('object')
    const item = info.item as ObjectSchemaInfo
    expect(item.fields.street.type).toBe('string')
    expect(item.fields.city.type).toBe('string')
  })

  it('extracts nested arrays', () => {
    const info = schemaInfo(S.Array(S.Array(S.Number))) as ArraySchemaInfo
    expect(info.type).toBe('array')
    expect(info.item.type).toBe('array')
    expect((info.item as ArraySchemaInfo).item.type).toBe('number')
  })

  it('handles optional array', () => {
    const info = schemaInfo(S.optional(S.Array(S.String))) as ArraySchemaInfo
    expect(info.type).toBe('array')
    expect(info.optional).toBe(true)
    expect(info.item.type).toBe('string')
  })

  it('handles nullable array', () => {
    const info = schemaInfo(S.NullOr(S.Array(S.String))) as ArraySchemaInfo
    expect(info.type).toBe('array')
    expect(info.nullable).toBe(true)
    expect(info.item.type).toBe('string')
  })

  it('handles array with pipe filter', () => {
    const info = schemaInfo(
      S.Array(S.String).pipe(S.filter((arr) => arr.length > 0))
    ) as ArraySchemaInfo
    expect(info.type).toBe('array')
    expect(info.item.type).toBe('string')
  })

  it('extracts object with nested object', () => {
    const info = schemaInfo(
      S.Struct({
        billing: S.Struct({ street: S.String, city: S.String }),
      })
    ) as ObjectSchemaInfo
    expect(info.type).toBe('object')
    expect(info.fields.billing.type).toBe('object')
    const billing = info.fields.billing as ObjectSchemaInfo
    expect(billing.fields.street.type).toBe('string')
    expect(billing.fields.city.type).toBe('string')
  })

  it('extracts object with array field', () => {
    const info = schemaInfo(
      S.Struct({ tags: S.Array(S.String) })
    ) as ObjectSchemaInfo
    expect(info.type).toBe('object')
    expect(info.fields.tags.type).toBe('array')
    expect((info.fields.tags as ArraySchemaInfo).item.type).toBe('string')
  })

  it('handles optional object', () => {
    const info = schemaInfo(
      S.optional(S.Struct({ name: S.String }))
    ) as ObjectSchemaInfo
    expect(info.type).toBe('object')
    expect(info.optional).toBe(true)
    expect(info.fields.name.type).toBe('string')
  })

  it('handles deep nesting: object → array → object', () => {
    const info = schemaInfo(
      S.Struct({
        addresses: S.Array(
          S.Struct({
            street: S.String,
            tags: S.Array(S.String),
          })
        ),
      })
    ) as ObjectSchemaInfo
    expect(info.type).toBe('object')
    const addresses = info.fields.addresses as ArraySchemaInfo
    expect(addresses.type).toBe('array')
    const addressItem = addresses.item as ObjectSchemaInfo
    expect(addressItem.type).toBe('object')
    expect(addressItem.fields.street.type).toBe('string')
    const tags = addressItem.fields.tags as ArraySchemaInfo
    expect(tags.type).toBe('array')
    expect(tags.item.type).toBe('string')
  })
})
