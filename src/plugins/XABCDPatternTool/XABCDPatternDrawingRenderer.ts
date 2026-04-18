import { DrawingRenderer, DrawingRenderContext } from '../../types';

const LABELS = ['X', 'A', 'B', 'C', 'D'];
const LEG_COLORS = ['#2196f3', '#ff9800', '#4caf50', '#f44336'];
const FILL_COLOR_1 = 'rgba(33, 150, 243, 0.08)';
const FILL_COLOR_2 = 'rgba(244, 67, 54, 0.08)';

export class XABCDPatternDrawingRenderer implements DrawingRenderer {
    type = 'xabcd_pattern';

    render(ctx: DrawingRenderContext): any {
        const { drawing, pixelPoints, isSelected } = ctx;
        const color = drawing.style?.color || '#3b82f6';

        if (pixelPoints.length < 2) return;

        const children: any[] = [];

        // Fill triangles XAB and BCD
        if (pixelPoints.length >= 3) {
            children.push({
                type: 'polygon',
                name: 'line',
                shape: {
                    points: pixelPoints.slice(0, 3).map(([x, y]) => [x, y]),
                },
                style: { fill: FILL_COLOR_1, opacity: 1 },
            });
        }
        if (pixelPoints.length >= 5) {
            children.push({
                type: 'polygon',
                name: 'line',
                shape: {
                    points: pixelPoints.slice(2, 5).map(([x, y]) => [x, y]),
                },
                style: { fill: FILL_COLOR_2, opacity: 1 },
            });
        }

        // Leg lines X→A→B→C→D
        for (let i = 0; i < pixelPoints.length - 1; i++) {
            const [x1, y1] = pixelPoints[i];
            const [x2, y2] = pixelPoints[i + 1];
            const legColor = LEG_COLORS[i % LEG_COLORS.length];

            children.push({
                type: 'line',
                name: 'line',
                shape: { x1, y1, x2, y2 },
                style: { stroke: legColor, lineWidth: drawing.style?.lineWidth || 2 },
            });
        }

        // Dashed connector lines: X→B, A→C, B→D (retrace references)
        const connectors: [number, number][] = [[0, 2], [1, 3], [2, 4]];
        for (const [from, to] of connectors) {
            if (from < pixelPoints.length && to < pixelPoints.length) {
                const [x1, y1] = pixelPoints[from];
                const [x2, y2] = pixelPoints[to];
                children.push({
                    type: 'line',
                    shape: { x1, y1, x2, y2 },
                    style: { stroke: '#555', lineWidth: 1, lineDash: [4, 4] },
                    silent: true,
                });
            }
        }

        // Fibonacci ratio labels on legs
        if (drawing.points.length >= 3) {
            // AB/XA ratio
            const xa = Math.abs(drawing.points[1].value - drawing.points[0].value);
            const ab = Math.abs(drawing.points[2].value - drawing.points[1].value);
            if (xa !== 0) {
                const ratio = (ab / xa).toFixed(3);
                const mx = (pixelPoints[1][0] + pixelPoints[2][0]) / 2;
                const my = (pixelPoints[1][1] + pixelPoints[2][1]) / 2;
                children.push({
                    type: 'text',
                    style: { text: ratio, x: mx + 8, y: my, fill: '#ff9800', fontSize: 10 },
                    silent: true,
                });
            }
        }
        if (drawing.points.length >= 4) {
            // BC/AB ratio
            const ab = Math.abs(drawing.points[2].value - drawing.points[1].value);
            const bc = Math.abs(drawing.points[3].value - drawing.points[2].value);
            if (ab !== 0) {
                const ratio = (bc / ab).toFixed(3);
                const mx = (pixelPoints[2][0] + pixelPoints[3][0]) / 2;
                const my = (pixelPoints[2][1] + pixelPoints[3][1]) / 2;
                children.push({
                    type: 'text',
                    style: { text: ratio, x: mx + 8, y: my, fill: '#4caf50', fontSize: 10 },
                    silent: true,
                });
            }
        }
        if (drawing.points.length >= 5) {
            // CD/BC ratio
            const bc = Math.abs(drawing.points[3].value - drawing.points[2].value);
            const cd = Math.abs(drawing.points[4].value - drawing.points[3].value);
            if (bc !== 0) {
                const ratio = (cd / bc).toFixed(3);
                const mx = (pixelPoints[3][0] + pixelPoints[4][0]) / 2;
                const my = (pixelPoints[3][1] + pixelPoints[4][1]) / 2;
                children.push({
                    type: 'text',
                    style: { text: ratio, x: mx + 8, y: my, fill: '#f44336', fontSize: 10 },
                    silent: true,
                });
            }

            // XA/AD ratio (overall retracement)
            const xa = Math.abs(drawing.points[1].value - drawing.points[0].value);
            const ad = Math.abs(drawing.points[4].value - drawing.points[1].value);
            if (xa !== 0) {
                const ratio = (ad / xa).toFixed(3);
                // Place near D point
                const [dx, dy] = pixelPoints[4];
                children.push({
                    type: 'text',
                    style: { text: `AD/XA: ${ratio}`, x: dx + 10, y: dy + 14, fill: '#aaa', fontSize: 9 },
                    silent: true,
                });
            }
        }

        // Vertex labels (X, A, B, C, D)
        for (let i = 0; i < pixelPoints.length && i < LABELS.length; i++) {
            const [px, py] = pixelPoints[i];
            // Place label above or below the point based on neighbors
            const isLocalHigh =
                (i === 0 || py <= pixelPoints[i - 1][1]) &&
                (i === pixelPoints.length - 1 || py <= pixelPoints[i + 1]?.[1]);
            const labelY = isLocalHigh ? py - 14 : py + 16;

            children.push({
                type: 'text',
                style: {
                    text: LABELS[i],
                    x: px,
                    y: labelY,
                    fill: '#e2e8f0',
                    fontSize: 12,
                    fontWeight: 'bold',
                    align: 'center',
                    verticalAlign: 'middle',
                },
                silent: true,
            });
        }

        // Control points
        for (let i = 0; i < pixelPoints.length; i++) {
            const [px, py] = pixelPoints[i];
            children.push({
                type: 'circle',
                name: `point-${i}`,
                shape: { cx: px, cy: py, r: 4 },
                style: {
                    fill: '#fff',
                    stroke: color,
                    lineWidth: 1,
                    opacity: isSelected ? 1 : 0,
                },
                z: 100,
            });
        }

        return {
            type: 'group',
            children,
        };
    }
}
