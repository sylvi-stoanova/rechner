import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { LayoutDashboard, ReceiptText, Calculator, ChartNoAxesColumnIncreasing, Settings, Download, Plus, Trash2, Pencil, ArrowUpRight, CalendarDays, Target } from 'lucide-react'
import { annualCost, calculate, days, euro, kinds, notice, number, removeCost, rhythms, validAmount } from './model.ts'
import type { Cost, Kind, Model, Rhythm } from './model.ts'
import { load, save } from './storage.ts'
import './style.css'

const navigation = [
  ['uebersicht', 'Übersicht', LayoutDashboard],
  ['betriebskosten', 'Betriebskosten', ReceiptText],
  ['berechnung', 'Berechnung', Calculator],
  ['auswertung', 'Auswertung', ChartNoAxesColumnIncreasing],
  ['einstellungen', 'Einstellungen', Settings],
] as const
const periods = [['day', 'Kalendertag'], ['week', 'Woche'], ['month', 'Monat'], ['year', 'Jahr']] as const

function Amount({ value, onChange, label }: { value: number; onChange: (value: number) => void; label: string }) {
  const [draft, setDraft] = useState<string | null>(null)
  const display = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 20, useGrouping: false })
  return <div className="amount"><input aria-label={label} inputMode="decimal"
    value={draft ?? display.format(value)}
    onBlur={() => setDraft(null)}
    onChange={event => {
      const raw = event.target.value
      if (!/^\d*(?:[,.]\d*)?$/.test(raw)) return
      const parsed = Number(raw.replace(',', '.'))
      if (raw !== '' && raw !== ',' && raw !== '.' && !validAmount(parsed)) return
      setDraft(raw)
      onChange(validAmount(parsed) ? parsed : 0)
    }} /><span>€</span></div>
}

