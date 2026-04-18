import { SeriesRenderer, RenderContext } from './SeriesRenderer';
import { textToBase64Image } from '../../utils/CanvasUtils';

export class ScatterRenderer implements SeriesRenderer {
    render(context: RenderContext): any {
        const { seriesName, xAxisIndex, yAxisIndex, dataArray, colorArray, plotOptions } = context;
        const defaultColor = '#2962ff';
        const style = plotOptions.style; // 'circles', 'cross', 'char'

        // plotchar: render the Unicode character at the data point
        if (style === 'char') {
            const { optionsArray, candlestickData } = context;
            const defaultChar = plotOptions.char || '•';
            const defaultLocation = plotOptions.location || 'abovebar';

            const charData = dataArray
                .map((val, i) => {
                    if (val === null || val === undefined || (typeof val === 'number' && isNaN(val))) return null;

                    const pointOpts = optionsArray?.[i] || {};
                    const char = pointOpts.char || defaultChar;
                    const color = pointOpts.color || colorArray[i] || plotOptions.color || defaultColor;
                    const location = pointOpts.location || defaultLocation;
                    const size = pointOpts.size || plotOptions.size || 'normal';

                    // Positioning based on location
                    let yValue = val;
                    let symbolOffset: (string | number)[] = [0, 0];

                    if (location === 'abovebar' || location === 'AboveBar' || location === 'ab') {
                        if (candlestickData && candlestickData[i]) yValue = candlestickData[i].high;
                        symbolOffset = [0, '-150%'];
                    } else if (location === 'belowbar' || location === 'BelowBar' || location === 'bl') {
                        if (candlestickData && candlestickData[i]) yValue = candlestickData[i].low;
                        symbolOffset = [0, '150%'];
                    }
                    // absolute / top / bottom: yValue stays as-is

                    // Size mapping — matches TradingView's plotchar sizing
                    const sizeMap: Record<string, string> = {
                        tiny: '18px', small: '26px', normal: '34px', large: '42px', huge: '54px', auto: '28px',
                    };
                    const fontSize = sizeMap[size] || '34px';

                    return {
                        value: [i, yValue],
                        symbol: `image://${textToBase64Image(char, color, fontSize)}`,
                        symbolSize: parseInt(fontSize) + 8,
                        symbolOffset: symbolOffset,
                    };
                })
                .filter((item) => item !== null);

            return {
                name: seriesName,
                type: 'scatter',
                xAxisIndex: xAxisIndex,
                yAxisIndex: yAxisIndex,
                z: 10, // Render in front of candles
                data: charData,
            };
        }

        const scatterData = dataArray
            .map((val, i) => {
                if (val === null) return null;
                const pointColor = colorArray[i] || plotOptions.color || defaultColor;
                const item: any = {
                    value: [i, val],
                    itemStyle: { color: pointColor },
                };

                if (style === 'cross') {
                    item.symbol = `image://${textToBase64Image('+', pointColor, '24px')}`;
                    item.symbolSize = 16;
                } else {
                    item.symbol = 'circle';
                    item.symbolSize = 6;
                }
                return item;
            })
            .filter((item) => item !== null);

        return {
            name: seriesName,
            type: 'scatter',
            xAxisIndex: xAxisIndex,
            yAxisIndex: yAxisIndex,
            data: scatterData,
        };
    }
}
