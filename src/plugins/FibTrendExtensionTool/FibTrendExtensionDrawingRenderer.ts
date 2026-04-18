import { DrawingRenderer, DrawingRenderContext } from '../../types';

const LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.272, 1.618, 2, 2.618];
const COLORS = [
    '#787b86', '#f44336', '#ff9800', '#4caf50', '#2196f3',
    '#00bcd4', '#787b86', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5',
];

export class FibTrendExtensionDrawingRenderer implements DrawingRenderer {
    type = 'fib_trend_extension';

    render(ctx: DrawingRenderContext): any {
        const { drawing, pixelPoints, isSelected, api } = ctx;
        const color = drawing.style?.color || '#3b82f6';
        if (pixelPoints.length < 3) return;

        const [x1, y1] = pixelPoints[0]; // Trend start
        const [x2, y2] = pixelPoints[1]; // Trend end
        const [x3, y3] = pixelPoints[2]; // Retracement point

        const pts = drawing.points;
        const trendMove = pts[1].value - pts[0].value; // Signed price move

        // Horizontal extent: from min(x1,x2,x3) to max(x1,x2,x3) + extra width
        const minX = Math.min(x1, x2, x3);
        const maxX = Math.max(x1, x2, x3);
        const extraWidth = (maxX - minX) * 0.5;
        const lineLeft = minX;
        const lineRight = maxX + extraWidth;

        const children: any[] = [];

        // Compute all extension level Y positions
        const levelData: { level: number; y: number; price: number; color: string }[] = [];
        for (let i = 0; i < LEVELS.length; i++) {
            const level = LEVELS[i];
            const price = pts[2].value + trendMove * level;
            // Convert price to pixel Y using the api
            // We use the retracement point's x as reference for coord lookup
            const pxCoord = api.coord([
                pts[2].timeIndex + (ctx as any).drawing.points[2].timeIndex - pts[2].timeIndex,
                price,
            ]);
            // Actually, we can compute Y directly: the relationship between y3 and the
            // trend pixel distance gives us the scale.
            // trendMove maps to (y2 - y1) in pixels (inverted because Y axis is flipped)
            // So for a given level: pixelY = y3 - (y2 - y1) * level
            const py = y3 + (y2 - y1) * level;

            levelData.push({ level, y: py, price, color: COLORS[i % COLORS.length] });
        }

        // Fill zones between adjacent levels
        for (let i = 0; i < levelData.length - 1; i++) {
            const curr = levelData[i];
            const next = levelData[i + 1];
            const rectY = Math.min(curr.y, next.y);
            const rectH = Math.abs(next.y - curr.y);

            children.push({
                type: 'rect',
                name: 'line',
                shape: { x: lineLeft, y: rectY, width: lineRight - lineLeft, height: rectH },
                style: { fill: next.color, opacity: 0.06 },
            });
        }

        // Level lines and labels
        for (const ld of levelData) {
            children.push({
                type: 'line',
                shape: { x1: lineLeft, y1: ld.y, x2: lineRight, y2: ld.y },
                style: { stroke: ld.color, lineWidth: 1 },
                silent: true,
            });

            children.push({
                type: 'text',
                style: {
                    text: `${ld.level} (${ld.price.toFixed(2)})`,
                    x: lineRight + 4,
                    y: ld.y - 6,
                    fill: ld.color,
                    fontSize: 9,
                },
                silent: true,
            });
        }

        // Trend line (click1 → click2) dashed
        children.push({
            type: 'line',
            name: 'line',
            shape: { x1, y1, x2, y2 },
            style: { stroke: '#2196f3', lineWidth: 1.5, lineDash: [5, 4] },
        });

        // Retracement line (click2 → click3) dashed
        children.push({
            type: 'line',
            name: 'line',
            shape: { x1: x2, y1: y2, x2: x3, y2: y3 },
            style: { stroke: '#ff9800', lineWidth: 1.5, lineDash: [5, 4] },
        });

        // Control points
        children.push({
            type: 'circle', name: 'point-0',
            shape: { cx: x1, cy: y1, r: 4 },
            style: { fill: '#fff', stroke: color, lineWidth: 1, opacity: isSelected ? 1 : 0 },
            z: 100,
        });
        children.push({
            type: 'circle', name: 'point-1',
            shape: { cx: x2, cy: y2, r: 4 },
            style: { fill: '#fff', stroke: color, lineWidth: 1, opacity: isSelected ? 1 : 0 },
            z: 100,
        });
        children.push({
            type: 'circle', name: 'point-2',
            shape: { cx: x3, cy: y3, r: 4 },
            style: { fill: '#fff', stroke: color, lineWidth: 1, opacity: isSelected ? 1 : 0 },
            z: 100,
        });

        // Vertex labels
        const labels = ['1', '2', '3'];
        const points = [pixelPoints[0], pixelPoints[1], pixelPoints[2]];
        for (let i = 0; i < 3; i++) {
            const [px, py] = points[i];
            const isHigh = (i === 0 || py <= points[i - 1][1]) && (i === 2 || py <= points[i + 1]?.[1]);
            children.push({
                type: 'text',
                style: { text: labels[i], x: px, y: isHigh ? py - 14 : py + 16, fill: '#e2e8f0', fontSize: 12, fontWeight: 'bold', align: 'center', verticalAlign: 'middle' },
                silent: true,
            });
        }

        return { type: 'group', children };
    }
}
