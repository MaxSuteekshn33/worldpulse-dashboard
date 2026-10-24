/**
 * The world's maritime chokepoints, as IMF PortWatch defines them.
 *
 * GENERATED from PortWatch's own chokepoints database — do not hand-edit.
 * Identity, position and what mostly moves through; how many ships went
 * through on a given day comes from `/api/chokepoints`, because that changes
 * daily and none of this does.
 *
 * Deliberately no country: these are international waters and PortWatch
 * leaves the field null for all 28, which is the correct answer rather than a
 * missing one.
 *
 * Deliberately no baseline either, though the source offers a
 * `vessel_count_total`. That field is cumulative over the whole dataset — 
 * 88,436 for the Taiwan Strait against about 224 ships on an actual day — so
 * reading it as "normal for a day" would overstate traffic by two orders of
 * magnitude. The comparison figure is computed from real daily history in the
 * route instead, where it also stays current.
 *
 * Source: IMF PortWatch (portwatch.imf.org), public ArcGIS endpoint, no key.
 */
export interface Chokepoint {
  /** PortWatch's own id, which the daily endpoint is keyed by. */
  id: string
  name: string
  lat: number
  lon: number
  /** The three industries that move through it most, in order. */
  carries: string[]
}

export const CHOKEPOINTS: Chokepoint[] = [
  {
    "id": "chokepoint4",
    "name": "Bab el-Mandeb Strait",
    "lat": 12.7886,
    "lon": 43.3495,
    "carries": [
      "Mineral Products",
      "Chemical & Allied Industries",
      "Vegetable Products"
    ]
  },
  {
    "id": "chokepoint25",
    "name": "Balabac Strait",
    "lat": 7.4136,
    "lon": 117.1146,
    "carries": []
  },
  {
    "id": "chokepoint26",
    "name": "Bering Strait",
    "lat": 65.9665,
    "lon": -165.5498,
    "carries": []
  },
  {
    "id": "chokepoint17",
    "name": "Bohai Strait",
    "lat": 38.373,
    "lon": 120.9,
    "carries": [
      "Mineral Products",
      "Metals",
      "Vegetable Products"
    ]
  },
  {
    "id": "chokepoint3",
    "name": "Bosporus Strait",
    "lat": 41.1693,
    "lon": 29.0915,
    "carries": [
      "Mineral Products",
      "Vegetable Products",
      "Chemical & Allied Industries"
    ]
  },
  {
    "id": "chokepoint7",
    "name": "Cape of Good Hope",
    "lat": -34.9273,
    "lon": 20.8827,
    "carries": [
      "Mineral Products",
      "Vegetable Products",
      "Prepared Foodstuffs & Beverages"
    ]
  },
  {
    "id": "chokepoint9",
    "name": "Dover Strait",
    "lat": 51.0302,
    "lon": 1.5058,
    "carries": [
      "Mineral Products",
      "Chemical & Allied Industries",
      "Vegetable Products"
    ]
  },
  {
    "id": "chokepoint8",
    "name": "Gibraltar Strait",
    "lat": 35.9423,
    "lon": -5.7549,
    "carries": [
      "Mineral Products",
      "Vegetable Products",
      "Chemical & Allied Industries"
    ]
  },
  {
    "id": "chokepoint28",
    "name": "Kerch Strait",
    "lat": 45.2668,
    "lon": 36.5439,
    "carries": []
  },
  {
    "id": "chokepoint12",
    "name": "Korea Strait",
    "lat": 34.1308,
    "lon": 129.2092,
    "carries": [
      "Mineral Products",
      "Vegetable Products",
      "Metals"
    ]
  },
  {
    "id": "chokepoint15",
    "name": "Lombok Strait",
    "lat": -8.4191,
    "lon": 115.8014,
    "carries": [
      "Mineral Products",
      "Vegetable Products",
      "Chemical & Allied Industries"
    ]
  },
  {
    "id": "chokepoint14",
    "name": "Luzon Strait",
    "lat": 20.4889,
    "lon": 121.3523,
    "carries": [
      "Mineral Products",
      "Vegetable Products",
      "Wood & Wood Products"
    ]
  },
  {
    "id": "chokepoint21",
    "name": "Magellan Strait",
    "lat": -52.6403,
    "lon": -69.5948,
    "carries": [
      "Mineral Products",
      "Vegetable Products",
      "Prepared Foodstuffs & Beverages"
    ]
  },
  {
    "id": "chokepoint20",
    "name": "Makassar Strait",
    "lat": 0.3523,
    "lon": 119.2571,
    "carries": [
      "Mineral Products",
      "Vegetable Products",
      "Prepared Foodstuffs & Beverages"
    ]
  },
  {
    "id": "chokepoint5",
    "name": "Malacca Strait",
    "lat": 1.517,
    "lon": 102.6651,
    "carries": [
      "Mineral Products",
      "Chemical & Allied Industries",
      "Vegetable Products"
    ]
  },
  {
    "id": "chokepoint27",
    "name": "Mindoro Strait",
    "lat": 12.4683,
    "lon": 120.4034,
    "carries": []
  },
  {
    "id": "chokepoint24",
    "name": "Mona Passage",
    "lat": 18.4487,
    "lon": -67.7114,
    "carries": [
      "Mineral Products",
      "Vegetable Products",
      "Chemical & Allied Industries"
    ]
  },
  {
    "id": "chokepoint16",
    "name": "Ombai Strait",
    "lat": -8.3985,
    "lon": 125.091,
    "carries": [
      "Mineral Products",
      "Chemical & Allied Industries",
      "Prepared Foodstuffs & Beverages"
    ]
  },
  {
    "id": "chokepoint10",
    "name": "Oresund Strait",
    "lat": 55.5078,
    "lon": 12.8508,
    "carries": [
      "Mineral Products",
      "Wood & Wood Products",
      "Chemical & Allied Industries"
    ]
  },
  {
    "id": "chokepoint2",
    "name": "Panama Canal",
    "lat": 9.1205,
    "lon": -79.7672,
    "carries": [
      "Mineral Products",
      "Vegetable Products",
      "Chemical & Allied Industries"
    ]
  },
  {
    "id": "chokepoint6",
    "name": "Strait of Hormuz",
    "lat": 26.2969,
    "lon": 56.8598,
    "carries": [
      "Mineral Products",
      "Chemical & Allied Industries",
      "Vegetable Products"
    ]
  },
  {
    "id": "chokepoint1",
    "name": "Suez Canal",
    "lat": 30.5933,
    "lon": 32.4369,
    "carries": [
      "Mineral Products",
      "Vegetable Products",
      "Chemical & Allied Industries"
    ]
  },
  {
    "id": "chokepoint19",
    "name": "Sunda Strait",
    "lat": -5.9668,
    "lon": 105.7752,
    "carries": [
      "Mineral Products",
      "Vegetable Products",
      "Prepared Foodstuffs & Beverages"
    ]
  },
  {
    "id": "chokepoint11",
    "name": "Taiwan Strait",
    "lat": 24.7235,
    "lon": 119.8314,
    "carries": [
      "Mineral Products",
      "Vegetable Products",
      "Chemical & Allied Industries"
    ]
  },
  {
    "id": "chokepoint18",
    "name": "Torres Strait",
    "lat": -9.8625,
    "lon": 142.2475,
    "carries": [
      "Mineral Products",
      "Vegetable Products",
      "Chemical & Allied Industries"
    ]
  },
  {
    "id": "chokepoint13",
    "name": "Tsugaru Strait",
    "lat": 41.328,
    "lon": 140.3533,
    "carries": [
      "Mineral Products",
      "Vegetable Products",
      "Metals"
    ]
  },
  {
    "id": "chokepoint23",
    "name": "Windward Passage",
    "lat": 19.9862,
    "lon": -73.6975,
    "carries": [
      "Mineral Products",
      "Vegetable Products",
      "Wood & Wood Products"
    ]
  },
  {
    "id": "chokepoint22",
    "name": "Yucatan Channel",
    "lat": 21.8153,
    "lon": -85.6473,
    "carries": [
      "Mineral Products",
      "Vegetable Products",
      "Chemical & Allied Industries"
    ]
  }
]
