export type ThemeId = 'dark' | 'midnight' | 'oled' | 'crimson' | 'forest' | 'sunset'

type ThemeVars = {
  '--ink-900': string
  '--ink-800': string
  '--ink-700': string
  '--ink-600': string
  '--ink-300': string
  '--ink-200': string
  '--ink-100': string
  '--brand-400': string
  '--brand-500': string
  '--brand-600': string
}

export const THEMES: Record<ThemeId, { label: string; vars: ThemeVars }> = {
  dark: {
    label: 'داكن',
    vars: {
      '--ink-900': '10 10 11',
      '--ink-800': '20 20 22',
      '--ink-700': '32 32 36',
      '--ink-600': '52 52 58',
      '--ink-300': '154 154 168',
      '--ink-200': '208 208 220',
      '--ink-100': '236 236 244',
      '--brand-400': '249 115 22',
      '--brand-500': '234 88 12',
      '--brand-600': '194 65 12'
    }
  },
  midnight: {
    label: 'منتصف الليل',
    vars: {
      '--ink-900': '8 12 24',
      '--ink-800': '15 23 42',
      '--ink-700': '30 41 59',
      '--ink-600': '51 65 85',
      '--ink-300': '148 163 184',
      '--ink-200': '203 213 225',
      '--ink-100': '241 245 249',
      '--brand-400': '96 165 250',
      '--brand-500': '59 130 246',
      '--brand-600': '37 99 235'
    }
  },
  oled: {
    label: 'OLED أسود',
    vars: {
      '--ink-900': '0 0 0',
      '--ink-800': '10 10 10',
      '--ink-700': '20 20 20',
      '--ink-600': '40 40 40',
      '--ink-300': '156 156 156',
      '--ink-200': '212 212 212',
      '--ink-100': '245 245 245',
      '--brand-400': '249 115 22',
      '--brand-500': '234 88 12',
      '--brand-600': '194 65 12'
    }
  },
  crimson: {
    label: 'قرمزي',
    vars: {
      '--ink-900': '20 8 12',
      '--ink-800': '40 14 22',
      '--ink-700': '60 22 32',
      '--ink-600': '80 32 44',
      '--ink-300': '200 150 160',
      '--ink-200': '230 200 210',
      '--ink-100': '245 230 235',
      '--brand-400': '244 63 94',
      '--brand-500': '225 29 72',
      '--brand-600': '190 18 60'
    }
  },
  forest: {
    label: 'غابة',
    vars: {
      '--ink-900': '6 18 12',
      '--ink-800': '12 30 22',
      '--ink-700': '22 50 36',
      '--ink-600': '40 80 56',
      '--ink-300': '148 184 168',
      '--ink-200': '198 224 210',
      '--ink-100': '230 244 234',
      '--brand-400': '74 222 128',
      '--brand-500': '34 197 94',
      '--brand-600': '22 163 74'
    }
  },
  sunset: {
    label: 'غروب',
    vars: {
      '--ink-900': '24 12 8',
      '--ink-800': '42 22 14',
      '--ink-700': '62 34 22',
      '--ink-600': '88 52 34',
      '--ink-300': '212 168 138',
      '--ink-200': '234 204 178',
      '--ink-100': '248 232 218',
      '--brand-400': '251 191 36',
      '--brand-500': '245 158 11',
      '--brand-600': '217 119 6'
    }
  }
}

export function applyTheme(id: ThemeId) {
  const theme = THEMES[id] ?? THEMES.dark
  const root = document.documentElement
  for (const [k, v] of Object.entries(theme.vars)) {
    root.style.setProperty(k, v)
  }
}
