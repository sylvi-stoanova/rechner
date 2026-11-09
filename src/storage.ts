import { initial, restore } from './model.ts'
import type { Model } from './model.ts'

const key = 'betriebskostenrechner:v1'

export function load() {
  try {
    return { model: restore(JSON.parse(localStorage.getItem(key) ?? 'null')), failed: false }
  } catch {
    return { model: initial(), failed: true }
  }
}

export function save(model: Model) {
  try {
    localStorage.setItem(key, JSON.stringify(model))
    return true
  } catch {
    return false
  }
}