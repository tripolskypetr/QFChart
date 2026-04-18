import { DrawingRenderer, DrawingRenderContext } from '../../types';

export class HorizontalLineDrawingRenderer implements DrawingRenderer {
    type = 'horizontal-line';

    render(ctx: DrawingRenderContext): any {
        const { drawing, pixelPoints, isSelected, coordSys } = ctx;
        const [px, py] = pixelPoints[0];
        const color = drawing.style?.color || '#d1d4dc';

        const left = coordSys.x;
        const right = coordSys.x + coordSys.width;

        return {
            type: 'group',
            children: [
                {
                    type: 'line',
                    name: 'line',
                    shape: { x1: left, y1: py, x2: right, y2: py },
                    style: {
                        stroke: color,
                        lineWidth: drawing.style?.lineWidth || 1,
                    },
                },
                // Price label on the right
                {
                    type: 'rect',
                    shape: { x: right - 70, y: py - 10, width: 65, height: 18, r: 2 },
                    style: { fill: color, opacity: 0.9 },
                    z2: 10,
                },
                {
                    type: 'text',
                    x: right - 67,
                    y: py - 8,
                    style: {
                        text: drawing.points[0].value.toFixed(2),
                        fill: '#fff',
                        fontSize: 10,
                        fontFamily: 'monospace',
                    },
                    z2: 11,
                },
                {
                    type: 'circle',
                    name: 'point-0',
                    shape: { cx: px, cy: py, r: 4 },
                    style: { fill: '#fff', stroke: color, lineWidth: 1, opacity: isSelected ? 1 : 0 },
                },
            ],
        };
    }
}
