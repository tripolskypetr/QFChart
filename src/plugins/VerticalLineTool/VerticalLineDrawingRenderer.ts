import { DrawingRenderer, DrawingRenderContext } from '../../types';

export class VerticalLineDrawingRenderer implements DrawingRenderer {
    type = 'vertical-line';

    render(ctx: DrawingRenderContext): any {
        const { drawing, pixelPoints, isSelected, coordSys } = ctx;
        const [px, py] = pixelPoints[0];
        const color = drawing.style?.color || '#d1d4dc';

        const top = coordSys.y;
        const bottom = coordSys.y + coordSys.height;

        return {
            type: 'group',
            children: [
                {
                    type: 'line',
                    name: 'line',
                    shape: { x1: px, y1: top, x2: px, y2: bottom },
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
