// journeyData.ts
import { JourneyData } from './schema'

// You: born 2004, Chicago until college, semester in London,
// Nanjing visits throughout, short NYC work stint junior year.

export const journeyData: JourneyData = {
  locations: [
    {
      id: 'nanjing',
      name: 'Nanjing',
      nameCn: '南京',
      type: 'family',
      // recurring visits, but we just bracket it
      period: { start: '2006-07-01', end: '2024-08-01' },
      intensity: 0.75,
      valence: 0.8,
      languageBalance: -0.7, // mostly Mandarin
      significance: 0.95,
      duration: 18,
      isVisit: true,
      color: '#ffb36a',
      memories: [
        {
          type: 'photo',
          content: 'Childhood courtyard photo, metal gate and laundry lines.',
          date: '2010-07-15',
          sentiment: 0.8,
          language: 'zh',
        },
        {
          type: 'receipt',
          content:
            'Breakfast shop receipt: youtiao + soy milk, tiny red characters.',
          date: '2016-08-03',
          sentiment: 0.9,
          language: 'zh',
        },
        {
          type: 'letter',
          content: 'Grandparent’s handwritten note tucked into a red envelope.',
          date: '2018-01-27',
          sentiment: 0.95,
          language: 'zh',
        },
        {
          type: 'document',
          content: 'Train ticket stub to Nanjing station, folded and creased.',
          date: '2023-07-11',
          sentiment: 0.7,
          language: 'mixed',
        },
      ],
    },

    {
      id: 'chicago',
      name: 'Chicago Suburbs',
      nameCn: '芝加哥郊区',
      type: 'origin',
      period: { start: '2004-01-01', end: '2022-08-15' },
      intensity: 0.8,
      valence: 0.2,
      languageBalance: 0.6, // mostly English, some Chinese at home
      significance: 0.9,
      duration: 18,
      isVisit: false,
      color: '#f0b46b',
      memories: [
        {
          type: 'receipt',
          content:
            'Costco receipt: bulk snacks for Lunar New Year party in the Midwest.',
          date: '2015-02-10',
          sentiment: 0.6,
          language: 'en',
        },
        {
          type: 'document',
          content:
            'High school chem notebook with doodled Chinese characters in margins.',
          date: '2020-10-01',
          sentiment: 0.4,
          language: 'en',
        },
        {
          type: 'photo',
          content: 'Snowy driveway photo, auntie’s hotpot steam on the window.',
          date: '2018-12-18',
          sentiment: 0.7,
          language: 'mixed',
        },
      ],
    },

    {
      id: 'boston',
      name: 'Boston – College',
      nameCn: '波士顿',
      type: 'education',
      period: { start: '2022-09-01', end: '2026-05-01' }, // undergrad window
      intensity: 0.95,
      valence: 0.7,
      languageBalance: 0.4,
      significance: 1.0,
      duration: 4,
      isVisit: false,
      color: '#9eb4ff',
      memories: [
        {
          type: 'photo',
          content: 'First studio wall covered in critique sticky notes.',
          date: '2022-10-15',
          sentiment: 0.9,
          language: 'en',
        },
        {
          type: 'receipt',
          content:
            'Chinatown receipt: dumplings + bubble tea after a long debug session.',
          date: '2023-03-28',
          sentiment: 0.85,
          language: 'mixed',
        },
        {
          type: 'document',
          content:
            'Printed problem set with thermodynamics scribbles and coffee stains.',
          date: '2023-11-05',
          sentiment: 0.6,
          language: 'en',
        },
      ],
    },

    {
      id: 'nyc',
      name: 'New York – Summer Job',
      nameCn: '纽约',
      type: 'work',
      period: { start: '2024-06-01', end: '2024-06-30' },
      intensity: 0.85,
      valence: 0.6,
      languageBalance: 0.3,
      significance: 0.75,
      duration: 0.08,
      isVisit: true,
      color: '#eabfff',
      memories: [
        {
          type: 'receipt',
          content: 'Bodega coffee and egg sandwich, crumpled in your backpack.',
          date: '2024-06-04',
          sentiment: 0.5,
          language: 'en',
        },
        {
          type: 'document',
          content:
            'Office access badge and lanyard, name slightly mispronounced.',
          date: '2024-06-10',
          sentiment: 0.6,
          language: 'en',
        },
        {
          type: 'photo',
          content:
            'Evening skyline from the subway bridge, phone reflection on the glass.',
          date: '2024-06-22',
          sentiment: 0.8,
          language: 'mixed',
        },
      ],
    },

    {
      id: 'london',
      name: 'London Semester',
      nameCn: '伦敦',
      type: 'visit',
      // one semester abroad during college
      period: { start: '2023-01-10', end: '2023-05-20' },
      intensity: 0.9,
      valence: 0.65,
      languageBalance: 0.9, // English, but more international mix
      significance: 0.8,
      duration: 0.4,
      isVisit: true,
      color: '#7dd5ff',
      memories: [
        {
          type: 'document',
          content:
            'Oyster card with leftover balance, taped into your sketchbook.',
          date: '2023-02-01',
          sentiment: 0.7,
          language: 'en',
        },
        {
          type: 'photo',
          content:
            'Rainy street photo outside a small gallery showing East Asian artists.',
          date: '2023-03-12',
          sentiment: 0.8,
          language: 'mixed',
        },
        {
          type: 'receipt',
          content:
            'Chinese takeaway receipt from a neighborhood shop, British pound signs and simplified characters.',
          date: '2023-04-05',
          sentiment: 0.6,
          language: 'mixed',
        },
      ],
    },
  ],

  connections: [
    // Chicago is the baseline hub
    { from: 'nanjing', to: 'chicago', weight: 0.9 }, // family vs home
    { from: 'chicago', to: 'boston', weight: 1.0 }, // home → college
    { from: 'boston', to: 'london', weight: 0.8 }, // semester abroad
    { from: 'boston', to: 'nyc', weight: 0.7 }, // work summer
    { from: 'nanjing', to: 'boston', weight: 0.6 }, // carrying roots into college
    { from: 'london', to: 'nyc', weight: 0.5 }, // big city echoes
  ],
}
