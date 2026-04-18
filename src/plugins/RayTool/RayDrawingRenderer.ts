import { DrawingRenderer, DrawingRenderContext } from '../../types';

export class RayDrawingRenderer implements DrawingRenderer {
    type = 'ray';

    render(ctx: DrawingRenderContext): any {
        const { drawing, pixelPoints, isSelected, coordSys } = ctx;
        const [x1, y1] = pixelPoints[0];
        const [x2, y2] = pixelPoints[1];
        const color = drawing.style?.color || '#d1d4dc';

        // Extend the ray from p1 through p2 to the chart boundary
        const [ex, ey] = this.extendToEdge(x1, y1, x2, y2, coordSys);

        return {
            type: 'group',
            children: [
                {
                    type: 'line',
                    name: 'line',
                    shape: { x1, y1, x2: ex, y2: ey },
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
        x1: number, y1: number, x2: number, y2: number,
        cs: { x: number; y: number; width: number; height: number },
    ): [number, number] {
        const dx = x2 - x1;
        const dy = y2 - y1;
        if (dx === 0 && dy === 0) return [x2, y2];

        const left = cs.x;
        const right = cs.x + cs.width;
        const top = cs.y;
        const bottom = cs.y + cs.height;

        let tMax = Infinity;
        if (dx !== 0) {
            const tx = dx > 0 ? (right - x1) / dx : (left - x1) / dx;
            if (tx > 0) tMax = Math.min(tMax, tx);
        }
        if (dy !== 0) {
            const ty = dy > 0 ? (bottom - y1) / dy : (top - y1) / dy;
            if (ty > 0) tMax = Math.min(tMax, ty);
        }
        if (!isFinite(tMax)) tMax = 1;

        return [x1 + tMax * dx, y1 + tMax * dy];
    }
}
