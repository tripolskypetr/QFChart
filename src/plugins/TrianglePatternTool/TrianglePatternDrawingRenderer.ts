import { DrawingRenderer, DrawingRenderContext } from '../../types';

const LABELS = ['1', '2', '3', '4', '5'];

export class TrianglePatternDrawingRenderer implements DrawingRenderer {
    type = 'triangle_pattern';

    render(ctx: DrawingRenderContext): any {
        const { drawing, pixelPoints, isSelected } = ctx;
        const color = drawing.style?.color || '#3b82f6';
        if (pixelPoints.length < 2) return;

        const children: any[] = [];

        // Fill the triangle polygon with all points
        if (pixelPoints.length >= 3) {
            children.push({
                type: 'polygon',
                name: 'line',
                shape: { points: pixelPoints.map(([x, y]) => [x, y]) },
                style: { fill: 'rgba(156, 39, 176, 0.06)' },
            });
        }

        // Upper trendline: connect odd-indexed points (0, 2, 4) — highs
        const upperPts = pixelPoints.filter((_, i) => i % 2 === 0);
        if (upperPts.length >= 2) {
            for (let i = 0; i < upperPts.length - 1; i++) {
                children.push({
                    type: 'line', name: 'line',
                    shape: { x1: upperPts[i][0], y1: upperPts[i][1], x2: upperPts[i + 1][0], y2: upperPts[i + 1][1] },
                    style: { stroke: '#f44336', lineWidth: 2 },
                });
            }
            // Extend upper trendline
            if (upperPts.length >= 2) {
                const last = upperPts[upperPts.length - 1];
                const prev = upperPts[upperPts.length - 2];
                const dx = last[0] - prev[0];
                const dy = last[1] - prev[1];
                if (dx !== 0) {
                    const extendX = last[0] + dx * 0.5;
                    const extendY = last[1] + dy * 0.5;
                    children.push({
                        type: 'line',
                        shape: { x1: last[0], y1: last[1], x2: extendX, y2: extendY },
                        style: { stroke: '#f44336', lineWidth: 1, lineDash: [4, 4] },
                        silent: true,
                    });
                }
            }
        }

        // Lower trendline: connect even-indexed points (1, 3) — lows
        const lowerPts = pixelPoints.filter((_, i) => i % 2 === 1);
        if (lowerPts.length >= 2) {
            for (let i = 0; i < lowerPts.length - 1; i++) {
                children.push({
                    type: 'line', name: 'line',
                    shape: { x1: lowerPts[i][0], y1: lowerPts[i][1], x2: lowerPts[i + 1][0], y2: lowerPts[i + 1][1] },
                    style: { stroke: '#4caf50', lineWidth: 2 },
                });
            }
            // Extend lower trendline
            if (lowerPts.length >= 2) {
                const last = lowerPts[lowerPts.length - 1];
                const prev = lowerPts[lowerPts.length - 2];
                const dx = last[0] - prev[0];
                const dy = last[1] - prev[1];
                if (dx !== 0) {
                    const extendX = last[0] + dx * 0.5;
                    const extendY = last[1] + dy * 0.5;
                    children.push({
                        type: 'line',
                        shape: { x1: last[0], y1: last[1], x2: extendX, y2: extendY },
                        style: { stroke: '#4caf50', lineWidth: 1, lineDash: [4, 4] },
                        silent: true,
                    });
                }
            }
        }

        // Zigzag connecting all points
        for (let i = 0; i < pixelPoints.length - 1; i++) {
            children.push({
                type: 'line',
                shape: { x1: pixelPoints[i][0], y1: pixelPoints[i][1], x2: pixelPoints[i + 1][0], y2: pixelPoints[i + 1][1] },
                style: { stroke: '#9c27b0', lineWidth: 1, lineDash: [2, 2] },
                silent: true,
            });
        }

        // Labels
        for (let i = 0; i < pixelPoints.length && i < LABELS.length; i++) {
            const [px, py] = pixelPoints[i];
            const isHigh = i % 2 === 0;
            children.push({ type: 'text', style: { text: LABELS[i], x: px, y: isHigh ? py - 14 : py + 16, fill: '#e2e8f0', fontSize: 12, fontWeight: 'bold', align: 'center', verticalAlign: 'middle' }, silent: true });
        }

        // Control points
        for (let i = 0; i < pixelPoints.length; i++) {
            children.push({ type: 'circle', name: `point-${i}`, shape: { cx: pixelPoints[i][0], cy: pixelPoints[i][1], r: 4 }, style: { fill: '#fff', stroke: color, lineWidth: 1, opacity: isSelected ? 1 : 0 }, z: 100 });
        }

        return { type: 'group', children };
    }
}
