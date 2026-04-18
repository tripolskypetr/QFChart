import { SeriesRenderer, RenderContext } from './SeriesRenderer';
import { ColorUtils } from '../../utils/ColorUtils';

/**
 * Configuration for a single fill band within a batched render.
 */
export interface BatchedFillEntry {
    plot1Data: (number | null)[];
    plot2Data: (number | null)[];
    barColors: { color: string; opacity: number }[];
}

export class FillRenderer implements SeriesRenderer {
    render(context: RenderContext): any {
        const { seriesName, xAxisIndex, yAxisIndex, plotOptions, plotDataArrays, indicatorId, plotName, optionsArray } = context;
        const totalDataLength = context.dataArray.length; // Use length from dataArray placeholder

        // Fill plots reference other plots to fill the area between them
        const plot1Key = plotOptions.plot1 ? `${indicatorId}::${plotOptions.plot1}` : null;
        const plot2Key = plotOptions.plot2 ? `${indicatorId}::${plotOptions.plot2}` : null;

        if (!plot1Key || !plot2Key) {
            console.warn(`Fill plot "${plotName}" missing plot1 or plot2 reference`);
            return null;
        }

        const plot1Data = plotDataArrays?.get(plot1Key);
        const plot2Data = plotDataArrays?.get(plot2Key);

        if (!plot1Data || !plot2Data) {
            console.warn(`Fill plot "${plotName}" references non-existent plots: ${plotOptions.plot1}, ${plotOptions.plot2}`);
            return null;
        }

        // Detect gradient fill mode
        const isGradient = plotOptions.gradient === true;

        if (isGradient) {
            return this.renderGradientFill(
                seriesName, xAxisIndex, yAxisIndex,
                plot1Data, plot2Data, totalDataLength,
                optionsArray, plotOptions
            );
        }

        // --- Simple fill (supports per-bar color when color is a series) ---
        const { color: defaultFillColor, opacity: defaultFillOpacity } = ColorUtils.parseColor(plotOptions.color || 'rgba(128, 128, 128, 0.2)');

        // Check if we have per-bar color data in optionsArray
        const hasPerBarColor = optionsArray?.some((o: any) => o && o.color !== undefined);

        // Pre-parse per-bar colors for efficiency
        let barColors: { color: string; opacity: number }[] | null = null;
        if (hasPerBarColor) {
            barColors = [];
            for (let i = 0; i < totalDataLength; i++) {
                const opts = optionsArray?.[i];
                if (opts && opts.color !== undefined) {
                    barColors[i] = ColorUtils.parseColor(opts.color);
                } else {
                    barColors[i] = { color: defaultFillColor, opacity: defaultFillOpacity };
                }
            }
        }

        // Create fill data with previous values for smooth polygon rendering
        const fillDataWithPrev: any[] = [];
        for (let i = 0; i < totalDataLength; i++) {
            const y1 = plot1Data[i];
            const y2 = plot2Data[i];
            const prevY1 = i > 0 ? plot1Data[i - 1] : null;
            const prevY2 = i > 0 ? plot2Data[i - 1] : null;

            fillDataWithPrev.push([i, y1, y2, prevY1, prevY2]);
        }

        return {
            name: seriesName,
            type: 'custom',
            xAxisIndex: xAxisIndex,
            yAxisIndex: yAxisIndex,
            z: 1,
            clip: true,
            encode: { x: 0 },
            animation: false,
            renderItem: (params: any, api: any) => {
                const index = params.dataIndex;
                if (index === 0) return null;

                const y1 = api.value(1);
                const y2 = api.value(2);
                const prevY1 = api.value(3);
                const prevY2 = api.value(4);

                if (
                    y1 === null || y2 === null || prevY1 === null || prevY2 === null ||
                    isNaN(y1) || isNaN(y2) || isNaN(prevY1) || isNaN(prevY2)
                ) {
                    return null;
                }

                const fc = barColors ? barColors[index] : null;

                // Skip fully transparent fills
                const fillOpacity = fc ? fc.opacity : defaultFillOpacity;
                if (fillOpacity < 0.01) return null;

                const fillColor = fc ? fc.color : defaultFillColor;

                // Check if plots cross between bars
                const diff1Prev = prevY1 - prevY2;
                const diff1Curr = y1 - y2;
                const plotsCross = (diff1Prev > 0 && diff1Curr < 0) || (diff1Prev < 0 && diff1Curr > 0);

                if (plotsCross) {
                    const t = diff1Prev / (diff1Prev - diff1Curr);
                    const crossX = index - 1 + t;
                    const crossY = prevY1 + t * (y1 - prevY1);
                    const pCross = api.coord([crossX, crossY]);
                    const p1Prev = api.coord([index - 1, prevY1]);
                    const p1Curr = api.coord([index, y1]);
                    const p2Curr = api.coord([index, y2]);
                    const p2Prev = api.coord([index - 1, prevY2]);

                    return {
                        type: 'group',
                        children: [
                            { type: 'polygon', shape: { points: [p1Prev, pCross, p2Prev] }, style: { fill: fillColor, opacity: fillOpacity }, silent: true },
                            { type: 'polygon', shape: { points: [pCross, p1Curr, p2Curr] }, style: { fill: fillColor, opacity: fillOpacity }, silent: true },
                        ],
                        silent: true,
                    };
                }

                const p1Prev = api.coord([index - 1, prevY1]);
                const p1Curr = api.coord([index, y1]);
                const p2Curr = api.coord([index, y2]);
                const p2Prev = api.coord([index - 1, prevY2]);

                return {
                    type: 'polygon',
                    shape: {
                        points: [p1Prev, p1Curr, p2Curr, p2Prev],
                    },
                    style: {
                        fill: fillColor,
                        opacity: fillOpacity,
                    },
                    silent: true,
                };
            },
            data: fillDataWithPrev,
            silent: true,
        };
    }

