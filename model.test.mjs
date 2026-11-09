import test from 'node:test'
import assert from 'node:assert/strict'
import { annualCost, calculate, initial, removeCost, restore } from '../src/model.ts'

function example() {
  const model = initial()
  model.costs[0] = { ...model.costs[0], amount: 73000, rhythm: 'year' }
  return model
}
const rounded = value => Number(value.toFixed(2))

test('A: reine Kostendeckung', () => {
  const { costs, revenue } = calculate(example())
  assert.equal(costs.day, 200)
  assert.equal(costs.week, 1400)
  assert.equal(costs.workday, 280)
  assert.equal(revenue.workday, 280)
})
test('B: zusätzliches monatliches Gewinnziel', () => {
  const result = calculate({ ...example(), goal: 2000 })
  assert.equal(result.goal.year, 24000)
  assert.equal(result.revenue.year, 97000)
  assert.equal(rounded(result.revenue.month), 8083.33)
  assert.equal(rounded(result.revenue.workday), 372.05)
})
test('C: alle Mindestumsätze folgen dem erhöhten Gewinnziel', () => {
  const result = calculate({ ...example(), goal: 3000 }).revenue
  assert.equal(result.year, 109000)
  assert.equal(rounded(result.month), 9083.33)
  assert.equal(rounded(result.week), 2090.41)
  assert.equal(rounded(result.workday), 418.08)
})
test('D: sechs und sieben Arbeitstage', () => {
  const model = { ...example(), goal: 2000 }
  const six = calculate({ ...model, days: [0, 1, 2, 3, 4, 5] })
  const seven = calculate({ ...model, days: [0, 1, 2, 3, 4, 5, 6] })
  assert.equal(rounded(six.revenue.workday), 310.05)
  assert.equal(rounded(seven.revenue.workday), 265.75)
  assert.equal(seven.costs.workday, 200)
  assert.equal(six.revenue.year, seven.revenue.year)
})
const custom = { id: 'custom-device', name: 'Geräteversicherung', amount: 120, kind: 'fixed', rhythm: 'month', standard: false }
test('E: eigene monatliche Kosten', () => {
  const model = example()
  model.costs.push(custom)
  const result = calculate(model)
  assert.equal(result.costs.year, 74440)
  assert.equal(rounded(result.costs.month), 6203.33)
  assert.equal(rounded(result.costs.day), 203.95)
  assert.equal(rounded(result.revenue.workday), 285.52)
})
test('F: Standardkosten bleiben erhalten und eigene Positionen sind löschbar', () => {
  const model = initial()
  model.costs.push(custom)
  assert.deepEqual(removeCost(model, model.costs[0].id), model)
  assert.deepEqual(removeCost(model, custom.id), initial())
})
test('Alle Zahlungsrhythmen und jährliches Gewinnziel', () => {
  const workdays = 365 * 5 / 7
  assert.deepEqual(['calendar', 'workday', 'week', 'month', 'year'].map(rhythm =>
    annualCost({ ...custom, amount: 1, rhythm }, workdays)), [365, workdays, 365 / 7, 12, 1])
  assert.equal(calculate({ ...example(), goal: 24000, goalPeriod: 'year' }).revenue.year, 97000)
})
test('Gespeicherte Eingaben werden validiert und Standarddaten wiederhergestellt', () => {
  const model = { ...example(), days: [1, 2, 3], goal: 123, goalPeriod: 'year' }
  model.costs.push(custom)
  assert.deepEqual(restore(JSON.parse(JSON.stringify(model))), model)
  assert.deepEqual(restore({ version: 9 }), initial())
  const damaged = restore({ version: 1, costs: [{ ...model.costs[0], amount: -1, name: 'Geändert' }], days: [-1, 7], goal: Infinity })
  const expected = initial()
  expected.costs[0].rhythm = 'year'
  assert.deepEqual(damaged, expected)
})