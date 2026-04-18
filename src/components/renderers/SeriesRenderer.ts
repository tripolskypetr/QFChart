import { IndicatorPlot, OHLCV } from '../../types';

export interface RenderContext {
    seriesName: string;
    xAxisIndex: number;
    yAxisIndex: number;
    dataArray: any[];
    colorArray: any[];
    optionsArray: any[];
    plotOptions: any;
    candlestickData?: OHLCV[]; // For shape positioning
    plotDataArrays?: Map<string, number[]>; // For fill plots
    indicatorId?: string;
    plotName?: string;
    indicator?: any; // Reference to parent indicator object if needed
    dataIndexOffset?: number; // Padding offset for converting bar_index to ECharts index
    timeToIndex?: Map<number, number>; // Map timestamp → real data index (for xloc.bar_time)
    marketData?: OHLCV[]; // Raw market data (for interpolating future timestamps)
}

export interface SeriesRenderer {
    render(context: RenderContext): any;
}

/**
 * Convert an x-coordinate from a drawing object to an ECharts padded bar index.
 * Handles both xloc modes:
 *   - 'bar_index' / 'bi': x is already a bar index, just add padding offset
 *   - 'bar_time' / 'bt': x is a timestamp, look up in timeToIndex or interpolate
 *
 * For future timestamps (beyond the last candle), extrapolates position using
 * the average bar duration from market data.
 *
 * Returns NaN if the coordinate cannot be resolved.
 */
export function resolveXCoord(
    x: number,
    xloc: string | undefined,
    offset: number,
    timeToIndex?: Map<number, number>,
    marketData?: OHLCV[],
): number {
    if (!xloc || xloc === 'bar_index' || xloc === 'bi') {
        return x + offset;
    }

    // xloc is 'bar_time' / 'bt' — x is a timestamp
    if (timeToIndex) {
        const idx = timeToIndex.get(x);
        if (idx !== undefined) {
            return idx + offset;
        }
    }

    // Timestamp not in the map — interpolate (likely a future timestamp)
    if (marketData && marketData.length >= 2) {
        const lastTime = marketData[marketData.length - 1].time;
        const lastIndex = marketData.length - 1;

        if (x > lastTime) {
            // Future timestamp: extrapolate using average bar duration
            // Use the last bar's interval as representative
            const prevTime = marketData[marketData.length - 2].time;
            const barDuration = lastTime - prevTime;
            if (barDuration > 0) {
                const barsAhead = (x - lastTime) / barDuration;
                return lastIndex + barsAhead + offset;
            }
        } else if (x < marketData[0].time) {
            // Past timestamp before data start: extrapolate backwards
            const firstTime = marketData[0].time;
            const secondTime = marketData[1].time;
            const barDuration = secondTime - firstTime;
            if (barDuration > 0) {
                const barsBehind = (firstTime - x) / barDuration;
                return 0 - barsBehind + offset;
            }
        } else {
            // Timestamp within data range but not an exact match — find nearest
            // Binary search for the closest bar
            let lo = 0, hi = marketData.length - 1;
            while (lo < hi) {
                const mid = (lo + hi) >> 1;
                if (marketData[mid].time < x) lo = mid + 1;
                else hi = mid;
            }
            // Interpolate between lo-1 and lo
            if (lo > 0) {
                const t0 = marketData[lo - 1].time;
                const t1 = marketData[lo].time;
                const frac = (x - t0) / (t1 - t0);
                return (lo - 1) + frac + offset;
            }
            return lo + offset;
        }
    }

    return NaN;
}
