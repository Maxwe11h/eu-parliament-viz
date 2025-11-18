# EU Parliament Visualizer

Interactive map and parliament composition visualization for selected European countries (France, Germany, Ireland, Italy, Portugal, Spain) spanning 1950-2025.

## Features
- Custom Europe SVG map with zoom
- Hemicycle parliament seat distribution grouped left-to-right (econ axis)
- Political parties table with counts and percentages
- 2D political spectrum scatter (econ vs social) sized by percentage
- Timeline slider for selecting year

## Getting Started

Install deps and run dev server:
```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Data
CSV files under `data/{country}` loaded server-side.

## Next Steps / Enhancements
- Improve seat allocation realism
- Add hover tooltips and legend
- Add story mode view
- Persist year & country in URL

## License
MIT (data may have its own licenses)
