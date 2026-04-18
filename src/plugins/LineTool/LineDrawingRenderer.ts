import { DrawingRenderer, DrawingRenderContext } from '../../types';

export class LineDrawingRenderer implements DrawingRenderer {
    type = 'line';

    render(ctx: DrawingRenderContext): any {
        const { drawing, pixelPoints, isSelected } = ctx;
        const [x1, y1] = pixelPoints[0];
        const [x2, y2] = pixelPoints[1];
        const color = drawing.style?.color || '#d1d4dc';

        return {
            type: 'group',
            children: [
                {
                    type: 'line',
                    name: 'line',
                    shape: { x1, y1, x2, y2 },
                    style: {
                        stroke: color,
                        lineWidth: drawing.style?.lineWidth || 1,
                    },
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
                },
            ],
        };
    }
}
