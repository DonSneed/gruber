export interface ThemePreset {
  label: string
  bg: string
  text: string
}

export const THEME_PRESETS: ThemePreset[] = [
  { label: 'Forest', bg: '#232d23', text: '#f7f8e5' },
  { label: 'Maroon', bg: '#2E2424', text: '#f7f8e5' },
  { label: 'Plum', bg: '#2D242E', text: '#f7f8e5' },
  { label: 'Green', bg: '#5AAD5A', text: '#020202' },
  { label: 'Brick', bg: '#AD5D5A', text: '#020202' },
  { label: 'Bright green', bg: '#54C754', text: '#020202' },
]

export const DEFAULT_THEME = THEME_PRESETS[0]

export function textColorForBg(bg: string): string {
  const preset = THEME_PRESETS.find((p) => p.bg.toLowerCase() === bg.toLowerCase())
  return preset?.text ?? DEFAULT_THEME.text
}

export function applyTheme(bg: string | null | undefined) {
  const color = bg || DEFAULT_THEME.bg
  document.documentElement.style.setProperty('--color-page', color)
  document.documentElement.style.setProperty('--color-on-page', textColorForBg(color))
}