import { DrawingRenderer, DrawingRenderContext } from '../../types';

const LABELS = ['X', 'A', 'B', 'C', 'D'];
const LEG_COLORS = ['#00bcd4', '#e91e63', '#8bc34a', '#ff5722'];

export class CypherPatternDrawingRenderer implements DrawingRenderer {
    type = 'cypher_pattern';

    render(ctx: DrawingRenderContext): any {
        const { drawing, pixelPoints, isSelected } = ctx;
        const color = drawing.style?.color || '#3b82f6';
        if (pixelPoints.length < 2) return;

        const children: any[] = [];

        // Fill triangles XAB and BCD
        if (pixelPoints.length >= 3) {
            children.push({ type: 'polygon', name: 'line', shape: { points: pixelPoints.slice(0, 3).map(([x, y]) => [x, y]) }, style: { fill: 'rgba(0, 188, 212, 0.08)' } });
        }
        if (pixelPoints.length >= 5) {
            children.push({ type: 'polygon', name: 'line', shape: { points: pixelPoints.slice(2, 5).map(([x, y]) => [x, y]) }, style: { fill: 'rgba(233, 30, 99, 0.08)' } });
        }

        // Legs
        for (let i = 0; i < pixelPoints.length - 1; i++) {
            const [x1, y1] = pixelPoints[i];
            const [x2, y2] = pixelPoints[i + 1];
            children.push({ type: 'line', name: 'line', shape: { x1, y1, x2, y2 }, style: { stroke: LEG_COLORS[i % LEG_COLORS.length], lineWidth: drawing.style?.lineWidth || 2 } });
        }

        // Dashed connectors X→B, X→C, A→D
        const connectors: [number, number][] = [[0, 2], [0, 3], [1, 4]];
        for (const [from, to] of connectors) {
            if (from < pixelPoints.length && to < pixelPoints.length) {
                children.push({ type: 'line', shape: { x1: pixelPoints[from][0], y1: pixelPoints[from][1], x2: pixelPoints[to][0], y2: pixelPoints[to][1] }, style: { stroke: '#555', lineWidth: 1, lineDash: [4, 4] }, silent: true });
            }
        }

        // Ratios
        const pts = drawing.points;
        if (pts.length >= 3) {
            const xa = Math.abs(pts[1].value - pts[0].value);
            const ab = Math.abs(pts[2].value - pts[1].value);
            if (xa !== 0) {
                const r = (ab / xa).toFixed(3);
                children.push({ type: 'text', style: { text: r, x: (pixelPoints[1][0] + pixelPoints[2][0]) / 2 + 8, y: (pixelPoints[1][1] + pixelPoints[2][1]) / 2, fill: '#e91e63', fontSize: 10 }, silent: true });
            }
        }
        if (pts.length >= 4) {
            const xa = Math.abs(pts[1].value - pts[0].value);
            const xc = Math.abs(pts[3].value - pts[0].value);
            if (xa !== 0) {
                const r = (xc / xa).toFixed(3);
                children.push({ type: 'text', style: { text: `XC/XA: ${r}`, x: (pixelPoints[0][0] + pixelPoints[3][0]) / 2 + 8, y: (pixelPoints[0][1] + pixelPoints[3][1]) / 2, fill: '#8bc34a', fontSize: 10 }, silent: true });
            }
        }
        if (pts.length >= 5) {
            const xc = Math.abs(pts[3].value - pts[0].value);
            const cd = Math.abs(pts[4].value - pts[3].value);
            if (xc !== 0) {
                const r = (cd / xc).toFixed(3);
                children.push({ type: 'text', style: { text: r, x: (pixelPoints[3][0] + pixelPoints[4][0]) / 2 + 8, y: (pixelPoints[3][1] + pixelPoints[4][1]) / 2, fill: '#ff5722', fontSize: 10 }, silent: true });
            }
        }

        // Labels
        for (let i = 0; i < pixelPoints.length && i < LABELS.length; i++) {
            const [px, py] = pixelPoints[i];
            const isHigh = (i === 0 || py <= pixelPoints[i - 1][1]) && (i === pixelPoints.length - 1 || py <= pixelPoints[i + 1]?.[1]);
            children.push({ type: 'text', style: { text: LABELS[i], x: px, y: isHigh ? py - 14 : py + 16, fill: '#e2e8f0', fontSize: 12, fontWeight: 'bold', align: 'center', verticalAlign: 'middle' }, silent: true });
        }

        // Control points
        for (let i = 0; i < pixelPoints.length; i++) {
            children.push({ type: 'circle', name: `point-${i}`, shape: { cx: pixelPoints[i][0], cy: pixelPoints[i][1], r: 4 }, style: { fill: '#fff', stroke: color, lineWidth: 1, opacity: isSelected ? 1 : 0 }, z: 100 });
        }

        return { type: 'group', children };
    }
}