    /**
     * Batch-render multiple fill bands as a single ECharts custom series.
     * Instead of N separate series (one per fill), this creates ONE series
     * where each renderItem call draws all fill bands as a group of children.
     *
     * Performance: reduces series count from N to 1, eliminates per-series
     * ECharts overhead, and enables viewport culling via clip + encode.
     */
    renderBatched(
        seriesName: string,
        xAxisIndex: number,
        yAxisIndex: number,
        totalDataLength: number,
        fills: BatchedFillEntry[]
    ): any {
        // Simple index-only data for ECharts — encode: {x:0} enables dataZoom filtering
        const data = Array.from({ length: totalDataLength }, (_, i) => [i]);

        return {
            name: seriesName,
            type: 'custom',
            xAxisIndex,
            yAxisIndex,
            z: 1,
            clip: true,
            encode: { x: 0 },
            animation: false,
            renderItem: (params: any, api: any) => {
                const index = params.dataIndex;
                if (index === 0) return null;

                const children: any[] = [];

                for (let f = 0; f < fills.length; f++) {
                    const fill = fills[f];
                    const y1 = fill.plot1Data[index];
                    const y2 = fill.plot2Data[index];
                    const prevY1 = fill.plot1Data[index - 1];
                    const prevY2 = fill.plot2Data[index - 1];

                    if (
                        y1 == null || y2 == null || prevY1 == null || prevY2 == null ||
                        isNaN(y1 as number) || isNaN(y2 as number) ||
                        isNaN(prevY1 as number) || isNaN(prevY2 as number)
                    ) {
                        continue;
                    }

                    // Skip fully transparent fills
                    const fc = fill.barColors[index];
                    if (!fc || fc.opacity < 0.01) continue;

                    const fillStyle = { fill: fc.color, opacity: fc.opacity };

                    // Check if plots cross between bars
                    const dPrev = (prevY1 as number) - (prevY2 as number);
                    const dCurr = (y1 as number) - (y2 as number);
                    const crosses = (dPrev > 0 && dCurr < 0) || (dPrev < 0 && dCurr > 0);

                    if (crosses) {
                        const t = dPrev / (dPrev - dCurr);
                        const crossX = index - 1 + t;
                        const crossY = (prevY1 as number) + t * ((y1 as number) - (prevY1 as number));
                        const pCross = api.coord([crossX, crossY]);
                        const p1Prev = api.coord([index - 1, prevY1]);
                        const p1Curr = api.coord([index, y1]);
                        const p2Curr = api.coord([index, y2]);
                        const p2Prev = api.coord([index - 1, prevY2]);
                        children.push({ type: 'polygon', shape: { points: [p1Prev, pCross, p2Prev] }, style: fillStyle, silent: true });
                        children.push({ type: 'polygon', shape: { points: [pCross, p1Curr, p2Curr] }, style: fillStyle, silent: true });
                    } else {
                        const p1Prev = api.coord([index - 1, prevY1]);
                        const p1Curr = api.coord([index, y1]);
                        const p2Curr = api.coord([index, y2]);
                        const p2Prev = api.coord([index - 1, prevY2]);
                        children.push({
                            type: 'polygon',
                            shape: { points: [p1Prev, p1Curr, p2Curr, p2Prev] },
                            style: fillStyle,
                            silent: true,
                        });
                    }
                }

                return children.length > 0 ? { type: 'group', children, silent: true } : null;
            },
            data,
            silent: true,
        };
    }

