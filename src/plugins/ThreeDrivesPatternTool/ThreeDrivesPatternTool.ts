import * as echarts from 'echarts';
import { AbstractPlugin } from '../../components/AbstractPlugin';
import { ThreeDrivesPatternDrawingRenderer } from './ThreeDrivesPatternDrawingRenderer';

const LABELS = ['0', 'D1', 'C1', 'D2', 'C2', 'D3', ''];
const LEG_COLORS = ['#2196f3', '#ff9800', '#4caf50', '#f44336', '#00bcd4', '#e91e63'];
const TOTAL_POINTS = 7;

export class ThreeDrivesPatternTool extends AbstractPlugin {
    private points: number[][] = [];
    private state: 'idle' | 'drawing' | 'finished' = 'idle';
    private graphicGroup: any = null;

    constructor(options: { name?: string; icon?: string } = {}) {
        super({
            id: 'three-drives-pattern-tool',
            name: options.name || 'Three Drives',
            icon: options.icon || `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#e3e3e3" stroke-width="1.5"><polyline points="1,20 4,8 7,14 11,5 15,12 19,2 23,10"/></svg>`,
        });
    }

    protected onInit(): void { this.context.registerDrawingRenderer(new ThreeDrivesPatternDrawingRenderer()); }

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

        // Fills
        if (pts.length >= 3) this.graphicGroup.add(new echarts.graphic.Polygon({ shape: { points: pts.slice(0, 3) }, style: { fill: 'rgba(33,150,243,0.06)' }, silent: true }));
        if (pts.length >= 5) this.graphicGroup.add(new echarts.graphic.Polygon({ shape: { points: pts.slice(2, 5) }, style: { fill: 'rgba(76,175,80,0.06)' }, silent: true }));
        if (pts.length >= 7) this.graphicGroup.add(new echarts.graphic.Polygon({ shape: { points: pts.slice(4, 7) }, style: { fill: 'rgba(0,188,212,0.06)' }, silent: true }));

        // Zigzag
        for (let i = 0; i < pts.length - 1; i++) {
            this.graphicGroup.add(new echarts.graphic.Line({ shape: { x1: pts[i][0], y1: pts[i][1], x2: pts[i + 1][0], y2: pts[i + 1][1] }, style: { stroke: LEG_COLORS[i % LEG_COLORS.length], lineWidth: 2 }, silent: true }));
        }

        // Dashed connectors
        const conn: [number, number][] = [[1, 3], [3, 5], [2, 4]];
        for (const [f, t] of conn) {
            if (f < pts.length && t < pts.length) {
                this.graphicGroup.add(new echarts.graphic.Line({ shape: { x1: pts[f][0], y1: pts[f][1], x2: pts[t][0], y2: pts[t][1] }, style: { stroke: '#555', lineWidth: 1, lineDash: [4, 4] }, silent: true }));
            }
        }

        // Labels & circles
        for (let i = 0; i < pts.length && i < LABELS.length; i++) {
            const [px, py] = pts[i];
            const isHigh = (i === 0 || py <= pts[i - 1][1]) && (i === pts.length - 1 || py <= pts[i + 1]?.[1]);
            if (LABELS[i]) {
                this.graphicGroup.add(new echarts.graphic.Text({ style: { text: LABELS[i], x: px, y: isHigh ? py - 14 : py + 16, fill: '#e2e8f0', fontSize: 11, fontWeight: 'bold', align: 'center', verticalAlign: 'middle' }, silent: true }));
            }
            this.graphicGroup.add(new echarts.graphic.Circle({ shape: { cx: px, cy: py, r: 4 }, style: { fill: '#fff', stroke: '#3b82f6', lineWidth: 1.5 }, z: 101, silent: true }));
        }
    }

    private saveDrawing() {
        const dataPoints = this.points.map((pt) => this.context.coordinateConversion.pixelToData({ x: pt[0], y: pt[1] }));
        if (dataPoints.every((p) => p !== null)) {
            this.context.addDrawing({ id: `3drives-${Date.now()}`, type: 'three_drives_pattern', points: dataPoints as any[], paneIndex: dataPoints[0]!.paneIndex || 0, style: { color: '#3b82f6', lineWidth: 2 } });
        }
    }
}
