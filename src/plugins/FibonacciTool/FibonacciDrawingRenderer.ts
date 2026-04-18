import { DrawingRenderer, DrawingRenderContext } from '../../types';

const LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
const COLORS = ['#787b86', '#f44336', '#ff9800', '#4caf50', '#2196f3', '#00bcd4', '#787b86'];

export class FibonacciDrawingRenderer implements DrawingRenderer {
    type = 'fibonacci';

    render(ctx: DrawingRenderContext): any {
        const { drawing, pixelPoints, isSelected } = ctx;
        const [x1, y1] = pixelPoints[0];
        const [x2, y2] = pixelPoints[1];
        const color = drawing.style?.color || '#3b82f6';

        const startX = Math.min(x1, x2);
        const endX = Math.max(x1, x2);
        const width = endX - startX;
        const diffY = y2 - y1;

        const startVal = drawing.points[0].value;
        const endVal = drawing.points[1].value;
        const valDiff = endVal - startVal;

        const backgrounds: any[] = [];
        const linesAndText: any[] = [];

        LEVELS.forEach((level, index) => {
            const levelY = y2 - diffY * level;
            const levelColor = COLORS[index % COLORS.length];

            linesAndText.push({
                type: 'line',
                shape: { x1: startX, y1: levelY, x2: endX, y2: levelY },
                style: { stroke: levelColor, lineWidth: 1 },
                silent: true,
            });

            const price = endVal - valDiff * level;
            linesAndText.push({
                type: 'text',
                style: {
                    text: `${level} (${price.toFixed(2)})`,
                    x: startX + 5,
                    y: levelY - 10,
                    fill: levelColor,
                    fontSize: 10,
                },
                silent: true,
            });

            if (index < LEVELS.length - 1) {
                const nextLevel = LEVELS[index + 1];
                const nextY = y2 - diffY * nextLevel;
                const rectH = Math.abs(nextY - levelY);
                const rectY = Math.min(levelY, nextY);

                backgrounds.push({
                    type: 'rect',
                    name: 'line', // Enable dragging by clicking background
                    shape: { x: startX, y: rectY, width, height: rectH },
                    style: {
                        fill: COLORS[(index + 1) % COLORS.length],
                        opacity: 0.1,
                    },
                });
            }
        });

        return {
            type: 'group',
            children: [
                ...backgrounds,
                ...linesAndText,
                {
                    type: 'line',
                    name: 'line',
                    shape: { x1, y1, x2, y2 },
                    style: { stroke: '#999', lineWidth: 1, lineDash: [4, 4] },
                },
                {
                    type: 'circle',
                    name: 'point-0',
                    shape: { cx: x1, cy: y1, r: 4 },
                    style: {
                        fill: '#fff',
                        stroke: color,
                        lineWidth: 1,
                        opacity: isSelected ? 1 : 0,
                    },
                    z: 100,
                },
                {
                    type: 'circle',
                    name: 'point-1',
                    shape: { cx: x2, cy: y2, r: 4 },
                    style: {
                        fill: '#fff',
                        stroke: color,
                        lineWidth: 1,
                        opacity: isSelected ? 1 : 0,
                    },
                    z: 100,
                },
            ],
        };
    }
}
