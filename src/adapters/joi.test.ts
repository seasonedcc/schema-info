import Joi from 'joi'
import { describe, expect, it } from 'vitest'
import { schemaInfo } from '../schema-info'
import type {
  ArraySchemaInfo,
  ObjectSchemaInfo,
  UnionSchemaInfo,
} from '../types'

describe('schemaInfo with Joi', () => {
  it('extracts info from string type', () => {
    expect(schemaInfo(Joi.string().required())).toEqual({
      type: 'string',
      optional: false,
      nullable: false,
    })
  })

  it('extracts info from number type', () => {
    expect(schemaInfo(Joi.number().required())).toEqual({
      type: 'number',
      optional: false,
      nullable: false,
    })
  })

  it('extracts info from boolean type', () => {
    expect(schemaInfo(Joi.boolean().required())).toEqual({
      type: 'boolean',
      optional: false,
      nullable: false,
    })
  })

  it('extracts info from date type', () => {
    expect(schemaInfo(Joi.date().required())).toEqual({
      type: 'date',
      optional: false,
      nullable: false,
    })
  })

  it('treats Joi schemas as optional by default', () => {
    const info = schemaInfo(Joi.string())
    expect(info.type).toBe('string')
    expect(info.optional).toBe(true)
  })

  it('marks required schemas as not optional', () => {
    const info = schemaInfo(Joi.number().required())
    expect(info.type).toBe('number')
    expect(info.optional).toBe(false)
  })

  it('marks nullable schemas correctly', () => {
    const info = schemaInfo(Joi.string().required().allow(null))
    expect(info.type).toBe('string')
    expect(info.optional).toBe(false)
    expect(info.nullable).toBe(true)
  })

  it('handles optional and nullable together', () => {
    const info = schemaInfo(Joi.number().allow(null))
    expect(info.type).toBe('number')
    expect(info.optional).toBe(true)
    expect(info.nullable).toBe(true)
  })

  it('collects default value getter', () => {
    const info = schemaInfo(Joi.string().default('foo'))
    expect(info.type).toBe('string')
    expect(typeof info.getDefaultValue).toBe('function')
    expect(info.getDefaultValue?.()).toBe('foo')
  })

  it('handles default with modifiers', () => {
    const info = schemaInfo(Joi.string().required().allow(null).default('bar'))
    expect(info.type).toBe('string')
    expect(info.optional).toBe(false)
    expect(info.nullable).toBe(true)
    expect(info.getDefaultValue?.()).toBe('bar')
  })

  it('returns enum values from valid()', () => {
    const info = schemaInfo(Joi.string().valid('a', 'b').required())
    expect(info).toEqual({
      type: 'enum',
      optional: false,
      nullable: false,
      enumValues: ['a', 'b'],
    })
  })

  it('handles enums with optional, nullable and default', () => {
    const info = schemaInfo(
      Joi.string().valid('x', 'y').allow(null).default('x')
    )
    expect(info.type).toBe('enum')
    expect(info.optional).toBe(true)
    expect(info.nullable).toBe(true)
    expect(info.enumValues).toEqual(['x', 'y'])
    expect(info.getDefaultValue?.()).toBe('x')
  })

  it('handles boolean with modifiers', () => {
    const info = schemaInfo(Joi.boolean().default(true))
    expect(info.type).toBe('boolean')
    expect(info.optional).toBe(true)
    expect(info.getDefaultValue?.()).toBe(true)
  })

  it('handles date with modifiers', () => {
    const info = schemaInfo(Joi.date().required().allow(null))
    expect(info.type).toBe('date')
    expect(info.optional).toBe(false)
    expect(info.nullable).toBe(true)
  })

  it('preserves enum value order', () => {
    const info = schemaInfo(Joi.string().valid('first', 'second', 'third'))
    expect(info.enumValues).toEqual(['first', 'second', 'third'])
  })

  it('handles enum with single value', () => {
    const info = schemaInfo(Joi.string().valid('only'))
    expect(info.type).toBe('enum')
    expect(info.enumValues).toEqual(['only'])
  })

  it('extracts info from object type', () => {
    const info = schemaInfo(
      Joi.object({ name: Joi.string() })
    ) as ObjectSchemaInfo
    expect(info.type).toBe('object')
    expect(info.optional).toBe(true)
    expect(info.fields.name.type).toBe('string')
  })

  it('extracts info from array type', () => {
    const info = schemaInfo(Joi.array().items(Joi.string())) as ArraySchemaInfo
    expect(info.type).toBe('array')
    expect(info.optional).toBe(true)
    expect(info.item.type).toBe('string')
  })

  it('handles number with required and default', () => {
    const info = schemaInfo(Joi.number().required().default(42))
    expect(info.type).toBe('number')
    expect(info.optional).toBe(false)
    expect(info.getDefaultValue?.()).toBe(42)
  })

  it('extracts email format', () => {
    expect(schemaInfo(Joi.string().email())).toMatchObject({
      type: 'string',
      format: 'email',
    })
  })

  it('extracts url format from uri()', () => {
    expect(schemaInfo(Joi.string().uri())).toMatchObject({
      type: 'string',
      format: 'url',
    })
  })

  it('extracts uuid format', () => {
    expect(schemaInfo(Joi.string().uuid())).toMatchObject({
      type: 'string',
      format: 'uuid',
    })
  })

  it('extracts uuid format from guid()', () => {
    expect(schemaInfo(Joi.string().guid())).toMatchObject({
      type: 'string',
      format: 'uuid',
    })
  })

  it('extracts datetime format from isoDate()', () => {
    expect(schemaInfo(Joi.string().isoDate())).toMatchObject({
      type: 'string',
      format: 'datetime',
    })
  })

  it('extracts duration format from isoDuration()', () => {
    expect(schemaInfo(Joi.string().isoDuration())).toMatchObject({
      type: 'string',
      format: 'duration',
    })
  })

  it('extracts ip format', () => {
    expect(schemaInfo(Joi.string().ip())).toMatchObject({
      type: 'string',
      format: 'ip',
    })
  })

  it('extracts base64 format', () => {
    expect(schemaInfo(Joi.string().base64())).toMatchObject({
      type: 'string',
      format: 'base64',
    })
  })

  it('does not set format on plain string', () => {
    expect(schemaInfo(Joi.string()).format).toBeUndefined()
  })

  it('extracts file type from Joi.object().instance(File)', () => {
    const info = schemaInfo(Joi.object().instance(File).required())
    expect(info.type).toBe('file')
    expect(info.optional).toBe(false)
    expect(info.nullable).toBe(false)
  })

  it('extracts file type from Joi.object().instance(Blob)', () => {
    const info = schemaInfo(Joi.object().instance(Blob).required())
    expect(info.type).toBe('file')
    expect(info.optional).toBe(false)
    expect(info.nullable).toBe(false)
  })

  it('handles file type with optional and nullable modifiers', () => {
    const info = schemaInfo(Joi.object().instance(File).allow(null))
    expect(info.type).toBe('file')
    expect(info.optional).toBe(true)
    expect(info.nullable).toBe(true)
  })

  it('returns null for non-file instance schemas', () => {
    expect(schemaInfo(Joi.object().instance(RegExp)).type).toBeNull()
  })

  it('unwraps refined file schemas', () => {
    const schema = Joi.object()
      .instance(File)
      .custom((value) => {
        if (value.size > 2_000_000) throw new Error('Max file size is 2MB')
        return value
      })
    const info = schemaInfo(schema)
    expect(info.type).toBe('file')
  })

  it('extracts array of strings', () => {
    const info = schemaInfo(Joi.array().items(Joi.string())) as ArraySchemaInfo
    expect(info.type).toBe('array')
    expect(info.optional).toBe(true)
    expect(info.item.type).toBe('string')
  })

  it('extracts array of numbers', () => {
    const info = schemaInfo(Joi.array().items(Joi.number())) as ArraySchemaInfo
    expect(info.type).toBe('array')
    expect(info.item.type).toBe('number')
  })

  it('extracts array of objects', () => {
    const info = schemaInfo(
      Joi.array().items(
        Joi.object({ street: Joi.string(), city: Joi.string() })
      )
    ) as ArraySchemaInfo
    expect(info.type).toBe('array')
    expect(info.item.type).toBe('object')
    const itemInfo = info.item as ObjectSchemaInfo
    expect(itemInfo.fields.street.type).toBe('string')
    expect(itemInfo.fields.city.type).toBe('string')
  })

  it('extracts nested arrays', () => {
    const info = schemaInfo(
      Joi.array().items(Joi.array().items(Joi.number()))
    ) as ArraySchemaInfo
    expect(info.type).toBe('array')
    expect(info.item.type).toBe('array')
    expect((info.item as ArraySchemaInfo).item.type).toBe('number')
  })

  it('handles array without item type', () => {
    const info = schemaInfo(Joi.array())
    expect(info.type).toBeNull()
  })

  it('handles required array', () => {
    const info = schemaInfo(
      Joi.array().items(Joi.string()).required()
    ) as ArraySchemaInfo
    expect(info.type).toBe('array')
    expect(info.optional).toBe(false)
    expect(info.item.type).toBe('string')
  })

  it('handles nullable array', () => {
    const info = schemaInfo(
      Joi.array().items(Joi.string()).allow(null)
    ) as ArraySchemaInfo
    expect(info.type).toBe('array')
    expect(info.nullable).toBe(true)
    expect(info.item.type).toBe('string')
  })

  it('handles array with default value', () => {
    const info = schemaInfo(Joi.array().items(Joi.string()).default(['a']))
    expect(info.type).toBe('array')
    expect(info.getDefaultValue?.()).toEqual(['a'])
  })

  it('extracts object with nested object', () => {
    const info = schemaInfo(
      Joi.object({
        billing: Joi.object({ street: Joi.string(), city: Joi.string() }),
      })
    ) as ObjectSchemaInfo
    expect(info.type).toBe('object')
    expect(info.fields.billing.type).toBe('object')
    const billingInfo = info.fields.billing as ObjectSchemaInfo
    expect(billingInfo.fields.street.type).toBe('string')
    expect(billingInfo.fields.city.type).toBe('string')
  })

  it('extracts object with array field', () => {
    const info = schemaInfo(
      Joi.object({ tags: Joi.array().items(Joi.string()) })
    ) as ObjectSchemaInfo
    expect(info.type).toBe('object')
    expect(info.fields.tags.type).toBe('array')
    expect((info.fields.tags as ArraySchemaInfo).item.type).toBe('string')
  })

  it('handles required object', () => {
    const info = schemaInfo(
      Joi.object({ name: Joi.string() }).required()
    ) as ObjectSchemaInfo
    expect(info.type).toBe('object')
    expect(info.optional).toBe(false)
    expect(info.fields.name.type).toBe('string')
  })

  it('handles deep nesting: object → array → object', () => {
    const info = schemaInfo(
      Joi.object({
        addresses: Joi.array().items(
          Joi.object({
            street: Joi.string(),
            tags: Joi.array().items(Joi.string()),
          })
        ),
      })
    ) as ObjectSchemaInfo
    const addressesInfo = info.fields.addresses as ArraySchemaInfo
    const addressItemInfo = addressesInfo.item as ObjectSchemaInfo
    const tagsInfo = addressItemInfo.fields.tags as ArraySchemaInfo
    expect(info.type).toBe('object')
    expect(addressesInfo.type).toBe('array')
    expect(addressItemInfo.type).toBe('object')
    expect(addressItemInfo.fields.street.type).toBe('string')
    expect(tagsInfo.type).toBe('array')
    expect(tagsInfo.item.type).toBe('string')
  })

  describe('alternatives', () => {
    it('returns union type for try() of mixed scalars', () => {
      const info = schemaInfo(
        Joi.alternatives().try(Joi.string(), Joi.number())
      ) as UnionSchemaInfo
      expect(info.type).toBe('union')
      const types = info.options.map((o) => o.type).sort()
      expect(types).toEqual(['number', 'string'])
      expect(info.discriminator).toBeUndefined()
    })

    it('collapses identical scalar try() to that scalar', () => {
      const info = schemaInfo(
        Joi.alternatives().try(Joi.string(), Joi.string())
      )
      expect(info.type).toBe('string')
    })

    it('detects discriminator from conditional with switch', () => {
      const info = schemaInfo(
        Joi.alternatives().conditional('type', {
          switch: [
            // biome-ignore lint/suspicious/noThenProperty: Joi switch API requires `then` key
            { is: 'a', then: Joi.object({ x: Joi.string() }) },
            // biome-ignore lint/suspicious/noThenProperty: Joi switch API requires `then` key
            { is: 'b', then: Joi.object({ y: Joi.number() }) },
          ],
        })
      ) as UnionSchemaInfo
      expect(info.type).toBe('union')
      expect(info.discriminator).toBe('type')
      expect(info.options).toHaveLength(2)
      expect(info.options[0].type).toBe('object')
      expect(info.options[1].type).toBe('object')
    })

    it('detects discriminator post-hoc from try() of objects with shared valid().only() key', () => {
      const info = schemaInfo(
        Joi.alternatives().try(
          Joi.object({
            type: Joi.string().valid('a').only().required(),
            x: Joi.string(),
          }),
          Joi.object({
            type: Joi.string().valid('b').only().required(),
            y: Joi.number(),
          })
        )
      ) as UnionSchemaInfo
      expect(info.type).toBe('union')
      expect(info.discriminator).toBe('type')
    })

    it('returns single recursion when alternatives has one option', () => {
      const info = schemaInfo(Joi.alternatives().try(Joi.string()))
      expect(info.type).toBe('string')
    })

    it('returns null when alternatives has no options', () => {
      const info = schemaInfo(Joi.alternatives())
      expect(info.type).toBeNull()
    })
  })

  describe('recursive schemas (Joi.link)', () => {
    it('marks Joi.link as recursive', () => {
      const info = schemaInfo(Joi.link('#node'))
      expect(info.type).toBe('recursive')
    })

    it('marks self-reference inside an array as recursive', () => {
      const info = schemaInfo(
        Joi.object({
          name: Joi.string().required(),
          children: Joi.array().items(Joi.link('#node')).required(),
        }).id('node')
      ) as ObjectSchemaInfo
      expect(info.type).toBe('object')
      const children = info.fields.children as ArraySchemaInfo
      expect(children.type).toBe('array')
      expect(children.item.type).toBe('recursive')
    })
  })
})
