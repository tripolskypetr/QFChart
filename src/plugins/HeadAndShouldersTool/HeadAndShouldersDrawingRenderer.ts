import { DrawingRenderer, DrawingRenderContext } from '../../types';

// Points: 0=left base, 1=left shoulder, 2=neckline left, 3=head, 4=neckline right, 5=right shoulder, 6=right base
const LABELS = ['', 'LS', '', 'H', '', 'RS', ''];

export class HeadAndShouldersDrawingRenderer implements DrawingRenderer {
    type = 'head_and_shoulders';

    render(ctx: DrawingRenderContext): any {
        const { drawing, pixelPoints, isSelected } = ctx;
        const color = drawing.style?.color || '#3b82f6';
        if (pixelPoints.length < 2) return;

        const children: any[] = [];

        // Fill left shoulder region (points 0,1,2)
        if (pixelPoints.length >= 3) {
            children.push({ type: 'polygon', name: 'line', shape: { points: pixelPoints.slice(0, 3).map(([x, y]) => [x, y]) }, style: { fill: 'rgba(33, 150, 243, 0.06)' } });
        }
        // Fill head region (points 2,3,4)
        if (pixelPoints.length >= 5) {
            children.push({ type: 'polygon', name: 'line', shape: { points: pixelPoints.slice(2, 5).map(([x, y]) => [x, y]) }, style: { fill: 'rgba(244, 67, 54, 0.08)' } });
        }
        // Fill right shoulder region (points 4,5,6)
        if (pixelPoints.length >= 7) {
            children.push({ type: 'polygon', name: 'line', shape: { points: pixelPoints.slice(4, 7).map(([x, y]) => [x, y]) }, style: { fill: 'rgba(33, 150, 243, 0.06)' } });
        }

        // Zigzag through all points
        for (let i = 0; i < pixelPoints.length - 1; i++) {
            const [x1, y1] = pixelPoints[i];
            const [x2, y2] = pixelPoints[i + 1];
            children.push({
                type: 'line', name: 'line',
                shape: { x1, y1, x2, y2 },
                style: { stroke: '#2196f3', lineWidth: drawing.style?.lineWidth || 2 },
            });
        }

        // Neckline: connect neckline-left (2) and neckline-right (4), extended
        if (pixelPoints.length >= 5) {
            const [nx1, ny1] = pixelPoints[2];
            const [nx2, ny2] = pixelPoints[4];
            const dx = nx2 - nx1;
            const dy = ny2 - ny1;

            // Extended neckline (0.3 beyond each side)
            const extL = 0.3;
            const extR = 0.3;
            const exlx = nx1 - dx * extL;
            const exly = ny1 - dy * extL;
            const exrx = nx2 + dx * extR;
            const exry = ny2 + dy * extR;

            children.push({
                type: 'line',
                shape: { x1: exlx, y1: exly, x2: exrx, y2: exry },
                style: { stroke: '#ff9800', lineWidth: 2, lineDash: [6, 4] },
                silent: true,
            });

            // Neckline label
            children.push({
                type: 'text',
                style: { text: 'Neckline', x: (nx1 + nx2) / 2, y: (ny1 + ny2) / 2 + 14, fill: '#ff9800', fontSize: 10, align: 'center' },
                silent: true,
            });
        }

        // Labels
        for (let i = 0; i < pixelPoints.length && i < LABELS.length; i++) {
            if (!LABELS[i]) continue;
            const [px, py] = pixelPoints[i];
            // Shoulders and head are peaks (above neighbors)
            const isHigh = (i === 0 || py <= pixelPoints[i - 1][1]) && (i === pixelPoints.length - 1 || py <= pixelPoints[i + 1]?.[1]);
            children.push({
                type: 'text',
                style: { text: LABELS[i], x: px, y: isHigh ? py - 14 : py + 16, fill: '#e2e8f0', fontSize: 12, fontWeight: 'bold', align: 'center', verticalAlign: 'middle' },
                silent: true,
            });
        }

        // Control points
        for (let i = 0; i < pixelPoints.length; i++) {
            children.push({
                type: 'circle', name: `point-${i}`,
                shape: { cx: pixelPoints[i][0], cy: pixelPoints[i][1], r: 4 },
                style: { fill: '#fff', stroke: color, lineWidth: 1, opacity: isSelected ? 1 : 0 },
                z: 100,
            });
        }

        return { type: 'group', children };
    }
}
