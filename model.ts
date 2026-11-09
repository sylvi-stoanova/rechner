export const rhythms = {
  calendar: 'Pro Kalendertag', workday: 'Pro Arbeitstag', week: 'Wöchentlich',
  month: 'Monatlich', year: 'Jährlich',
}
export type Rhythm = keyof typeof rhythms
export type Kind = 'fixed' | 'variable'
export const kinds = { fixed: 'Fixkosten', variable: 'Variable Kosten' }
export const days = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']

export type Cost = { id: string; name: string; kind: Kind; amount: number; rhythm: Rhythm; standard: boolean }
export type Model = { version: 1; costs: Cost[]; days: number[]; goal: number; goalPeriod: 'month' | 'year' }
const fixed = [
  'Miete / Pacht', 'Nebenkosten / Heizung', 'Strom und Wasser – regelmäßiger Grundbetrag',
  'Personal inklusive Arbeitgeberabgaben', 'Betriebliche Versicherungen', 'Buchhaltung / Steuerberatung',
  'Telefon / Internet', 'Software / Terminverwaltung', 'Geräte-Leasing / Finanzierung',
  'Gerätewartung / Service', 'Marketing / Werbung – festes Budget', 'Kammerbeiträge / Gebühren',
  'Reinigung – feste Grundkosten', 'Sonstige Fixkosten', 'Kalkulatorischer Unternehmerlohn',
]
const variable = [
  'Verbrauchsmaterial', 'Kosmetik- und Pflegeprodukte', 'Hygieneartikel / Einwegmaterial',
  'Wäsche / nutzungsabhängige Reinigung', 'Nutzungsabhängiger Energieverbrauch',
  'Kartenzahlungsgebühren', 'Variable Personalkosten / Provisionen', 'Fahrtkosten', 'Sonstige variable Kosten',
]
function standardCosts(names: string[], kind: Kind): Cost[] {
  return names.map((name, index) => ({
    id: kind + '-' + index, name, kind, amount: 0, rhythm: 'month', standard: true,
  }))
}
export function initial(): Model {
  return { version: 1, costs: [...standardCosts(fixed, 'fixed'), ...standardCosts(variable, 'variable')],
    days: [0, 1, 2, 3, 4], goal: 0, goalPeriod: 'month' }
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}
}
export function validAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER
}
function validRhythm(value: unknown): value is Rhythm {
  return typeof value === 'string' && Object.hasOwn(rhythms, value)
}
export function restore(input: unknown): Model {
  const model = initial()
  const data = record(input)
  if (data.version !== 1) return model
  const stored = Array.isArray(data.costs) ? data.costs.map(record) : []
  const byId = new Map(stored.map(cost => [cost.id, cost]))
  model.costs = model.costs.map(cost => {
    const saved = byId.get(cost.id)
    return { ...cost, amount: validAmount(saved?.amount) ? saved.amount : 0,
      rhythm: validRhythm(saved?.rhythm) ? saved.rhythm : cost.rhythm }
  })
  for (const [id, cost] of byId) {
    if (typeof id !== 'string' || !id.startsWith('custom-') || typeof cost.name !== 'string'
      || !validAmount(cost.amount) || !validRhythm(cost.rhythm)
      || (cost.kind !== 'fixed' && cost.kind !== 'variable')) continue
    model.costs.push({ id, name: cost.name, amount: cost.amount, rhythm: cost.rhythm, kind: cost.kind, standard: false })
  }
  const selected = Array.isArray(data.days) ? [...new Set(data.days.filter(day =>
    Number.isInteger(day) && day >= 0 && day <= 6))] : []
  if (selected.length) model.days = selected
  if (validAmount(data.goal)) model.goal = data.goal
  if (data.goalPeriod === 'year') model.goalPeriod = 'year'
  return model
}
export function removeCost(model: Model, id: string): Model {
  return { ...model, costs: model.costs.filter(cost => cost.standard || cost.id !== id) }
}

export function annualCost(cost: Cost, workdays: number) {
  const factors = { calendar: 365, workday: workdays, week: 365 / 7, month: 12, year: 1 }
  return cost.amount * factors[cost.rhythm]
}
export function calculate(model: Model) {
  const workdays = 365 * model.days.length / 7
  const fixed = model.costs.filter(cost => cost.kind === 'fixed').reduce((sum, cost) => sum + annualCost(cost, workdays), 0)
  const variable = model.costs.filter(cost => cost.kind === 'variable').reduce((sum, cost) => sum + annualCost(cost, workdays), 0)
  const goal = model.goal * (model.goalPeriod === 'month' ? 12 : 1)
  function periods(year: number) {
    return { year, month: year / 12, week: year * 7 / 365, day: year / 365, workday: year / workdays }
  }
  return { workdays, fixed, variable, costs: periods(fixed + variable), goal: periods(goal), revenue: periods(fixed + variable + goal) }
}
export const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format
export const number = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format
export const notice = 'Die Umsatzgrenze gilt bei vollständig erfassten Kosten und einer einheitlichen Netto- oder Bruttobasis. Die Berechnung ersetzt keine Steuerberatung.'