import { create } from 'zustand'

export type Segment = 'headline' | 'politics' | 'geopolitics' | 'finance'

export interface NewsArticle {
  id: string
  headline: string
  description: string
  source: string
  url: string
  publishedAt: string
  timeAgo: string
  segment: Segment
  country: string
  imageUrl?: string
}

export interface NewsBubble {
  countryCode: string
  lat: number
  lng: number
  segment: Segment
  headlinePreview: string
  color: string
}

interface AppState {
  selectedCountry: string | null
  selectedSegment: Segment
  drawerOpen: boolean
  articles: NewsArticle[]
  loading: boolean
  error: string | null
  bubbles: NewsBubble[]

  selectCountry: (code: string) => void
  setSegment: (s: Segment) => void
  closeDrawer: () => void
  fetchNews: (country: string, segment: Segment) => Promise<void>
  setBubbles: (b: NewsBubble[]) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  selectedCountry: null,
  selectedSegment: 'headline',
  drawerOpen: false,
  articles: [],
  loading: false,
  error: null,
  bubbles: [],

  selectCountry: (code) => {
    set({ selectedCountry: code, drawerOpen: true })
    get().fetchNews(code, get().selectedSegment)
  },

  setSegment: (s) => {
    set({ selectedSegment: s })
    const country = get().selectedCountry
    if (country) get().fetchNews(country, s)
  },

  closeDrawer: () => set({ drawerOpen: false, selectedCountry: null }),

  fetchNews: async (country, segment) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch(`/api/news?country=${country}&segment=${segment}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch')
      set({ articles: data.articles, loading: false })
    } catch (e) {
      set({ error: String(e), loading: false, articles: [] })
    }
  },

  setBubbles: (b) => set({ bubbles: b }),
}))
