import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import { annualCost, calculate, euro, kinds, notice, rhythms } from './model.ts'
import type { Model } from './model.ts'

export function exportPdf(model: Model) {
  const pdf = new jsPDF()
  const result = calculate(model)
  const currency = (value: number) => euro(value).replace(/\s/g, ' ')
  const headStyles = { fillColor: '#305747' }
  pdf.setTextColor('#233d33')
  pdf.setFontSize(22)
  pdf.text('Kostenübersicht', 14, 20)
  pdf.setFontSize(10)
  pdf.text(new Date().toLocaleDateString('de-DE'), 14, 28)
  autoTable(pdf, {
    startY: 34, headStyles, head: [['Kennzahl', 'Wert']],
    body: [
      ['Arbeitstage pro Woche', String(model.days.length)],
      ['Eingegebenes Gewinnziel', currency(model.goal) + (model.goalPeriod === 'month' ? ' pro Monat' : ' pro Jahr')],
      ['Gesamtkosten pro Kalendertag', currency(result.costs.day)],
      ['Gesamtkosten pro Woche', currency(result.costs.week)],
      ['Gesamtkosten pro Monat', currency(result.costs.month)],
      ['Gesamtkosten pro Jahr', currency(result.costs.year)],
      ['Gesamtkosten pro Arbeitstag', currency(result.costs.workday)],
      ['Gewünschter Gewinn pro Arbeitstag', currency(result.goal.workday)],
      ['Erforderlicher Mindestumsatz pro Arbeitstag', currency(result.revenue.workday)],
      ['Erforderlicher Mindestumsatz pro Woche', currency(result.revenue.week)],
      ['Erforderlicher Mindestumsatz pro Monat', currency(result.revenue.month)],
      ['Erforderlicher Mindestumsatz pro Jahr', currency(result.revenue.year)],
    ],
  })
  autoTable(pdf, {
    headStyles, head: [['Kostenposition', 'Kostenart', 'Betrag', 'Rhythmus', 'Pro Kalendertag']],
    body: model.costs.map(cost => [cost.name || 'Eigene Kostenposition', kinds[cost.kind],
      currency(cost.amount), rhythms[cost.rhythm], currency(annualCost(cost, result.workdays) / 365)]),
    styles: { fontSize: 8 }, rowPageBreak: 'avoid',
  })
  autoTable(pdf, { body: [[notice]], theme: 'plain', styles: { fontSize: 9 }, rowPageBreak: 'avoid' })
  const pages = pdf.getNumberOfPages()
  for (let page = 1; page <= pages; page++) {
    pdf.setPage(page)
    pdf.setFontSize(8)
    pdf.text(page + ' / ' + pages, 196, 290, { align: 'right' })
  }
  pdf.save('Kostenuebersicht.pdf')
}