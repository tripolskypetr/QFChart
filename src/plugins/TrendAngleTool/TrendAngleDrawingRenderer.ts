import { DrawingRenderer, DrawingRenderContext } from '../../types';

export class TrendAngleDrawingRenderer implements DrawingRenderer {
    type = 'trend-angle';

    render(ctx: DrawingRenderContext): any {
        const { drawing, pixelPoints, isSelected } = ctx;
        const [x1, y1] = pixelPoints[0];
        const [x2, y2] = pixelPoints[1];
        const color = drawing.style?.color || '#d1d4dc';

        const dx = x2 - x1;
        const dy = y2 - y1;

        // Angle in degrees (screen Y is inverted, so negate dy for natural angle)
        const angleRad = Math.atan2(-dy, dx);
        const angleDeg = angleRad * (180 / Math.PI);
        const displayAngle = angleDeg.toFixed(1);

        // Arc radius
        const arcR = Math.min(30, Math.sqrt(dx * dx + dy * dy) * 0.3);

        // Horizontal reference line from p1 extending right
        const hLineEndX = x1 + Math.max(Math.abs(dx), arcR + 20);

        // Arc path: from 0 degrees (horizontal right) to the angle
        // In screen coords, positive angle goes CCW (since Y is inverted)
        const startAngle = 0;
        const endAngle = -angleRad; // Convert back to screen angle

        const children: any[] = [
            // Main trend line
            {
                type: 'line',
                name: 'line',
                shape: { x1, y1, x2, y2 },
                style: { stroke: color, lineWidth: drawing.style?.lineWidth || 1 },
            },
            // Horizontal reference line
            {
                type: 'line',
                shape: { x1, y1, x2: hLineEndX, y2: y1 },
                style: { stroke: color, lineWidth: 1, opacity: 0.4, lineDash: [4, 4] },
            },
            // Arc
            {
                type: 'arc',
                shape: {
                    cx: x1,
                    cy: y1,
                    r: arcR,
                    startAngle: Math.min(startAngle, endAngle),
                    endAngle: Math.max(startAngle, endAngle),
                },
                style: { stroke: color, lineWidth: 1.5, fill: 'none' },
            },
            // Angle label
            {
                type: 'text',
                x: x1 + arcR + 6,
                y: y1 + (dy < 0 ? -14 : 2),
                style: {
                    text: `${displayAngle}\u00B0`,
                    fill: color,
                    fontSize: 11,
                    fontFamily: 'sans-serif',
                },
                z2: 10,
            },
            // Control points
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
        ];

        return { type: 'group', children };
    }
}
