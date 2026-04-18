import { DrawingRenderer, DrawingRenderContext } from '../../types';

// Points: 0=start, 1=drive1, 2=correction1, 3=drive2, 4=correction2, 5=drive3, 6=end
const LABELS = ['0', 'D1', 'C1', 'D2', 'C2', 'D3', ''];
const LEG_COLORS = ['#2196f3', '#ff9800', '#4caf50', '#f44336', '#00bcd4', '#e91e63'];

export class ThreeDrivesPatternDrawingRenderer implements DrawingRenderer {
    type = 'three_drives_pattern';

    render(ctx: DrawingRenderContext): any {
        const { drawing, pixelPoints, isSelected } = ctx;
        const color = drawing.style?.color || '#3b82f6';
        if (pixelPoints.length < 2) return;

        const children: any[] = [];

        // Fill drive regions
        // Drive 1 zone (0,1,2)
        if (pixelPoints.length >= 3) {
            children.push({ type: 'polygon', name: 'line', shape: { points: pixelPoints.slice(0, 3).map(([x, y]) => [x, y]) }, style: { fill: 'rgba(33, 150, 243, 0.06)' } });
        }
        // Drive 2 zone (2,3,4)
        if (pixelPoints.length >= 5) {
            children.push({ type: 'polygon', name: 'line', shape: { points: pixelPoints.slice(2, 5).map(([x, y]) => [x, y]) }, style: { fill: 'rgba(76, 175, 80, 0.06)' } });
        }
        // Drive 3 zone (4,5,6)
        if (pixelPoints.length >= 7) {
            children.push({ type: 'polygon', name: 'line', shape: { points: pixelPoints.slice(4, 7).map(([x, y]) => [x, y]) }, style: { fill: 'rgba(0, 188, 212, 0.06)' } });
        }

        // Zigzag legs
        for (let i = 0; i < pixelPoints.length - 1; i++) {
            const [x1, y1] = pixelPoints[i];
            const [x2, y2] = pixelPoints[i + 1];
            children.push({
                type: 'line', name: 'line',
                shape: { x1, y1, x2, y2 },
                style: { stroke: LEG_COLORS[i % LEG_COLORS.length], lineWidth: drawing.style?.lineWidth || 2 },
            });
        }

        // Dashed lines connecting drives (1→3, 3→5) and corrections (2→4)
        const connectors: [number, number][] = [[1, 3], [3, 5], [2, 4]];
        for (const [from, to] of connectors) {
            if (from < pixelPoints.length && to < pixelPoints.length) {
                children.push({
                    type: 'line',
                    shape: { x1: pixelPoints[from][0], y1: pixelPoints[from][1], x2: pixelPoints[to][0], y2: pixelPoints[to][1] },
                    style: { stroke: '#555', lineWidth: 1, lineDash: [4, 4] },
                    silent: true,
                });
            }
        }

        // Ratios between drives
        const pts = drawing.points;
        // Drive2/Drive1
        if (pts.length >= 4) {
            const d1 = Math.abs(pts[1].value - pts[0].value);
            const d2 = Math.abs(pts[3].value - pts[2].value);
            if (d1 !== 0) {
                const r = (d2 / d1).toFixed(3);
                const mx = (pixelPoints[2][0] + pixelPoints[3][0]) / 2;
                const my = (pixelPoints[2][1] + pixelPoints[3][1]) / 2;
                children.push({ type: 'text', style: { text: `D2/D1: ${r}`, x: mx + 10, y: my, fill: '#4caf50', fontSize: 9 }, silent: true });
            }
        }
        // Drive3/Drive2
        if (pts.length >= 6) {
            const d2 = Math.abs(pts[3].value - pts[2].value);
            const d3 = Math.abs(pts[5].value - pts[4].value);
            if (d2 !== 0) {
                const r = (d3 / d2).toFixed(3);
                const mx = (pixelPoints[4][0] + pixelPoints[5][0]) / 2;
                const my = (pixelPoints[4][1] + pixelPoints[5][1]) / 2;
                children.push({ type: 'text', style: { text: `D3/D2: ${r}`, x: mx + 10, y: my, fill: '#00bcd4', fontSize: 9 }, silent: true });
            }
        }
        // Correction1/Drive1
        if (pts.length >= 3) {
            const d1 = Math.abs(pts[1].value - pts[0].value);
            const c1 = Math.abs(pts[2].value - pts[1].value);
            if (d1 !== 0) {
                const r = (c1 / d1).toFixed(3);
                const mx = (pixelPoints[1][0] + pixelPoints[2][0]) / 2;
                const my = (pixelPoints[1][1] + pixelPoints[2][1]) / 2;
                children.push({ type: 'text', style: { text: r, x: mx + 8, y: my, fill: '#ff9800', fontSize: 10 }, silent: true });
            }
        }

        // Labels
        for (let i = 0; i < pixelPoints.length && i < LABELS.length; i++) {
            if (!LABELS[i]) continue;
            const [px, py] = pixelPoints[i];
            const isHigh = (i === 0 || py <= pixelPoints[i - 1][1]) && (i === pixelPoints.length - 1 || py <= pixelPoints[i + 1]?.[1]);
            children.push({ type: 'text', style: { text: LABELS[i], x: px, y: isHigh ? py - 14 : py + 16, fill: '#e2e8f0', fontSize: 11, fontWeight: 'bold', align: 'center', verticalAlign: 'middle' }, silent: true });
        }

        // Control points
        for (let i = 0; i < pixelPoints.length; i++) {
            children.push({ type: 'circle', name: `point-${i}`, shape: { cx: pixelPoints[i][0], cy: pixelPoints[i][1], r: 4 }, style: { fill: '#fff', stroke: color, lineWidth: 1, opacity: isSelected ? 1 : 0 }, z: 100 });
        }

        return { type: 'group', children };
    }
}
