import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Calculator, ChartNoAxesColumnIncreasing, FileText, Lightbulb, Plus, Trash2, Pencil, ChevronDown, Info, Mail, CalendarDays, Target, ReceiptText } from 'lucide-react'
import { annualCost, calculate, days, euro, kinds, notice, number, removeCost, rhythms, validAmount } from './model.ts'
import type { Cost, Kind, Model, Rhythm } from './model.ts'
import { load, save } from './storage.ts'
import workplace from './workspace.webp'
import './style.css'

const navigation = [
  ['kalkulator', 'Kalkulator', Calculator],
  ['ergebnis', 'Ergebnis', ChartNoAxesColumnIncreasing],
  ['pdf-bericht', 'PDF-Bericht', FileText],
  ['tipps', 'Tipps & Insights', Lightbulb],
] as const
const periods = [['day', 'Kalendertag'], ['week', 'Woche'], ['month', 'Monat'], ['year', 'Jahr']] as const
const contact = 'mailto:hello@siga2021.com?subject=' + encodeURIComponent('Anfrage zur Unternehmensberatung')
  + '&body=' + encodeURIComponent('Hallo,\n\nich interessiere mich für eine individuelle Unternehmensberatung. Können wir einen Termin für ein erstes Gespräch vereinbaren?\n\nViele Grüße')

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
  return <li className="cost-row">
    <div className="cost-name">
      {editing && !cost.standard
        ? <input autoFocus aria-label="Bezeichnung" placeholder="Bezeichnung" value={cost.name} onChange={event => update({ name: event.target.value })} />
        : <strong>{name}</strong>}
      {editing && !cost.standard
        ? <select aria-label="Kostenart" value={cost.kind} onChange={event => update({ kind: event.target.value as Kind })}>
          {Object.entries(kinds).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
        : <span className="tag">{kinds[cost.kind]}</span>}
    </div>
    <div className="cost-fields">
      <Amount label={'Betrag für ' + name} value={cost.amount} onChange={amount => update({ amount })} />
      <select aria-label={'Zahlungsrhythmus für ' + name} value={cost.rhythm}
        onChange={event => update({ rhythm: event.target.value as Rhythm })}>
        {Object.entries(rhythms).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select>
    </div>
    <small>{euro(annualCost(cost, workdays) / 365)} pro Kalendertag</small>
    {!cost.standard && <div className="row-actions">
      <button className="button small" onClick={edit} aria-label={(editing ? 'Speichern: ' : 'Bearbeiten: ') + name}>
        {editing ? 'Speichern' : <Pencil size={16} />}
      </button>
      <button className="button small delete" onClick={remove} aria-label={'Löschen: ' + name}><Trash2 size={16} /></button>
    </div>}
  </li>
}

function App() {
  const [loaded] = useState(load)
  const [model, setModel] = useState(loaded.model)
  const [storageError, setStorageError] = useState(loaded.failed)
  const [editing, setEditing] = useState<string>()
  const [pending, setPending] = useState<Cost>()
  const dialog = useRef<HTMLDialogElement>(null)
  const customGroup = useRef<HTMLDetailsElement>(null)
  const addButton = useRef<HTMLButtonElement>(null)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState(false)
  const [section, setSection] = useState(() => window.location.hash.slice(1) || 'kalkulator')
  useEffect(() => {
    const onHash = () => setSection(window.location.hash.slice(1) || 'kalkulator')
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
    if (customGroup.current) customGroup.current.open = true
    setModel(current => ({ ...current, costs: [...current.costs,
      { id, name: '', kind: 'fixed', amount: 0, rhythm: 'month', standard: false }] }))
    setEditing(id)
  }
  function renderCost(cost: Cost) {
    return <CostRow key={cost.id} cost={cost} workdays={result.workdays}
      editing={editing === cost.id} edit={() => setEditing(editing === cost.id ? undefined : cost.id)}
      update={change => updateCost(cost.id, change)}
      remove={() => {
        setPending(cost)
        dialog.current?.showModal()
      }} />
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
  const customCosts = model.costs.filter(cost => !cost.standard)
  return <div className="shell">
    <header className="sidebar">
      <a href="#kalkulator" className="brand"><span><Calculator size={22} /></span><div>Business Kalkulator<small>BETRIEBSKOSTEN & GEWINN</small></div></a>
      <nav aria-label="Hauptnavigation">{navigation.map(([id, label, Icon]) =>
        <a key={id} href={'#' + id} aria-current={section === id ? 'location' : undefined}><Icon size={19} aria-hidden="true" /><span>{label}</span></a>)}</nav>
    </header>

    <main>
      <header className="hero" id="kalkulator">
        <div><p className="eyebrow">FINANZPLANUNG FÜR SELBSTSTÄNDIGE</p>
          <h1>Business Kalkulator</h1>
          <p>Erfasse deine Betriebskosten und finde heraus, welchen Umsatz du pro Arbeitstag für dein Gewinnziel brauchst.</p>
        </div>
        <img src={workplace} alt="" width="450" height="220" />
      </header>
      {storageError && <p role="alert">Lokale Daten konnten nicht geladen oder gespeichert werden.</p>}
      <div className="dashboard">
        <div className="inputs">
          <section className="panel setup" aria-label="Gewinnziel und Arbeitstage">
            <div><h2><Target size={19} aria-hidden="true" /> Gewünschter Gewinn</h2>
              <div className="goal"><Amount label="Gewinnziel in Euro" value={model.goal} onChange={goal => patch({ goal })} />
                <select aria-label="Zeitraum für das Gewinnziel" value={model.goalPeriod}
                  onChange={event => patch({ goalPeriod: event.target.value as Model['goalPeriod'] })}>
                  <option value="month">Pro Monat</option><option value="year">Pro Jahr</option>
                </select></div>
              <p>Überschuss nach Betriebskosten und vor nicht erfassten Ertragsteuern.</p>
            </div>
            <div><h2><CalendarDays size={19} aria-hidden="true" /> Arbeitstage pro Woche</h2>
              <div className="days" aria-label="Arbeitstage">
                {days.map((day, index) => {
                  const selected = model.days.includes(index)
                  return <button key={day} aria-label={day} aria-pressed={selected} disabled={selected && model.days.length === 1}
                    onClick={() => patch({ days: selected ? model.days.filter(value => value !== index) : [...model.days, index] })}>{day.slice(0, 2)}</button>
                })}
              </div><p>{model.days.length} pro Woche · Ø {number(result.workdays)} im Jahr</p>
            </div>
          </section>

          <section className="panel costs">
            <h2><ReceiptText size={20} aria-hidden="true" /> Betriebskosten</h2>
            <p>Erfasse jede Ausgabe einmal.</p>
            {(['fixed', 'variable'] as const).map(kind => <details key={kind} className="cost-group">
              <summary><strong>{kinds[kind]}</strong><ChevronDown size={18} aria-hidden="true" /></summary>
              <p className="hint"><Info size={16} aria-hidden="true" />{kind === 'fixed'
                ? 'Regelmäßige Kosten, die auch dann anfallen, wenn du keine Kunden hast.'
                : 'Kosten, die sich verändern, wenn du mehr oder weniger Leistungen erbringst.'}</p>
              <ul>{model.costs.filter(cost => cost.standard && cost.kind === kind).map(renderCost)}</ul>
            </details>)}
            <details className="cost-group" ref={customGroup}>
              <summary><strong>Eigene Kostenpositionen</strong><ChevronDown size={18} aria-hidden="true" /></summary>
              {customCosts.length ? <ul>{customCosts.map(renderCost)}</ul> : <p>Hier erscheinen deine zusätzlich erfassten Ausgaben.</p>}
            </details>
            <button ref={addButton} className="button add" onClick={addCost}><Plus size={18} aria-hidden="true" /> Kosten hinzufügen</button>
          </section>
          <a className="button primary evaluate" href="#ergebnis" onClick={() => document.getElementById('ergebnis')?.focus({ preventScroll: true })}>Meine Zahlen auswerten</a>
        </div>

        <div className="outputs">
          <section id="ergebnis" tabIndex={-1} className="results" aria-labelledby="result-title">
            <div className="total" aria-live="polite">
              <p className="eyebrow">DEIN UMSATZZIEL</p>
              <h2 id="result-title">Dein erforderlicher Mindestumsatz pro Arbeitstag</h2>
              <strong>{euro(result.revenue.workday)}</strong>
              <p>Diesen Betrag musst du im Schnitt pro Arbeitstag einnehmen, um deine Kosten zu decken und dein Gewinnziel zu erreichen.</p>
            </div>
            <div className="panel breakdown">
              <h2>So setzt sich dein Ziel zusammen</h2>
              <dl><div><dt>Gesamtkosten pro Arbeitstag</dt><dd>{euro(result.costs.workday)}</dd></div>
                <div><dt>Gewünschter Gewinn pro Arbeitstag</dt><dd>{euro(result.goal.workday)}</dd></div></dl>
            </div>
            <div className="panel breakdown periods">
              <h2>Kosten und Mindestumsatz</h2>
              <table><thead><tr><th scope="col">Zeitraum</th><th scope="col">Kosten</th><th scope="col">Mindestumsatz</th></tr></thead>
                <tbody>{periods.map(([key, label]) => <tr key={key}><th scope="row">{label}</th>
                  <td>{euro(result.costs[key])}</td><td>{key === 'day' ? '–' : euro(result.revenue[key])}</td></tr>)}</tbody></table>
              <p>Pro Jahr entfallen {euro(result.fixed)} auf Fixkosten und {euro(result.variable)} auf variable Kosten.</p>
              <details className="cost-group">
                <summary><strong>Gewinnziel nach Zeitraum</strong><ChevronDown size={18} aria-hidden="true" /></summary>
                <dl>{periods.slice(1).map(([key, label]) =>
                  <div key={key}><dt>Pro {label}</dt><dd>{euro(result.goal[key])}</dd></div>)}</dl>
              </details>
            </div>
          </section>

          <section id="pdf-bericht" className="panel export">
            <div><h2><FileText size={19} aria-hidden="true" /> PDF-Bericht</h2><p>Deine Kosten, Ziele und Ergebnisse zum Speichern.</p></div>
            <button className="button" onClick={download} disabled={exporting}>{exporting ? 'PDF wird erstellt …' : 'PDF erstellen'}</button>
            {exportError && <p role="alert">Das PDF konnte nicht erstellt werden. Versuche den Export erneut.</p>}
          </section>
        </div>
      </div>
      <section id="tipps" className="panel tips">
        <h2><Lightbulb size={19} aria-hidden="true" /> Tipps &amp; Insights</h2>
        <p>Prüfe regelmäßig, ob sich deine laufenden Ausgaben oder Arbeitstage geändert haben. Nutze das Umsatzziel als Orientierung, wenn du deine Preise und Abläufe überprüfst.</p>
        <p>{notice} Deine Eingaben werden in diesem Browser gespeichert.</p>
      </section>
    </main>

    <aside className="consultation">
      <div><Mail size={20} aria-hidden="true" /><h2>Beratung anfragen</h2>
        <p>Du möchtest deinen Umsatz gezielt steigern? Ich unterstütze dich gern mit einer individuellen Analyse.</p>
        <a href={contact}>hello@siga2021.com</a>
      </div>
    </aside>
    <dialog ref={dialog} aria-labelledby="delete-title" onClose={() => setPending(undefined)}>
      <h2 id="delete-title">Kostenposition wirklich löschen?</h2>
      <p>{pending?.name || 'Eigene Kostenposition'}</p>
      <form method="dialog">
        <button className="button" autoFocus>Abbrechen</button>
        <button className="button danger" onClick={() => {
          if (!pending) return
          setModel(current => removeCost(current, pending.id))
          if (editing === pending.id) setEditing(undefined)
          requestAnimationFrame(() => addButton.current?.focus())
        }}>Löschen</button>
      </form>
    </dialog>
  </div>
}

createRoot(document.getElementById('root')!).render(<App />)
