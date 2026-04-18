import * as echarts from 'echarts';
import { AbstractPlugin } from '../../components/AbstractPlugin';
import { XABCDPatternDrawingRenderer } from './XABCDPatternDrawingRenderer';

const LABELS = ['X', 'A', 'B', 'C', 'D'];
const LEG_COLORS = ['#2196f3', '#ff9800', '#4caf50', '#f44336'];
const TOTAL_POINTS = 5;

export class XABCDPatternTool extends AbstractPlugin {
    private points: number[][] = [];
    private state: 'idle' | 'drawing' | 'finished' = 'idle';
    private graphicGroup: any = null;

    constructor(options: { name?: string; icon?: string } = {}) {
        super({
            id: 'xabcd-pattern-tool',
            name: options.name || 'XABCD Pattern',
            icon:
                options.icon ||
                `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#e3e3e3" stroke-width="1.5"><polyline points="2,18 6,6 11,14 16,4 21,16"/><circle cx="2" cy="18" r="1.5" fill="#e3e3e3"/><circle cx="6" cy="6" r="1.5" fill="#e3e3e3"/><circle cx="11" cy="14" r="1.5" fill="#e3e3e3"/><circle cx="16" cy="4" r="1.5" fill="#e3e3e3"/><circle cx="21" cy="16" r="1.5" fill="#e3e3e3"/></svg>`,
        });
    }

    protected onInit(): void {
        this.context.registerDrawingRenderer(new XABCDPatternDrawingRenderer());
    }

    protected onActivate(): void {
        this.state = 'idle';
        this.points = [];
        this.context.getChart().getZr().setCursorStyle('crosshair');
        this.bindEvents();
    }

    protected onDeactivate(): void {
        this.state = 'idle';
        this.points = [];
        this.removeGraphic();
        this.unbindEvents();
        this.context.getChart().getZr().setCursorStyle('default');
    }

    private bindEvents() {
        const zr = this.context.getChart().getZr();
        zr.on('click', this.onClick);
        zr.on('mousemove', this.onMouseMove);
    }

    private unbindEvents() {
        const zr = this.context.getChart().getZr();
        zr.off('click', this.onClick);
        zr.off('mousemove', this.onMouseMove);
    }

    private onClick = (params: any) => {
        const pt = this.getPoint(params);

        if (this.state === 'idle') {
            this.state = 'drawing';
            this.points = [pt, [...pt]]; // First point + cursor preview
            this.initGraphic();
            this.updateGraphic();
        } else if (this.state === 'drawing') {
            // Replace the preview point with the confirmed click
            this.points[this.points.length - 1] = pt;

            if (this.points.length >= TOTAL_POINTS) {
                // All 5 points placed
                this.state = 'finished';
                this.updateGraphic();
                this.saveDrawing();
                this.removeGraphic();
                this.context.disableTools();
            } else {
                // Add a new preview point for the next position
                this.points.push([...pt]);
                this.updateGraphic();
            }
        }
    };

    private onMouseMove = (params: any) => {
        if (this.state !== 'drawing' || this.points.length < 2) return;
        // Update the last (preview) point
        this.points[this.points.length - 1] = this.getPoint(params);
        this.updateGraphic();
    };

    private initGraphic() {
        this.graphicGroup = new echarts.graphic.Group();
        this.context.getChart().getZr().add(this.graphicGroup);
    }

    private removeGraphic() {
        if (this.graphicGroup) {
            this.context.getChart().getZr().remove(this.graphicGroup);
            this.graphicGroup = null;
        }
    }

    private updateGraphic() {
        if (!this.graphicGroup) return;
        this.graphicGroup.removeAll();

        const pts = this.points;

        // Fill triangles
        if (pts.length >= 3) {
            this.graphicGroup.add(
                new echarts.graphic.Polygon({
                    shape: { points: pts.slice(0, 3) },
                    style: { fill: 'rgba(33, 150, 243, 0.08)' },
                    silent: true,
                }),
            );
        }
        if (pts.length >= 5) {
            this.graphicGroup.add(
                new echarts.graphic.Polygon({
                    shape: { points: pts.slice(2, 5) },
                    style: { fill: 'rgba(244, 67, 54, 0.08)' },
                    silent: true,
                }),
            );
        }

        // Leg lines
        for (let i = 0; i < pts.length - 1; i++) {
            const [x1, y1] = pts[i];
            const [x2, y2] = pts[i + 1];
            this.graphicGroup.add(
                new echarts.graphic.Line({
                    shape: { x1, y1, x2, y2 },
                    style: { stroke: LEG_COLORS[i % LEG_COLORS.length], lineWidth: 2 },
                    silent: true,
                }),
            );
        }

        // Dashed connectors X→B, A→C, B→D
        const connectors: [number, number][] = [[0, 2], [1, 3], [2, 4]];
        for (const [from, to] of connectors) {
            if (from < pts.length && to < pts.length) {
                const [x1, y1] = pts[from];
                const [x2, y2] = pts[to];
                this.graphicGroup.add(
                    new echarts.graphic.Line({
                        shape: { x1, y1, x2, y2 },
                        style: { stroke: '#555', lineWidth: 1, lineDash: [4, 4] },
                        silent: true,
                    }),
                );
            }
        }

        // Vertex labels
        for (let i = 0; i < pts.length && i < LABELS.length; i++) {
            const [px, py] = pts[i];
            const isLocalHigh =
                (i === 0 || py <= pts[i - 1][1]) &&
                (i === pts.length - 1 || py <= pts[i + 1]?.[1]);
            const labelY = isLocalHigh ? py - 14 : py + 16;

            this.graphicGroup.add(
                new echarts.graphic.Text({
                    style: {
                        text: LABELS[i],
                        x: px,
                        y: labelY,
                        fill: '#e2e8f0',
                        fontSize: 12,
                        fontWeight: 'bold',
                        align: 'center',
                        verticalAlign: 'middle',
                    },
                    silent: true,
                }),
            );
        }

        // Point circles
        for (let i = 0; i < pts.length; i++) {
            const [px, py] = pts[i];
            this.graphicGroup.add(
                new echarts.graphic.Circle({
                    shape: { cx: px, cy: py, r: 4 },
                    style: { fill: '#fff', stroke: '#3b82f6', lineWidth: 1.5 },
                    z: 101,
                    silent: true,
                }),
            );
        }
    }

    private saveDrawing() {
        const dataPoints = this.points.map((pt) =>
            this.context.coordinateConversion.pixelToData({ x: pt[0], y: pt[1] }),
        );

        if (dataPoints.every((p) => p !== null)) {
            this.context.addDrawing({
                id: `xabcd-${Date.now()}`,
                type: 'xabcd_pattern',
                points: dataPoints as any[],
                paneIndex: dataPoints[0]!.paneIndex || 0,
                style: {
                    color: '#3b82f6',
                    lineWidth: 2,
                },
            });
        }
    }
}
