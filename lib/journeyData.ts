import { JourneyData } from './schema'

export const journeyData: JourneyData = {
  locations: [
    {
      id: 'chicago',
      name: 'Chicago',
      nameCn: '芝加哥',
      type: 'origin',
      period: { start: '2024-01-01' }, // using your provided date verbatim
      intensity: 0.85,
      valence: 0.7,
      languageBalance: 0.2, // mostly English, some Chinese context
      significance: 0.98,
      duration: 0.1,
      color: '#4169e1',
      notes: 'Birthplace per provided info.',
    },
    {
      id: 'nanjing',
      name: 'Nanjing',
      nameCn: '南京',
      type: 'visit',
      period: { start: '2019-01-01', end: '2019-02-01' }, // visit example
      intensity: 0.6,
      valence: 0.4,
      languageBalance: -0.9, // mostly Chinese
      significance: 0.6,
      duration: 0.1,
      isVisit: true,
      color: '#d4494e',
      notes: 'Family visit; cultural roots.',
    },
    {
      id: 'shanghai',
      name: 'Shanghai',
      nameCn: '上海',
      type: 'visit',
      period: { start: '2023-07-01', end: '2023-08-01' },
      intensity: 0.55,
      valence: 0.5,
      languageBalance: -0.7,
      significance: 0.5,
      duration: 0.08,
      isVisit: true,
      color: '#ff7f50',
      notes: 'Short family/cultural visit.',
    },
    {
      id: 'london',
      name: 'London',
      nameCn: '伦敦',
      type: 'education',
      period: { start: '2022-01-01', end: '2022-06-30' }, // half year
      intensity: 0.7,
      valence: 0.6,
      languageBalance: 0.7,
      significance: 0.75,
      duration: 0.5,
      color: '#9acd32',
      notes: 'Study abroad (half year).',
    },
    {
      id: 'boston',
      name: 'Boston',
      nameCn: '波士顿',
      type: 'present',
      period: { start: '2022-07-01', end: '2024-01-01' }, // 2022–2024
      intensity: 0.8,
      valence: 0.75,
      languageBalance: 0.85,
      significance: 0.9,
      duration: 1.5,
      color: '#20b2aa',
      notes: 'Design practice; narratives; 2022–2024.',
    },
    {
      id: 'newyork',
      name: 'New York',
      nameCn: '纽约',
      type: 'work',
      period: { start: '2024-01-01', end: '2024-06-30' }, // half year, early 2024
      intensity: 0.75,
      valence: 0.65,
      languageBalance: 0.9,
      significance: 0.8,
      duration: 0.5,
      color: '#9370db',
      notes: 'Half-year in early 2024.',
    },
  ],
  connections: [
    { from: 'london', to: 'boston', year: 2022, weight: 0.7 },
    { from: 'boston', to: 'newyork', year: 2024, weight: 0.8 },
    // visits (lightweight arcs)
    { from: 'boston', to: 'nanjing', year: 2023, weight: 0.3 },
    { from: 'boston', to: 'shanghai', year: 2023, weight: 0.3 },
    // origin anchor (if you want an arc from birth to first long stay)
    { from: 'chicago', to: 'london', year: 2022, weight: 0.5 },
  ],
}
