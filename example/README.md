# QFChart React Example

A minimal React + TypeScript playground that demonstrates how to use [@qfo/qfchart](https://github.com/QuantForgeOrg/QFChart) together with [PineTS](https://github.com/QuantForgeOrg/PineTS) to run Pine Script indicators in the browser and display them on an interactive chart.

## Features

- Write Pine Script code in a built-in editor
- Select symbol (BTC, ETH, SOL, BNB) and timeframe
- Filter data by **From / To** date range
- Live streaming updates every 3 seconds via Binance
- Interactive chart with zoom, pan, drawing tools (MeasureTool, LineTool, FibonacciTool)
- Keyboard shortcut **Ctrl+Enter** to run

## Getting Started

```bash
cd react-app
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Project Structure

```
react-app/
├── public/
│   ├── echarts.min.js   # Apache ECharts (required by QFChart)
│   ├── qfchart.js       # @qfo/qfchart browser build
│   └── pinets.js        # PineTS browser build
├── src/
│   ├── App.tsx          # Main application component
│   ├── globals.d.ts     # TypeScript declarations for browser globals
│   └── main.tsx
└── index.html           # Loads the three scripts before the React bundle
```

## How It Works

QFChart and PineTS are loaded as browser globals via `<script>` tags in `index.html` (before the Vite module bundle). This is the simplest integration path — no bundler configuration needed for the chart or Pine runtime.

```tsx
// Create PineTS instance with optional date range
const pineTS = new PineTS(PineTS.Provider.Binance, symbol, timeframe, 1000, sDate, eDate);

// Start streaming — first 'data' event contains historical bars,
// subsequent events carry live updates
const stream = pineTS.stream(code, { pageSize: 500, live: true, interval: 3000 });

stream.on('data', (ctx) => {
  if (!initialized) {
    // Initialize chart with historical OHLCV data
    chart = new QFChart.QFChart(container, { ... });
    chart.setMarketData(ohlcv);
    chart.addIndicator('indicator', ctx.plots, { overlay });
  } else {
    // Live update — update last candle and indicator plots
    chart.updateData([lastBar]);
    indicator.updateData(ctx.plots);
  }
});
```

## PineTS Constructor

```ts
new PineTS(provider, symbol, timeframe, limit?, sDate?, eDate?)
```

| Parameter   | Type     | Description                              |
|-------------|----------|------------------------------------------|
| `provider`  | Provider | `PineTS.Provider.Binance` (or custom)    |
| `symbol`    | string   | e.g. `"BTCUSDC"`                         |
| `timeframe` | string   | `"1"`, `"5"`, `"60"`, `"D"`, `"W"`, ... |
| `limit`     | number   | Max number of bars to load               |
| `sDate`     | number   | Start date as Unix ms timestamp          |
| `eDate`     | number   | End date as Unix ms timestamp            |
