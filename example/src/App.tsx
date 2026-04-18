import { useEffect, useRef, useState } from 'react';

const DEFAULT_CODE = `//@version=5
indicator("Simple MA", overlay=true)

length = input.int(20, "Length")
sma = ta.sma(close, length)

plot(sma, "SMA", color.blue, linewidth=2)`;

const SYMBOLS = ['BTCUSDC', 'ETHUSDC', 'SOLUSDC', 'BNBUSDC'] as const;
const TIMEFRAMES = ['1', '5', '15', '60', 'D', 'W'] as const;

export default function App() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<QFChartInstance | null>(null);
  const indicatorRef = useRef<ReturnType<QFChartInstance['addIndicator']> | null>(null);
  const streamRef = useRef<PineTSStream | null>(null);

  const [code, setCode] = useState(DEFAULT_CODE);
  const [symbol, setSymbol] = useState<string>('BTCUSDC');
  const [timeframe, setTimeframe] = useState<string>('D');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [status, setStatus] = useState('');
  const [running, setRunning] = useState(false);

  useEffect(() => {
    const onResize = () => chartRef.current?.resize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  function stopStream() {
    if (streamRef.current) {
      try { streamRef.current.stop(); } catch { /* ignore */ }
      streamRef.current = null;
    }
  }

  function destroyChart() {
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
      indicatorRef.current = null;
    }
  }

  async function runIndicator() {
    if (!chartContainerRef.current) return;

    setRunning(true);
    setStatus('Connecting...');
    stopStream();
    destroyChart();

    const isOverlay = /indicator\([^)]*overlay\s*=\s*true/i.test(code);
    let initialized = false;

    try {
      const sDate = fromDate ? new Date(fromDate).getTime() : undefined;
      const eDate = toDate ? new Date(toDate).getTime() : undefined;
      const pineTS = new PineTS(PineTS.Provider.Binance, symbol, timeframe, 1000, sDate, eDate);
      const stream = pineTS.stream(code, { pageSize: 500, live: true, interval: 3000 });
      streamRef.current = stream;

      stream.on('data', (ctx) => {
        if (streamRef.current !== stream) return;

        if (!initialized) {
          initialized = true;

          const ohlcv: OHLCV[] = ctx.marketData.map((k) => ({
            time: k.openTime,
            open: k.open,
            high: k.high,
            low: k.low,
            close: k.close,
            volume: k.volume,
          }));

          chartContainerRef.current!.innerHTML = '';

          chartRef.current = new QFChart.QFChart(chartContainerRef.current!, {
            title: `${symbol} · ${timeframe}`,
            backgroundColor: '#0f172a',
            height: '100%',
            padding: 0.1,
            databox: { position: 'right', triggerOn: 'mousemove' },
            dataZoom: { visible: true, position: 'top', height: 6, start: 80, end: 101 },
            layout: { mainPaneHeight: '70%', gap: 5 },
            controls: { collapse: false, maximize: false, fullscreen: false },
          });

          chartRef.current.setMarketData(ohlcv);

          const plots = ctx.fullContext?.plots ?? ctx.plots;
          indicatorRef.current = chartRef.current.addIndicator('indicator', plots, {
            overlay: isOverlay,
            height: isOverlay ? undefined : 30,
            controls: { collapse: false, maximize: false },
          });

          chartRef.current.registerPlugin(new QFChart.MeasureTool());
          chartRef.current.registerPlugin(new QFChart.LineTool());
          chartRef.current.registerPlugin(new QFChart.FibonacciTool());

          setStatus(`${ohlcv.length} bars loaded`);
          setRunning(false);
        } else {
          if (indicatorRef.current && ctx.plots) {
            indicatorRef.current.updateData(ctx.plots);
          }
          const last = ctx.marketData[ctx.marketData.length - 1];
          chartRef.current?.updateData([{
            time: last.openTime,
            open: last.open,
            high: last.high,
            low: last.low,
            close: last.close,
            volume: last.volume,
          }]);
        }
      });

      stream.on('error', (err) => {
        setStatus(`Error: ${err.message}`);
        setRunning(false);
      });
    } catch (err) {
      setStatus(`Error: ${(err as Error).message}`);
      setRunning(false);
    }
  }

  useEffect(() => () => { stopStream(); destroyChart(); }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: 'monospace' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, padding: '8px 12px', background: '#1e293b', alignItems: 'center', flexShrink: 0 }}>
        <select value={symbol} onChange={(e) => setSymbol(e.target.value)} style={selectStyle}>
          {SYMBOLS.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)} style={selectStyle}>
          {TIMEFRAMES.map((t) => <option key={t}>{t}</option>)}
        </select>
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={dateStyle} title="From date" />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={dateStyle} title="To date" />
        <button onClick={runIndicator} disabled={running} style={btnStyle}>
          {running ? '...' : '▶ Run'}
        </button>
        {status && <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 8 }}>{status}</span>}
      </div>

      {/* Main area */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Code editor */}
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => { if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); runIndicator(); } }}
          spellCheck={false}
          style={{
            width: 320,
            flexShrink: 0,
            resize: 'none',
            background: '#1e293b',
            color: '#e2e8f0',
            border: 'none',
            borderRight: '1px solid #334155',
            padding: 12,
            fontFamily: 'monospace',
            fontSize: 13,
            lineHeight: 1.5,
            outline: 'none',
          }}
        />

        {/* Chart */}
        <div style={{ flex: 1, position: 'relative' }}>
          <div ref={chartContainerRef} style={{ width: '100%', height: '100%' }}>
            <p style={{ color: '#475569', textAlign: 'center', marginTop: '20%' }}>
              Press <b>▶ Run</b> or <b>Ctrl+Enter</b> to load the chart
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const dateStyle: React.CSSProperties = {
  background: '#1e293b',
  color: '#e2e8f0',
  border: '1px solid #334155',
  borderRadius: 4,
  padding: '4px 8px',
  fontSize: 13,
  colorScheme: 'dark',
};

const selectStyle: React.CSSProperties = {
  background: '#1e293b',
  color: '#e2e8f0',
  border: '1px solid #334155',
  borderRadius: 4,
  padding: '4px 8px',
  fontSize: 13,
};

const btnStyle: React.CSSProperties = {
  background: '#3b82f6',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  padding: '5px 16px',
  fontSize: 13,
  cursor: 'pointer',
};
