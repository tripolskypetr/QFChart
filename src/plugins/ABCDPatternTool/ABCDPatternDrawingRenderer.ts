import { DrawingRenderer, DrawingRenderContext } from '../../types';

const LABELS = ['A', 'B', 'C', 'D'];
const LEG_COLORS = ['#2196f3', '#ff9800', '#4caf50'];

export class ABCDPatternDrawingRenderer implements DrawingRenderer {
    type = 'abcd_pattern';

    render(ctx: DrawingRenderContext): any {
        const { drawing, pixelPoints, isSelected } = ctx;
        const color = drawing.style?.color || '#3b82f6';
        if (pixelPoints.length < 2) return;

        const children: any[] = [];

        // Fill triangle ABC
        if (pixelPoints.length >= 3) {
            children.push({
                type: 'polygon',
                name: 'line',
                shape: { points: pixelPoints.slice(0, 3).map(([x, y]) => [x, y]) },
                style: { fill: 'rgba(33, 150, 243, 0.08)' },
            });
        }
        // Fill triangle BCD
        if (pixelPoints.length >= 4) {
            children.push({
                type: 'polygon',
                name: 'line',
                shape: { points: pixelPoints.slice(1, 4).map(([x, y]) => [x, y]) },
                style: { fill: 'rgba(244, 67, 54, 0.08)' },
            });
        }

        // Leg lines
        for (let i = 0; i < pixelPoints.length - 1; i++) {
            const [x1, y1] = pixelPoints[i];
            const [x2, y2] = pixelPoints[i + 1];
            children.push({
                type: 'line',
                name: 'line',
                shape: { x1, y1, x2, y2 },
                style: { stroke: LEG_COLORS[i % LEG_COLORS.length], lineWidth: drawing.style?.lineWidth || 2 },
            });
        }

        // Dashed connector A→C
        if (pixelPoints.length >= 3) {
            children.push({
                type: 'line',
                shape: { x1: pixelPoints[0][0], y1: pixelPoints[0][1], x2: pixelPoints[2][0], y2: pixelPoints[2][1] },
                style: { stroke: '#555', lineWidth: 1, lineDash: [4, 4] },
                silent: true,
            });
        }
        // Dashed connector B→D
        if (pixelPoints.length >= 4) {
            children.push({
                type: 'line',
                shape: { x1: pixelPoints[1][0], y1: pixelPoints[1][1], x2: pixelPoints[3][0], y2: pixelPoints[3][1] },
                style: { stroke: '#555', lineWidth: 1, lineDash: [4, 4] },
                silent: true,
            });
        }

        // Fibonacci ratios
        if (drawing.points.length >= 3) {
            const ab = Math.abs(drawing.points[1].value - drawing.points[0].value);
            const bc = Math.abs(drawing.points[2].value - drawing.points[1].value);
            if (ab !== 0) {
                const ratio = (bc / ab).toFixed(3);
                const mx = (pixelPoints[1][0] + pixelPoints[2][0]) / 2;
                const my = (pixelPoints[1][1] + pixelPoints[2][1]) / 2;
                children.push({ type: 'text', style: { text: ratio, x: mx + 8, y: my, fill: '#ff9800', fontSize: 10 }, silent: true });
            }
        }
        if (drawing.points.length >= 4) {
            const bc = Math.abs(drawing.points[2].value - drawing.points[1].value);
            const cd = Math.abs(drawing.points[3].value - drawing.points[2].value);
            if (bc !== 0) {
                const ratio = (cd / bc).toFixed(3);
                const mx = (pixelPoints[2][0] + pixelPoints[3][0]) / 2;
                const my = (pixelPoints[2][1] + pixelPoints[3][1]) / 2;
                children.push({ type: 'text', style: { text: ratio, x: mx + 8, y: my, fill: '#4caf50', fontSize: 10 }, silent: true });
            }
        }

        // Vertex labels
        for (let i = 0; i < pixelPoints.length && i < LABELS.length; i++) {
            const [px, py] = pixelPoints[i];
            const isHigh = (i === 0 || py <= pixelPoints[i - 1][1]) && (i === pixelPoints.length - 1 || py <= pixelPoints[i + 1]?.[1]);
            children.push({
                type: 'text',
                style: { text: LABELS[i], x: px, y: isHigh ? py - 14 : py + 16, fill: '#e2e8f0', fontSize: 12, fontWeight: 'bold', align: 'center', verticalAlign: 'middle' },
                silent: true,
            });
        }

        // Control points
        for (let i = 0; i < pixelPoints.length; i++) {
            children.push({
                type: 'circle',
                name: `point-${i}`,
                shape: { cx: pixelPoints[i][0], cy: pixelPoints[i][1], r: 4 },
                style: { fill: '#fff', stroke: color, lineWidth: 1, opacity: isSelected ? 1 : 0 },
                z: 100,
            });
        }

        return { type: 'group', children };
    }
}
