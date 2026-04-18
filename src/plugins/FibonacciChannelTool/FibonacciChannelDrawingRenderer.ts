import { DrawingRenderer, DrawingRenderContext } from '../../types';

const LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
const COLORS = ['#787b86', '#f44336', '#ff9800', '#4caf50', '#2196f3', '#00bcd4', '#787b86'];

export class FibonacciChannelDrawingRenderer implements DrawingRenderer {
    type = 'fibonacci_channel';

    render(ctx: DrawingRenderContext): any {
        const { drawing, pixelPoints, isSelected } = ctx;
        const [x1, y1] = pixelPoints[0];
        const [x2, y2] = pixelPoints[1];
        const [wx, wy] = pixelPoints[2];
        const color = drawing.style?.color || '#3b82f6';

        // Compute perpendicular offset from baseline to width point
        const bdx = x2 - x1;
        const bdy = y2 - y1;
        const blen = Math.sqrt(bdx * bdx + bdy * bdy);
        if (blen === 0) return;

        // Normal vector (perpendicular to baseline)
        const nx = -bdy / blen;
        const ny = bdx / blen;

        // Signed distance from baseline to width point along normal
        const dist = (wx - x1) * nx + (wy - y1) * ny;

        const children: any[] = [];
        const levelCoords: { lx1: number; ly1: number; lx2: number; ly2: number }[] = [];

        LEVELS.forEach((level, index) => {
            const ox = nx * dist * level;
            const oy = ny * dist * level;

            const lx1 = x1 + ox;
            const ly1 = y1 + oy;
            const lx2 = x2 + ox;
            const ly2 = y2 + oy;

            levelCoords.push({ lx1, ly1, lx2, ly2 });

            // Fill between this level and the next
            if (index < LEVELS.length - 1) {
                const nextLevel = LEVELS[index + 1];
                const nox = nx * dist * nextLevel;
                const noy = ny * dist * nextLevel;

                children.push({
                    type: 'polygon',
                    name: 'line', // Enable dragging by clicking background
                    shape: {
                        points: [
                            [lx1, ly1],
                            [lx2, ly2],
                            [x2 + nox, y2 + noy],
                            [x1 + nox, y1 + noy],
                        ],
                    },
                    style: {
                        fill: COLORS[(index + 1) % COLORS.length],
                        opacity: 0.1,
                    },
                });
            }
        });

        // Level lines and labels on top of fills
        levelCoords.forEach((coords, index) => {
            const levelColor = COLORS[index % COLORS.length];

            children.push({
                type: 'line',
                shape: { x1: coords.lx1, y1: coords.ly1, x2: coords.lx2, y2: coords.ly2 },
                style: { stroke: levelColor, lineWidth: 1 },
                silent: true,
            });

            children.push({
                type: 'text',
                style: {
                    text: `${LEVELS[index]}`,
                    x: coords.lx2 + 5,
                    y: coords.ly2 - 5,
                    fill: levelColor,
                    fontSize: 10,
                },
                silent: true,
            });
        });

        // Baseline (dashed)
        children.push({
            type: 'line',
            name: 'line',
            shape: { x1, y1, x2, y2 },
            style: { stroke: '#999', lineWidth: 1, lineDash: [4, 4] },
        });

        // Control points
        children.push({
            type: 'circle',
            name: 'point-0',
            shape: { cx: x1, cy: y1, r: 4 },
            style: { fill: '#fff', stroke: color, lineWidth: 1, opacity: isSelected ? 1 : 0 },
            z: 100,
        });
        children.push({
            type: 'circle',
            name: 'point-1',
            shape: { cx: x2, cy: y2, r: 4 },
            style: { fill: '#fff', stroke: color, lineWidth: 1, opacity: isSelected ? 1 : 0 },
            z: 100,
        });
        children.push({
            type: 'circle',
            name: 'point-2',
            shape: { cx: wx, cy: wy, r: 4 },
            style: { fill: '#fff', stroke: color, lineWidth: 1, opacity: isSelected ? 1 : 0 },
            z: 100,
        });

        return {
            type: 'group',
            children,
        };
    }
}