    /**
     * Render a gradient fill between two plots.
     *
     * TradingView gradient fill semantics:
     * - The polygon is ALWAYS clipped to the area between plot1 and plot2
     * - top_value / bottom_value define the COLOR GRADIENT RANGE, not the polygon bounds
     * - top_color maps to top_value, bottom_color maps to bottom_value
     * - When top_color or bottom_color is na, that bar is hidden
     *
     * So the polygon shape uses plot1/plot2 data, but the gradient color ramp
     * is mapped based on where the plot values fall within [bottom_value, top_value].
     */
    private renderGradientFill(
        seriesName: string,
        xAxisIndex: number,
        yAxisIndex: number,
        plot1Data: (number | null)[],
        plot2Data: (number | null)[],
        totalDataLength: number,
        optionsArray: any[],
        plotOptions: any
    ): any {
        // Build per-bar gradient info
        interface GradientBar {
            topValue: number;       // Color gradient range top
            bottomValue: number;    // Color gradient range bottom
            topColor: string;
            topOpacity: number;
            bottomColor: string;
            bottomOpacity: number;
            topIsNa: boolean;
            btmIsNa: boolean;
        }
        const gradientBars: (GradientBar | null)[] = [];

        const isNaColor = (c: any): boolean => {
            if (c === null || c === undefined) return true;
            if (typeof c === 'number' && isNaN(c)) return true;
            if (c === 'na' || c === 'NaN' || c === '') return true;
            return false;
        };

        for (let i = 0; i < totalDataLength; i++) {
            const opts = optionsArray?.[i];
            if (opts && (opts.top_color !== undefined || opts.bottom_color !== undefined)) {
                const topIsNa = isNaColor(opts.top_color);
                const btmIsNa = isNaColor(opts.bottom_color);

                if (topIsNa && btmIsNa) {
                    gradientBars[i] = null;
                    continue;
                }

                const topC = topIsNa ? { color: 'rgba(0,0,0,0)', opacity: 0 } : ColorUtils.parseColor(opts.top_color);
                const btmC = btmIsNa ? { color: 'rgba(0,0,0,0)', opacity: 0 } : ColorUtils.parseColor(opts.bottom_color);

                const tv = opts.top_value;
                const bv = opts.bottom_value;
                const topVal = (tv == null || (typeof tv === 'number' && isNaN(tv))) ? null : tv;
                const btmVal = (bv == null || (typeof bv === 'number' && isNaN(bv))) ? null : bv;
                if (topVal == null || btmVal == null) {
                    gradientBars[i] = null;
                    continue;
                }

                gradientBars[i] = {
                    topValue: topVal,
                    bottomValue: btmVal,
                    topColor: topC.color,
                    topOpacity: topC.opacity,
                    bottomColor: btmC.color,
                    bottomOpacity: btmC.opacity,
                    topIsNa,
                    btmIsNa,
                };
            } else {
                gradientBars[i] = null;
            }
        }

        // Build fill data using PLOT values as polygon boundaries
        const fillData: any[] = [];
        for (let i = 0; i < totalDataLength; i++) {
            const y1 = plot1Data[i];
            const y2 = plot2Data[i];
            const prevY1 = i > 0 ? plot1Data[i - 1] : null;
            const prevY2 = i > 0 ? plot2Data[i - 1] : null;
            fillData.push([i, y1, y2, prevY1, prevY2]);
        }

        return {
            name: seriesName,
            type: 'custom',
            xAxisIndex: xAxisIndex,
            yAxisIndex: yAxisIndex,
            z: 1,
            clip: true,
            encode: { x: 0 },
            animation: false,
            renderItem: (params: any, api: any) => {
                const index = params.dataIndex;
                if (index === 0) return null;

                const y1 = api.value(1);
                const y2 = api.value(2);
                const prevY1 = api.value(3);
                const prevY2 = api.value(4);

                if (
                    y1 == null || y2 == null || prevY1 == null || prevY2 == null ||
                    isNaN(y1) || isNaN(y2) || isNaN(prevY1) || isNaN(prevY2)
                ) {
                    return null;
                }

                const gb = gradientBars[index];
                if (!gb) return null;

                const gradRange = gb.topValue - gb.bottomValue;
                const hasNaSide = gb.topIsNa || gb.btmIsNa;

                // Compute gradient color stops for the polygon's y-range
                const colorAtY = (yVal: number): string => {
                    let t: number;
                    if (Math.abs(gradRange) < 1e-10) { t = 0.5; }
                    else { t = 1 - (yVal - gb.bottomValue) / gradRange; }
                    t = Math.max(0, Math.min(1, t));

                    if (gb.topIsNa) {
                        return ColorUtils.toRgba(gb.bottomColor, gb.bottomOpacity * t);
                    }
                    if (gb.btmIsNa) {
                        return ColorUtils.toRgba(gb.topColor, gb.topOpacity * (1 - t));
                    }
                    return ColorUtils.interpolateColor(gb.topColor, gb.topOpacity, gb.bottomColor, gb.bottomOpacity, t);
                };

                // Build polygon between the two plot lines
                const p1Prev = api.coord([index - 1, prevY1]);
                const p1Curr = api.coord([index, y1]);
                const p2Curr = api.coord([index, y2]);
                const p2Prev = api.coord([index - 1, prevY2]);

                // Vertical gradient: top of polygon to bottom of polygon
                const polyTop = Math.max(y1, y2, prevY1, prevY2);
                const polyBot = Math.min(y1, y2, prevY1, prevY2);

                const polygon: any = {
                    type: 'polygon',
                    shape: { points: [p1Prev, p1Curr, p2Curr, p2Prev] },
                    style: {
                        fill: {
                            type: 'linear',
                            x: 0, y: 0, x2: 0, y2: 1,
                            colorStops: [
                                { offset: 0, color: colorAtY(polyTop) },
                                { offset: 1, color: colorAtY(polyBot) },
                            ],
                        },
                    },
                    silent: true,
                };

                // When one color is na, clip the polygon to only the valid side of plot2.
                if (hasNaSide) {
                    const cs = params.coordSys;
                    const zeroPixelPrev = api.coord([index - 1, prevY2])[1];
                    const zeroPixelCurr = api.coord([index, y2])[1];
                    // Use the average zero-line pixel position for this segment
                    const zeroPixelY = (zeroPixelPrev + zeroPixelCurr) / 2;

                    let clipY: number, clipH: number;
                    if (gb.btmIsNa) {
                        // Only draw above plot2
                        clipY = cs.y;
                        clipH = zeroPixelY - cs.y;
                    } else {
                        // Only draw below plot2
                        clipY = zeroPixelY;
                        clipH = cs.y + cs.height - zeroPixelY;
                    }

                    if (clipH <= 0) return null;

                    return {
                        type: 'group',
                        children: [polygon],
                        clipPath: {
                            type: 'rect',
                            shape: { x: cs.x, y: clipY, width: cs.width, height: clipH },
                        },
                        silent: true,
                    };
                }

                return polygon;
            },
            data: fillData,
            silent: true,
        };
    }

}
