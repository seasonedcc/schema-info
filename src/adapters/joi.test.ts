import Joi from 'joi'
import { describe, expect, it } from 'vitest'
import { schemaInfo } from '../schema-info'

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

  it('returns null for unsupported types', () => {
    expect(schemaInfo(Joi.object())).toEqual({
      type: null,
      optional: true,
      nullable: false,
    })
    expect(schemaInfo(Joi.array())).toEqual({
      type: null,
      optional: true,
      nullable: false,
    })
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
})
