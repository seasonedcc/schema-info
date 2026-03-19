import { describe, expect, it } from 'vitest'
import { schemaInfo } from './schema-info'

describe('schemaInfo', () => {
  it('returns null type when schema is undefined', () => {
    expect(schemaInfo()).toEqual({
      type: null,
      optional: false,
      nullable: false,
    })
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
