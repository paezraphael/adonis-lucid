/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/// <reference path="../../adonis-typings/index.ts" />

import test from 'japa'
import { schema } from '@adonisjs/validator/build/src/Schema'
import { validator } from '@adonisjs/validator/build/src/Validator'
import { extendValidator } from '../../src/Bindings/Validator'

import {
  getDb,
  setup,
  cleanup,
  resetTables,
} from '../../test-helpers'

let db: ReturnType<typeof getDb>

test.group('Validator | exists', (group) => {
  group.before(async () => {
    db = getDb()
    await setup()
    extendValidator(validator, db)
  })

  group.after(async () => {
    await cleanup()
    await db.manager.closeAll()
  })

  group.afterEach(async () => {
    await resetTables()
    db.connection().getReadClient().removeAllListeners()
  })

  test('must fail when row doesn\'t exists in the table', async (assert) => {
    assert.plan(1)

    try {
      await validator.validate({
        schema: validator.compile(schema.create({
          id: schema.number([validator.rules.exists({
            table: 'users',
            column: 'id',
          })]),
        })),
        data: { id: 1 },
      })
    } catch (error) {
      assert.deepEqual(error.messages, {
        id: ['exists validation failure'],
      })
    }
  })

  test('work fine when row exists', async (assert) => {
    assert.plan(2)

    const [userId] = await db
      .table('users')
      .returning('id')
      .insert({ email: 'virk@adonisjs.com', username: 'virk' })

    db.connection().getReadClient().on('query', ({ sql, bindings }) => {
      const { sql: knexSql, bindings: knexBindings } = db
        .connection()
        .getReadClient()
        .from('users')
        .where('id', userId)
        .limit(1)
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)
    })

    await validator.validate({
      schema: validator.compile(schema.create({
        id: schema.number([validator.rules.exists({
          table: 'users',
          column: 'id',
        })]),
      })),
      data: { id: userId },
    })
  })

  test('check row with custom where contraints', async (assert) => {
    assert.plan(3)

    const [userId] = await db
      .table('users')
      .returning('id')
      .insert({ email: 'virk@adonisjs.com', username: 'virk' })

    db.connection().getReadClient().on('query', ({ sql, bindings }) => {
      const { sql: knexSql, bindings: knexBindings } = db
        .connection()
        .getReadClient()
        .from('users')
        .where('id', userId)
        .where('username', 'nikk')
        .limit(1)
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)
    })

    try {
      await validator.validate({
        schema: validator.compile(schema.create({
          id: schema.number([validator.rules.exists({
            table: 'users',
            column: 'id',
            constraints: {
              username: 'nikk',
            },
          })]),
        })),
        data: { id: userId },
      })
    } catch (error) {
      assert.deepEqual(error.messages, {
        id: ['exists validation failure'],
      })
    }
  })

  test('check row with custom or where contraints', async (assert) => {
    assert.plan(3)

    const [userId] = await db
      .table('users')
      .returning('id')
      .insert({ email: 'virk@adonisjs.com', username: 'virk' })

    db.connection().getReadClient().on('query', ({ sql, bindings }) => {
      const { sql: knexSql, bindings: knexBindings } = db
        .connection()
        .getReadClient()
        .from('users')
        .where('id', userId)
        .where((builder) => {
          builder
            .orWhere({ username: 'nikk' })
            .orWhere({ username: 'virk', email: 'foo@bar.com' })
        })
        .limit(1)
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)
    })

    try {
      await validator.validate({
        schema: validator.compile(schema.create({
          id: schema.number([validator.rules.exists({
            table: 'users',
            column: 'id',
            constraints: [
              {
                username: 'nikk',
              },
              {
                username: 'virk',
                email: 'foo@bar.com',
              },
            ],
          })]),
        })),
        data: { id: userId },
      })
    } catch (error) {
      assert.deepEqual(error.messages, {
        id: ['exists validation failure'],
      })
    }
  })
})

test.group('Validator | unique', (group) => {
  group.before(async () => {
    db = getDb()
    await setup()
    extendValidator(validator, db)
  })

  group.after(async () => {
    await cleanup()
    await db.manager.closeAll()
  })

  group.afterEach(async () => {
    await resetTables()
    db.connection().getReadClient().removeAllListeners()
  })

  test('must fail when row already exists in the table', async (assert) => {
    assert.plan(1)

    const [userId] = await db
      .table('users')
      .returning('id')
      .insert({ email: 'virk@adonisjs.com', username: 'virk' })

    try {
      await validator.validate({
        schema: validator.compile(schema.create({
          id: schema.number([validator.rules.unique({
            table: 'users',
            column: 'id',
          })]),
        })),
        data: { id: userId },
      })
    } catch (error) {
      assert.deepEqual(error.messages, {
        id: ['unique validation failure'],
      })
    }
  })

  test('work fine when row is missing', async () => {
    await validator.validate({
      schema: validator.compile(schema.create({
        id: schema.number([validator.rules.unique({
          table: 'users',
          column: 'id',
        })]),
      })),
      data: { id: 1 },
    })
  })

  test('check row with custom where contraints', async (assert) => {
    assert.plan(3)

    const [userId] = await db
      .table('users')
      .returning('id')
      .insert({ email: 'virk@adonisjs.com', username: 'virk' })

    db.connection().getReadClient().on('query', ({ sql, bindings }) => {
      const { sql: knexSql, bindings: knexBindings } = db
        .connection()
        .getReadClient()
        .from('users')
        .where('id', userId)
        .where('username', 'virk')
        .limit(1)
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)
    })

    try {
      await validator.validate({
        schema: validator.compile(schema.create({
          id: schema.number([validator.rules.unique({
            table: 'users',
            column: 'id',
            constraints: {
              username: 'virk',
            },
          })]),
        })),
        data: { id: userId },
      })
    } catch (error) {
      assert.deepEqual(error.messages, {
        id: ['unique validation failure'],
      })
    }
  })

  test('check row with custom or where contraints', async (assert) => {
    assert.plan(3)

    const [userId] = await db
      .table('users')
      .returning('id')
      .insert({ email: 'virk@adonisjs.com', username: 'virk' })

    db.connection().getReadClient().on('query', ({ sql, bindings }) => {
      const { sql: knexSql, bindings: knexBindings } = db
        .connection()
        .getReadClient()
        .from('users')
        .where('id', userId)
        .where((builder) => {
          builder
            .orWhere({ username: 'nikk' })
            .orWhere({ username: 'virk', email: 'virk@adonisjs.com' })
        })
        .limit(1)
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)
    })

    try {
      await validator.validate({
        schema: validator.compile(schema.create({
          id: schema.number([validator.rules.unique({
            table: 'users',
            column: 'id',
            constraints: [
              {
                username: 'nikk',
              },
              {
                username: 'virk',
                email: 'virk@adonisjs.com',
              },
            ],
          })]),
        })),
        data: { id: userId },
      })
    } catch (error) {
      assert.deepEqual(error.messages, {
        id: ['unique validation failure'],
      })
    }
  })
})
