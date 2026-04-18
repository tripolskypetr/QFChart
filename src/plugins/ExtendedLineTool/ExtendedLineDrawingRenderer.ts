import { DrawingRenderer, DrawingRenderContext } from '../../types';

export class ExtendedLineDrawingRenderer implements DrawingRenderer {
    type = 'extended-line';

    render(ctx: DrawingRenderContext): any {
        const { drawing, pixelPoints, isSelected, coordSys } = ctx;
        const [x1, y1] = pixelPoints[0];
        const [x2, y2] = pixelPoints[1];
        const color = drawing.style?.color || '#d1d4dc';

        const dx = x2 - x1;
        const dy = y2 - y1;

        let ex1 = x1, ey1 = y1, ex2 = x2, ey2 = y2;

        if (dx !== 0 || dy !== 0) {
            const left = coordSys.x;
            const right = coordSys.x + coordSys.width;
            const top = coordSys.y;
            const bottom = coordSys.y + coordSys.height;

            // Extend forward (past p2)
            [ex2, ey2] = this.extendToEdge(x1, y1, dx, dy, left, right, top, bottom);
            // Extend backward (past p1)
            [ex1, ey1] = this.extendToEdge(x2, y2, -dx, -dy, left, right, top, bottom);
        }

        return {
            type: 'group',
            children: [
                {
                    type: 'line',
                    name: 'line',
                    shape: { x1: ex1, y1: ey1, x2: ex2, y2: ey2 },
                    style: {
                        stroke: color,
                        lineWidth: drawing.style?.lineWidth || 1,
                    },
                },
                {
                    type: 'circle',
                    name: 'point-0',
                    shape: { cx: x1, cy: y1, r: 4 },
                    style: { fill: '#fff', stroke: color, lineWidth: 1, opacity: isSelected ? 1 : 0 },
                },
                {
                    type: 'circle',
                    name: 'point-1',
                    shape: { cx: x2, cy: y2, r: 4 },
                    style: { fill: '#fff', stroke: color, lineWidth: 1, opacity: isSelected ? 1 : 0 },
                },
            ],
        };
    }

    private extendToEdge(
        ox: number, oy: number, dx: number, dy: number,
        left: number, right: number, top: number, bottom: number,
    ): [number, number] {
        let tMax = Infinity;
        if (dx !== 0) {
            const tx = dx > 0 ? (right - ox) / dx : (left - ox) / dx;
            if (tx > 0) tMax = Math.min(tMax, tx);
        }
        if (dy !== 0) {
            const ty = dy > 0 ? (bottom - oy) / dy : (top - oy) / dy;
            if (ty > 0) tMax = Math.min(tMax, ty);
        }
        if (!isFinite(tMax)) tMax = 1;
        return [ox + tMax * dx, oy + tMax * dy];
    }
}
