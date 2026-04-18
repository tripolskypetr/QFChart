import { DrawingRenderer, DrawingRenderContext } from '../../types';

export class HorizontalRayDrawingRenderer implements DrawingRenderer {
    type = 'horizontal-ray';

    render(ctx: DrawingRenderContext): any {
        const { drawing, pixelPoints, isSelected, coordSys } = ctx;
        const [px, py] = pixelPoints[0];
        const color = drawing.style?.color || '#d1d4dc';

        const right = coordSys.x + coordSys.width;

        return {
            type: 'group',
            children: [
                {
                    type: 'line',
                    name: 'line',
                    shape: { x1: px, y1: py, x2: right, y2: py },
                    style: {
                        stroke: color,
                        lineWidth: drawing.style?.lineWidth || 1,
                    },
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
