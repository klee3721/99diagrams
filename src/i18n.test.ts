import { describe, expect, it } from 'vitest'
import { isLanguage, languages, nextLanguage, translate, translations, type TranslationKey } from './i18n'

describe('i18n', () => {
  it('keeps translation keys aligned across languages', () => {
    const expected = Object.keys(translations.vi).sort()

    for (const language of languages) {
      expect(Object.keys(translations[language]).sort()).toEqual(expected)
    }
  })

  it('translates known keys and cycles languages', () => {
    const key: TranslationKey = 'topbar.new'

    expect(translate('vi', key)).toBe('Mới')
    expect(translate('en', key)).toBe('New')
    expect(nextLanguage('vi')).toBe('en')
    expect(nextLanguage('en')).toBe('vi')
    expect(isLanguage('vi')).toBe(true)
    expect(isLanguage('fr')).toBe(false)
  })

  it('keeps visible Vietnamese UI labels in Vietnamese', () => {
    expect(translate('vi', 'palette.process.label')).toBe('Xử lý')
    expect(translate('vi', 'palette.decision.label')).toBe('Điều kiện')
    expect(translate('vi', 'palette.database.label')).toBe('Cơ sở dữ liệu')
    expect(translate('vi', 'layers.heading')).toBe('Lớp')
    expect(translate('vi', 'outline.edges')).toBe('Đường nối')
    expect(translate('vi', 'demo.dialog')).toBe('Thư viện ví dụ')
    expect(translate('vi', 'toolbar.fitSelection')).toBe('Vừa phần chọn')
    expect(translate('vi', 'language.toggle')).toBe('Tiếng Anh')
  })

  it('interpolates values without hiding missing placeholders', () => {
    expect(translate('vi', 'status.copiedShapes', { count: 3 })).toBe('Đã sao chép 3 hình')
    expect(translate('en', 'status.openedFile', { name: 'demo.99diagrams.json' })).toBe('Opened demo.99diagrams.json')
    expect(translate('en', 'status.openedFile')).toBe('Opened {name}')
  })
})
