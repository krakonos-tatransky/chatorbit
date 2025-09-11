import test from 'node:test'
import assert from 'node:assert'
import { cn } from './cn'

test('cn merges class names', () => {
  assert.strictEqual(cn('p-2', 'm-2'), 'p-2 m-2')
})

test('cn resolves conflicts using tailwind-merge', () => {
  assert.strictEqual(cn('p-2', 'p-4'), 'p-4')
})