function CostRow({ cost, workdays, update, remove, editing, edit }: {
  cost: Cost; workdays: number; update: (change: Partial<Cost>) => void;
  remove: () => void; editing: boolean; edit: () => void
}) {
  const name = cost.name || 'Eigene Kostenposition'
  return <tr>
    <th scope="row"><div className="cost-name">{editing && !cost.standard
      ? <input aria-label="Bezeichnung" value={cost.name} onChange={event => update({ name: event.target.value })} />
      : name}</div></th>
    <td data-label="Kostenart">{editing && !cost.standard
      ? <select aria-label="Kostenart" value={cost.kind} onChange={event => update({ kind: event.target.value as Kind })}>
          {Object.entries(kinds).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      : <span className={'tag ' + cost.kind}>{kinds[cost.kind]}</span>}</td>
    <td data-label="Betrag"><Amount label={'Betrag für ' + name} value={cost.amount} onChange={amount => update({ amount })} /></td>
    <td data-label="Zahlungsrhythmus"><select aria-label={'Zahlungsrhythmus für ' + name} value={cost.rhythm}
      onChange={event => update({ rhythm: event.target.value as Rhythm })}>
      {Object.entries(rhythms).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
    </select></td>
    <td data-label="Pro Kalendertag" className="daily">{euro(annualCost(cost, workdays) / 365)}</td>
    <td className="row-actions">{!cost.standard && <>
      <button className="button small" onClick={edit} aria-label={(editing ? 'Speichern: ' : 'Bearbeiten: ') + name}>
        {editing ? 'Speichern' : <Pencil size={16} />}
      </button>
      <button className="button small delete" onClick={remove} aria-label={'Löschen: ' + name}><Trash2 size={16} /></button>
    </>}</td>
  </tr>
}

function App() {
  const [loaded] = useState(load)
  const [model, setModel] = useState(loaded.model)
  const [storageError, setStorageError] = useState(loaded.failed)
  const [editing, setEditing] = useState<string>()
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState(false)
  const [section, setSection] = useState(() => window.location.hash.slice(1) || 'uebersicht')
  useEffect(() => {
    const onHash = () => setSection(window.location.hash.slice(1) || 'uebersicht')
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  useEffect(() => {
    if (model !== loaded.model) setStorageError(!save(model))
  }, [model, loaded])
  const result = calculate(model)
  const patch = (changes: Partial<Model>) => setModel(current => ({ ...current, ...changes }))
  function updateCost(id: string, change: Partial<Cost>) {
    setModel(current => ({ ...current, costs: current.costs.map(cost => cost.id === id ? { ...cost, ...change } : cost) }))
  }
  function addCost() {
    const id = 'custom-' + crypto.randomUUID()
    setModel(current => ({ ...current, costs: [...current.costs,
      { id, name: '', kind: 'fixed', amount: 0, rhythm: 'month', standard: false }] }))
    setEditing(id)
  }
  async function download() {
    setExporting(true)
    setExportError(false)
    try {
      const { exportPdf } = await import('./pdf.ts')
      exportPdf(model)
    } catch {
      setExportError(true)
    } finally {
      setExporting(false)
    }
  }
  return <div className="shell">
    <aside className="sidebar">
      <a href="#uebersicht" className="brand"><span><Calculator size={22} /></span><div>Betriebskosten<span>RECHNER</span></div></a>
      <nav aria-label="Hauptnavigation">{navigation.map(([id, label, Icon]) =>
        <a key={id} href={'#' + id} aria-current={section === id ? 'location' : undefined}><Icon size={19} /><span>{label}</span></a>)}</nav>
      <div className="sidebar-note"><span className="dot" /> Lokale Kalkulation</div>
    </aside>
    <main>
      <section id="uebersicht">
        <header className="heading"><div><p className="eyebrow">FINANZÜBERSICHT</p><h1>Betriebskostenrechner</h1>
          <p>Was kostet dein Betrieb? Wie viel musst du pro Arbeitstag einnehmen?</p></div>
          <button className="button" onClick={download} disabled={exporting}><Download size={17} /> {exporting ? 'PDF wird erstellt …' : 'Kostenübersicht exportieren'}</button>
        </header>
        {exportError && <p role="alert">Das PDF konnte nicht erstellt werden. Versuche den Export erneut.</p>}
        {storageError && <p role="alert">Lokale Daten konnten nicht geladen oder gespeichert werden.</p>}
        <div className="metrics">{periods.map(([key, label]) =>
          <article key={key} className="panel metric"><CalendarDays size={19} /><p>Gesamtkosten pro {label}</p><strong>{euro(result.costs[key])}</strong></article>)}</div>
        <div className="equation" aria-live="polite">
          <article className="panel term"><p>Gesamtkosten pro Arbeitstag</p><strong>{euro(result.costs.workday)}</strong></article>
          <span className="operator" aria-hidden="true">+</span>
          <article className="panel term"><p>Gewünschter Gewinn pro Arbeitstag</p><strong>{euro(result.goal.workday)}</strong></article>
          <span className="operator" aria-hidden="true">=</span>
          <article className="total"><ArrowUpRight size={22} /><p>Erforderlicher Mindestumsatz pro Arbeitstag</p><strong>{euro(result.revenue.workday)}</strong></article>
        </div>
        <p className="explanation">Diesen Betrag musst du an einem Arbeitstag durchschnittlich einnehmen, um deine eingegebenen Betriebskosten zu decken und dein gewünschtes Gewinnziel zu erreichen.</p>
      </section>

      <section id="berechnung" className="panel calculation">
        <div><p className="eyebrow"><Target size={16} /> BERECHNUNG</p><h2>Wie viel Gewinn möchtest du erzielen?</h2>
          <div className="goal"><Amount label="Gewinnziel in Euro" value={model.goal} onChange={goal => patch({ goal })} />
            <select aria-label="Zeitraum für das Gewinnziel" value={model.goalPeriod}
              onChange={event => patch({ goalPeriod: event.target.value as Model['goalPeriod'] })}>
              <option value="month">Pro Monat</option><option value="year">Pro Jahr</option>
            </select></div>
          <p>Überschuss nach erfassten Betriebskosten, vor nicht erfassten Ertragsteuern.</p>
        </div>
        <div><h2>Arbeitstage pro Woche</h2><div className="days" aria-label="Arbeitstage">
          {days.map((day, index) => {
            const selected = model.days.includes(index)
            return <button key={day} aria-label={day} aria-pressed={selected} disabled={selected && model.days.length === 1}
              onClick={() => patch({ days: selected ? model.days.filter(value => value !== index) : [...model.days, index] })}>{day.slice(0, 2)}</button>
          })}
        </div><p>{model.days.length} pro Woche · Ø {number(result.workdays)} im Jahr</p></div>
      </section>

      <section id="betriebskosten" className="panel costs">
        <header><p className="eyebrow">KOSTENSTRUKTUR</p><h2>Betriebskosten</h2><p>Erfasse jede Ausgabe einmal. Bei variablen Kosten kannst du tatsächliche oder durchschnittliche Ausgaben eintragen.</p></header>
        <table><thead><tr><th>Kostenbezeichnung</th><th>Kostenart</th><th>Betrag</th><th>Zahlungsrhythmus</th><th>Pro Kalendertag</th><th>Bearbeiten</th></tr></thead>
          <tbody>{model.costs.map(cost => <CostRow key={cost.id} cost={cost} workdays={result.workdays}
            editing={editing === cost.id} edit={() => setEditing(editing === cost.id ? undefined : cost.id)}
            update={change => updateCost(cost.id, change)}
            remove={() => {
              if (window.confirm('Kostenposition „' + (cost.name || 'Eigene Kostenposition') + '“ löschen?')) {
                setModel(current => removeCost(current, cost.id))
              }
            }} />)}</tbody>
        </table>
        <button className="button add" onClick={addCost}><Plus size={18} /> Eigene Kostenposition hinzufügen</button>
      </section>

      <section id="auswertung" className="panel report">
        <p className="eyebrow">ZEITRÄUME IM VERGLEICH</p><h2>Auswertung</h2>
        <p>Pro Jahr entfallen {euro(result.fixed)} auf Fixkosten und {euro(result.variable)} auf variable Kosten.</p>
        <div className="report-grid">{periods.slice(1).map(([key, label]) => <article key={key}>
          <h3>Pro {label}</h3><p>Betriebskosten <strong>{euro(result.costs[key])}</strong></p>
          <p>Gewinnziel <strong>{euro(result.goal[key])}</strong></p>
          <p className="revenue">Erforderlicher Mindestumsatz <strong>{euro(result.revenue[key])}</strong></p>
        </article>)}</div>
      </section>
      <section id="einstellungen" className="panel settings">
        <p className="eyebrow">DATEN & KALKULATION</p><h2>Einstellungen</h2>
        <p>Deine Eingaben werden automatisch in diesem Browser gespeichert.</p>
        <p>{notice}</p>
      </section>
    </main>
  </div>
}

createRoot(document.getElementById('root')!).render(<App />)