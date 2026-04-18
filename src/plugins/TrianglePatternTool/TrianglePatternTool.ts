import * as echarts from 'echarts';
import { AbstractPlugin } from '../../components/AbstractPlugin';
import { TrianglePatternDrawingRenderer } from './TrianglePatternDrawingRenderer';

const LABELS = ['1', '2', '3', '4', '5'];
const TOTAL_POINTS = 5;

export class TrianglePatternTool extends AbstractPlugin {
    private points: number[][] = [];
    private state: 'idle' | 'drawing' | 'finished' = 'idle';
    private graphicGroup: any = null;

    constructor(options: { name?: string; icon?: string } = {}) {
        super({
            id: 'triangle-pattern-tool',
            name: options.name || 'Triangle Pattern',
            icon: options.icon || `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#e3e3e3" stroke-width="1.5"><path d="M2,4 L22,4 L12,20 Z"/></svg>`,
        });
    }

    protected onInit(): void { this.context.registerDrawingRenderer(new TrianglePatternDrawingRenderer()); }

    protected onActivate(): void {
        this.state = 'idle'; this.points = [];
        this.context.getChart().getZr().setCursorStyle('crosshair');
        const zr = this.context.getChart().getZr();
        zr.on('click', this.onClick); zr.on('mousemove', this.onMouseMove);
    }

    protected onDeactivate(): void {
        this.state = 'idle'; this.points = []; this.removeGraphic();
        const zr = this.context.getChart().getZr();
        zr.off('click', this.onClick); zr.off('mousemove', this.onMouseMove);
        zr.setCursorStyle('default');
    }

    private onClick = (params: any) => {
        const pt = this.getPoint(params);
        if (this.state === 'idle') {
            this.state = 'drawing'; this.points = [pt, [...pt]]; this.initGraphic(); this.updateGraphic();
        } else if (this.state === 'drawing') {
            this.points[this.points.length - 1] = pt;
            if (this.points.length >= TOTAL_POINTS) {
                this.state = 'finished'; this.updateGraphic(); this.saveDrawing(); this.removeGraphic(); this.context.disableTools();
            } else { this.points.push([...pt]); this.updateGraphic(); }
        }
    };

    private onMouseMove = (params: any) => {
        if (this.state !== 'drawing' || this.points.length < 2) return;
        this.points[this.points.length - 1] = this.getPoint(params); this.updateGraphic();
    };

    private initGraphic() { this.graphicGroup = new echarts.graphic.Group(); this.context.getChart().getZr().add(this.graphicGroup); }
    private removeGraphic() { if (this.graphicGroup) { this.context.getChart().getZr().remove(this.graphicGroup); this.graphicGroup = null; } }

    private updateGraphic() {
        if (!this.graphicGroup) return;
        this.graphicGroup.removeAll();
        const pts = this.points;

        if (pts.length >= 3) this.graphicGroup.add(new echarts.graphic.Polygon({ shape: { points: pts }, style: { fill: 'rgba(156,39,176,0.06)' }, silent: true }));

        // Zigzag
        for (let i = 0; i < pts.length - 1; i++) {
            this.graphicGroup.add(new echarts.graphic.Line({ shape: { x1: pts[i][0], y1: pts[i][1], x2: pts[i + 1][0], y2: pts[i + 1][1] }, style: { stroke: '#9c27b0', lineWidth: 2 }, silent: true }));
        }

        // Upper trendline (even indices)
        const upper = pts.filter((_, i) => i % 2 === 0);
        if (upper.length >= 2) {
            for (let i = 0; i < upper.length - 1; i++) {
                this.graphicGroup.add(new echarts.graphic.Line({ shape: { x1: upper[i][0], y1: upper[i][1], x2: upper[i + 1][0], y2: upper[i + 1][1] }, style: { stroke: '#f44336', lineWidth: 1, lineDash: [4, 4] }, silent: true }));
            }
        }
        // Lower trendline (odd indices)
        const lower = pts.filter((_, i) => i % 2 === 1);
        if (lower.length >= 2) {
            for (let i = 0; i < lower.length - 1; i++) {
                this.graphicGroup.add(new echarts.graphic.Line({ shape: { x1: lower[i][0], y1: lower[i][1], x2: lower[i + 1][0], y2: lower[i + 1][1] }, style: { stroke: '#4caf50', lineWidth: 1, lineDash: [4, 4] }, silent: true }));
            }
        }

        for (let i = 0; i < pts.length && i < LABELS.length; i++) {
            const [px, py] = pts[i];
            const isHigh = i % 2 === 0;
            this.graphicGroup.add(new echarts.graphic.Text({ style: { text: LABELS[i], x: px, y: isHigh ? py - 14 : py + 16, fill: '#e2e8f0', fontSize: 12, fontWeight: 'bold', align: 'center', verticalAlign: 'middle' }, silent: true }));
            this.graphicGroup.add(new echarts.graphic.Circle({ shape: { cx: px, cy: py, r: 4 }, style: { fill: '#fff', stroke: '#3b82f6', lineWidth: 1.5 }, z: 101, silent: true }));
        }
    }

    private saveDrawing() {
        const dataPoints = this.points.map((pt) => this.context.coordinateConversion.pixelToData({ x: pt[0], y: pt[1] }));
        if (dataPoints.every((p) => p !== null)) {
            this.context.addDrawing({ id: `triangle-${Date.now()}`, type: 'triangle_pattern', points: dataPoints as any[], paneIndex: dataPoints[0]!.paneIndex || 0, style: { color: '#3b82f6', lineWidth: 2 } });
        }
    }
}
