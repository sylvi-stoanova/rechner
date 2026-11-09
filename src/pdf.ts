import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import type { RowInput } from 'jspdf-autotable'
import { annualCost, calculate, euro, kinds, notice, rhythms } from './model.ts'
import type { Cost, Model } from './model.ts'

const green = '#15392d'
const ink = '#192e25'
const muted = '#52635a'
const gold = '#e4c78f'
const margin = 16
const width = 178

export function exportPdf(model: Model) {
  const pdf = new jsPDF({ format: 'a4' })
  const result = calculate(model)
  const date = new Date().toLocaleDateString('de-DE')
  const currency = (value: number) => euro(value).replace(/\s/g, ' ')
  const tableStyle = {
    margin: { left: margin, right: margin, top: 32, bottom: 20 },
    headStyles: { fillColor: green, textColor: '#fffefa' },
    alternateRowStyles: { fillColor: '#f6f4ed' },
    styles: { fontSize: 9, cellPadding: 2.6, textColor: ink },
  }
  function text(value: string, x: number, y: number, size: number, color = ink, bold = false) {
    pdf.setTextColor(color)
    pdf.setFont('helvetica', bold ? 'bold' : 'normal')
    pdf.setFontSize(size)
    pdf.text(value, x, y)
  }
  function paragraph(value: string, y: number) {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.setTextColor(muted)
    pdf.text(pdf.splitTextToSize(value, width), margin, y)
  }
  function section(title: string, subtitle: string) {
    text(title, margin, 44, 26, ink, true)
    paragraph(subtitle, 53)
  }

  section('Business Kalkulator', 'Dein Bericht zu Betriebskosten, Gewinnziel und Mindestumsatz')
  pdf.setFillColor(green)
  pdf.roundedRect(margin, 65, width, 42, 4, 4, 'F')
  text('ERFORDERLICHER MINDESTUMSATZ PRO ARBEITSTAG', 23, 78, 9, gold, true)
  text(currency(result.revenue.workday), 23, 96, 30, '#fffefa', true)
  autoTable(pdf, {
    ...tableStyle, startY: 118, head: [['Übersicht', 'Wert']],
    body: [
      ['Gesamtkosten pro Jahr', currency(result.costs.year)],
      ['Eingegebenes Gewinnziel', currency(model.goal) + (model.goalPeriod === 'month' ? ' pro Monat' : ' pro Jahr')],
      ['Gewinnziel pro Jahr', currency(result.goal.year)],
      ['Arbeitstage pro Woche', String(model.days.length)],
    ],
    columnStyles: { 1: { halign: 'right' } },
  })
  paragraph('Der Mindestumsatz zeigt, wie viel du im Durchschnitt einnehmen musst, um deine erfassten Betriebskosten zu decken und dein Gewinnziel zu erreichen.', 178)
  paragraph(notice, 199)

  pdf.addPage()
  const firstCostPage = pdf.getNumberOfPages()
  section('Betriebskosten', 'Alle erfassten Positionen mit Zahlungsrhythmus und Kostenanteil.')
  const rows: RowInput[] = []
  const groups: [string, Cost[]][] = [
    ['Fixkosten', model.costs.filter(cost => cost.standard && cost.kind === 'fixed')],
    ['Variable Kosten', model.costs.filter(cost => cost.standard && cost.kind === 'variable')],
    ['Eigene Kostenpositionen', model.costs.filter(cost => !cost.standard)],
  ]
  for (const [label, costs] of groups) {
    rows.push([{ content: label, colSpan: 5, styles: { fillColor: '#e7eee4', fontStyle: 'bold' } }])
    if (!costs.length) rows.push([{ content: 'Keine Positionen erfasst', colSpan: 5 }])
    for (const cost of costs) {
      rows.push([cost.name || 'Eigene Kostenposition', kinds[cost.kind], currency(cost.amount),
        rhythms[cost.rhythm], currency(annualCost(cost, result.workdays) / 365)])
    }
  }
  rows.push(
    [{ content: 'Fixkosten pro Jahr', colSpan: 3 }, { content: currency(result.fixed), colSpan: 2, styles: { halign: 'right' } }],
    [{ content: 'Variable Kosten pro Jahr', colSpan: 3 }, { content: currency(result.variable), colSpan: 2, styles: { halign: 'right' } }],
    [{ content: 'Gesamtkosten pro Jahr', colSpan: 3, styles: { fontStyle: 'bold' } },
      { content: currency(result.costs.year), colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } }],
  )
  autoTable(pdf, {
    ...tableStyle, startY: 61,
    head: [['Kostenposition', 'Kostenart', 'Betrag', 'Rhythmus', 'Pro Kalendertag']],
    body: rows, rowPageBreak: 'avoid',
    styles: { ...tableStyle.styles, fontSize: 8, cellPadding: 1.25 },
    columnStyles: { 0: { cellWidth: 65 }, 1: { cellWidth: 23 }, 2: { cellWidth: 27, halign: 'right' },
      3: { cellWidth: 31 }, 4: { cellWidth: 32, halign: 'right' } },
  })
  const lastCostPage = pdf.getNumberOfPages()

  pdf.addPage()
  section('Ergebnisse und Orientierung', 'So verteilen sich deine Kosten und dein Umsatzziel.')
  autoTable(pdf, {
    ...tableStyle, startY: 61, head: [['Zeitraum', 'Betriebskosten', 'Gewinnziel', 'Mindestumsatz']],
    body: [
      ['Arbeitstag', currency(result.costs.workday), currency(result.goal.workday), currency(result.revenue.workday)],
      ['Kalendertag', currency(result.costs.day), '-', '-'],
      ['Woche', currency(result.costs.week), currency(result.goal.week), currency(result.revenue.week)],
      ['Monat', currency(result.costs.month), currency(result.goal.month), currency(result.revenue.month)],
      ['Jahr', currency(result.costs.year), currency(result.goal.year), currency(result.revenue.year)],
    ],
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
  })
  text('Was bedeutet der Betrag pro Arbeitstag?', margin, 139, 13, ink, true)
  paragraph('Deine gesamten Betriebskosten und dein Gewinnziel werden auf die ausgewählten Arbeitstage verteilt. Die Summe ist dein erforderlicher Mindestumsatz pro Arbeitstag.', 148)
  text('Was du regelmäßig prüfen kannst', margin, 174, 13, ink, true)
  paragraph('Vergleiche deine Eingaben mit den aktuellen Ausgaben. Prüfe bei veränderten Kosten, ob Preise, Arbeitszeiten und Abläufe noch zu deinem Umsatzziel passen.', 183)
  text('Fragen zu deinen Ergebnissen?', margin, 220, 10, ink, true)
  text('hello@siga2021.com', margin, 227, 10, muted)
  pdf.link(margin, 223, 37, 5, { url: 'mailto:hello@siga2021.com' })

  const pages = pdf.getNumberOfPages()
  for (let page = 1; page <= pages; page++) {
    pdf.setPage(page)
    pdf.setDrawColor('#e4e4d9')
    pdf.line(margin, 25, 194, 25)
    pdf.line(margin, 279, 194, 279)
    text('BUSINESS KALKULATOR  /  FINANZBERICHT', margin, 20, 8, muted, true)
    text(date, 173, 20, 8, muted)
    const label = page === 1 ? 'Übersicht' : page <= lastCostPage ? 'Betriebskosten' : 'Ergebnisse und Orientierung'
    text(label, margin, 286, 8, muted)
    text(page + ' / ' + pages, 182, 286, 8, muted)
    if (page > firstCostPage && page <= lastCostPage) {
      text('Betriebskosten · Fortsetzung', margin, 30, 9, green, true)
    }
  }
  pdf.save('Kostenuebersicht.pdf')
}