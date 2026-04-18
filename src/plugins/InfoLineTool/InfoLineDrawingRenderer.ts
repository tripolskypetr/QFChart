import { DrawingRenderer, DrawingRenderContext } from '../../types';

export class InfoLineDrawingRenderer implements DrawingRenderer {
    type = 'info-line';

    render(ctx: DrawingRenderContext): any {
        const { drawing, pixelPoints, isSelected } = ctx;
        const [x1, y1] = pixelPoints[0];
        const [x2, y2] = pixelPoints[1];
        const color = drawing.style?.color || '#d1d4dc';

        const p0 = drawing.points[0];
        const p1 = drawing.points[1];

        const priceChange = p1.value - p0.value;
        const pctChange = p0.value !== 0 ? (priceChange / p0.value) * 100 : 0;
        const bars = Math.abs(p1.timeIndex - p0.timeIndex);

        const sign = priceChange >= 0 ? '+' : '';
        const infoText = `${sign}${priceChange.toFixed(2)} (${sign}${pctChange.toFixed(2)}%)  ${bars} bars`;

        // Position info box at midpoint
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        const isUp = priceChange >= 0;
        const textColor = isUp ? '#26a69a' : '#ef5350';

        return {
            type: 'group',
            children: [
                {
                    type: 'line',
                    name: 'line',
                    shape: { x1, y1, x2, y2 },
                    style: { stroke: color, lineWidth: drawing.style?.lineWidth || 1 },
                },
                // Info box background
                {
                    type: 'rect',
                    shape: { x: mx - 2, y: my - 22, width: infoText.length * 6.5 + 12, height: 18, r: 3 },
                    style: { fill: '#1e293b', stroke: '#475569', lineWidth: 1, opacity: 0.9 },
                    z2: 10,
                },
                // Info text
                {
                    type: 'text',
                    x: mx + 4,
                    y: my - 20,
                    style: {
                        text: infoText,
                        fill: textColor,
                        fontSize: 11,
                        fontFamily: 'monospace',
                    },
                    z2: 11,
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
}
