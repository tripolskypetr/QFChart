import { DrawingRenderer, DrawingRenderContext } from '../../types';

const LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
const COLORS = ['#787b86', '#f44336', '#ff9800', '#4caf50', '#2196f3', '#00bcd4', '#787b86'];

export class FibSpeedResistanceFanDrawingRenderer implements DrawingRenderer {
    type = 'fib_speed_resistance_fan';

    render(ctx: DrawingRenderContext): any {
        const { drawing, pixelPoints, isSelected } = ctx;
        const [x1, y1] = pixelPoints[0];
        const [x2, y2] = pixelPoints[1];
        const color = drawing.style?.color || '#3b82f6';

        const dx = x2 - x1;
        const dy = y2 - y1;

        const children: any[] = [];

        // Compute fan ray endpoints for each level
        // Price rays: start → (x1 + dx, y1 + dy * level)
        // Time rays:  start → (x1 + dx * level, y1 + dy)
        const priceRays: [number, number][] = [];
        const timeRays: [number, number][] = [];

        for (const level of LEVELS) {
            priceRays.push([x1 + dx, y1 + dy * level]);
            timeRays.push([x1 + dx * level, y1 + dy]);
        }

        // Fill zones between adjacent price rays
        for (let i = 0; i < priceRays.length - 1; i++) {
            children.push({
                type: 'polygon',
                name: 'line',
                shape: {
                    points: [
                        [x1, y1],
                        priceRays[i],
                        priceRays[i + 1],
                    ],
                },
                style: {
                    fill: COLORS[(i + 1) % COLORS.length],
                    opacity: 0.06,
                },
            });
        }

        // Fill zones between adjacent time rays
        for (let i = 0; i < timeRays.length - 1; i++) {
            children.push({
                type: 'polygon',
                name: 'line',
                shape: {
                    points: [
                        [x1, y1],
                        timeRays[i],
                        timeRays[i + 1],
                    ],
                },
                style: {
                    fill: COLORS[(i + 1) % COLORS.length],
                    opacity: 0.06,
                },
            });
        }

        // Draw price ray lines
        LEVELS.forEach((level, index) => {
            const [ex, ey] = priceRays[index];
            const levelColor = COLORS[index % COLORS.length];

            children.push({
                type: 'line',
                shape: { x1, y1, x2: ex, y2: ey },
                style: { stroke: levelColor, lineWidth: 1 },
                silent: true,
            });

            children.push({
                type: 'text',
                style: {
                    text: `${level}`,
                    x: ex + 3,
                    y: ey - 2,
                    fill: levelColor,
                    fontSize: 9,
                },
                silent: true,
            });
        });

        // Draw time ray lines
        LEVELS.forEach((level, index) => {
            const [ex, ey] = timeRays[index];
            const levelColor = COLORS[index % COLORS.length];

            children.push({
                type: 'line',
                shape: { x1, y1, x2: ex, y2: ey },
                style: { stroke: levelColor, lineWidth: 1 },
                silent: true,
            });

            // Label on the bottom/right end
            children.push({
                type: 'text',
                style: {
                    text: `${level}`,
                    x: ex - 2,
                    y: ey + 8,
                    fill: levelColor,
                    fontSize: 9,
                },
                silent: true,
            });
        });

        // Bounding box edges (dashed)
        children.push({
            type: 'line',
            name: 'line',
            shape: { x1: x2, y1, x2, y2 },
            style: { stroke: '#555', lineWidth: 1, lineDash: [3, 3] },
        });
        children.push({
            type: 'line',
            name: 'line',
            shape: { x1, y1: y2, x2, y2 },
            style: { stroke: '#555', lineWidth: 1, lineDash: [3, 3] },
        });

        // Diagonal (start to end)
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

        return {
            type: 'group',
            children,
        };
    }
}
