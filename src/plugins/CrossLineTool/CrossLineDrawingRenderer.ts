import { DrawingRenderer, DrawingRenderContext } from '../../types';

export class CrossLineDrawingRenderer implements DrawingRenderer {
    type = 'cross-line';

    render(ctx: DrawingRenderContext): any {
        const { drawing, pixelPoints, isSelected, coordSys } = ctx;
        const [px, py] = pixelPoints[0];
        const color = drawing.style?.color || '#d1d4dc';

        const left = coordSys.x;
        const right = coordSys.x + coordSys.width;
        const top = coordSys.y;
        const bottom = coordSys.y + coordSys.height;

        return {
            type: 'group',
            children: [
                // Horizontal line
                {
                    type: 'line',
                    name: 'line-h',
                    shape: { x1: left, y1: py, x2: right, y2: py },
                    style: {
                        stroke: color,
                        lineWidth: drawing.style?.lineWidth || 1,
                    },
                },
                // Vertical line
                {
                    type: 'line',
                    name: 'line-v',
                    shape: { x1: px, y1: top, x2: px, y2: bottom },
                    style: {
                        stroke: color,
                        lineWidth: drawing.style?.lineWidth || 1,
                    },
                },
                // Center point
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
