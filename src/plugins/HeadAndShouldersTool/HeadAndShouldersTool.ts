import * as echarts from 'echarts';
import { AbstractPlugin } from '../../components/AbstractPlugin';
import { HeadAndShouldersDrawingRenderer } from './HeadAndShouldersDrawingRenderer';

const LABELS = ['', 'LS', '', 'H', '', 'RS', ''];
const TOTAL_POINTS = 7;

export class HeadAndShouldersTool extends AbstractPlugin {
    private points: number[][] = [];
    private state: 'idle' | 'drawing' | 'finished' = 'idle';
    private graphicGroup: any = null;

    constructor(options: { name?: string; icon?: string } = {}) {
        super({
            id: 'head-and-shoulders-tool',
            name: options.name || 'Head & Shoulders',
            icon: options.icon || `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#e3e3e3" stroke-width="1.5"><polyline points="1,18 4,10 7,14 12,3 17,14 20,10 23,18"/></svg>`,
        });
    }

    protected onInit(): void { this.context.registerDrawingRenderer(new HeadAndShouldersDrawingRenderer()); }

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
        if (pts.length >= 5) this.graphicGroup.add(new echarts.graphic.Polygon({ shape: { points: pts.slice(2, 5) }, style: { fill: 'rgba(244,67,54,0.08)' }, silent: true }));
        if (pts.length >= 7) this.graphicGroup.add(new echarts.graphic.Polygon({ shape: { points: pts.slice(4, 7) }, style: { fill: 'rgba(33,150,243,0.06)' }, silent: true }));

        // Zigzag
        for (let i = 0; i < pts.length - 1; i++) {
            this.graphicGroup.add(new echarts.graphic.Line({ shape: { x1: pts[i][0], y1: pts[i][1], x2: pts[i + 1][0], y2: pts[i + 1][1] }, style: { stroke: '#2196f3', lineWidth: 2 }, silent: true }));
        }

        // Neckline
        if (pts.length >= 5) {
            const [nx1, ny1] = pts[2];
            const [nx2, ny2] = pts[4];
            const dx = nx2 - nx1; const dy = ny2 - ny1;
            this.graphicGroup.add(new echarts.graphic.Line({ shape: { x1: nx1 - dx * 0.3, y1: ny1 - dy * 0.3, x2: nx2 + dx * 0.3, y2: ny2 + dy * 0.3 }, style: { stroke: '#ff9800', lineWidth: 2, lineDash: [6, 4] }, silent: true }));
        }

        // Labels & circles
        for (let i = 0; i < pts.length && i < LABELS.length; i++) {
            const [px, py] = pts[i];
            const isHigh = (i === 0 || py <= pts[i - 1][1]) && (i === pts.length - 1 || py <= pts[i + 1]?.[1]);
            if (LABELS[i]) {
                this.graphicGroup.add(new echarts.graphic.Text({ style: { text: LABELS[i], x: px, y: isHigh ? py - 14 : py + 16, fill: '#e2e8f0', fontSize: 12, fontWeight: 'bold', align: 'center', verticalAlign: 'middle' }, silent: true }));
            }
            this.graphicGroup.add(new echarts.graphic.Circle({ shape: { cx: px, cy: py, r: 4 }, style: { fill: '#fff', stroke: '#3b82f6', lineWidth: 1.5 }, z: 101, silent: true }));
        }
    }

    private saveDrawing() {
        const dataPoints = this.points.map((pt) => this.context.coordinateConversion.pixelToData({ x: pt[0], y: pt[1] }));
        if (dataPoints.every((p) => p !== null)) {
            this.context.addDrawing({ id: `hs-${Date.now()}`, type: 'head_and_shoulders', points: dataPoints as any[], paneIndex: dataPoints[0]!.paneIndex || 0, style: { color: '#3b82f6', lineWidth: 2 } });
        }
    }
}
