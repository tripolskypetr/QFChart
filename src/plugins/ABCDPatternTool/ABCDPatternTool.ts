import * as echarts from 'echarts';
import { AbstractPlugin } from '../../components/AbstractPlugin';
import { ABCDPatternDrawingRenderer } from './ABCDPatternDrawingRenderer';

const LABELS = ['A', 'B', 'C', 'D'];
const LEG_COLORS = ['#2196f3', '#ff9800', '#4caf50'];
const TOTAL_POINTS = 4;

export class ABCDPatternTool extends AbstractPlugin {
    private points: number[][] = [];
    private state: 'idle' | 'drawing' | 'finished' = 'idle';
    private graphicGroup: any = null;

    constructor(options: { name?: string; icon?: string } = {}) {
        super({
            id: 'abcd-pattern-tool',
            name: options.name || 'ABCD Pattern',
            icon: options.icon || `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#e3e3e3" stroke-width="1.5"><polyline points="3,18 8,5 15,15 21,3"/><circle cx="3" cy="18" r="1.5" fill="#e3e3e3"/><circle cx="8" cy="5" r="1.5" fill="#e3e3e3"/><circle cx="15" cy="15" r="1.5" fill="#e3e3e3"/><circle cx="21" cy="3" r="1.5" fill="#e3e3e3"/></svg>`,
        });
    }

    protected onInit(): void {
        this.context.registerDrawingRenderer(new ABCDPatternDrawingRenderer());
    }

    protected onActivate(): void {
        this.state = 'idle';
        this.points = [];
        this.context.getChart().getZr().setCursorStyle('crosshair');
        const zr = this.context.getChart().getZr();
        zr.on('click', this.onClick);
        zr.on('mousemove', this.onMouseMove);
    }

    protected onDeactivate(): void {
        this.state = 'idle';
        this.points = [];
        this.removeGraphic();
        const zr = this.context.getChart().getZr();
        zr.off('click', this.onClick);
        zr.off('mousemove', this.onMouseMove);
        this.context.getChart().getZr().setCursorStyle('default');
    }

    private onClick = (params: any) => {
        const pt = this.getPoint(params);
        if (this.state === 'idle') {
            this.state = 'drawing';
            this.points = [pt, [...pt]];
            this.initGraphic();
            this.updateGraphic();
        } else if (this.state === 'drawing') {
            this.points[this.points.length - 1] = pt;
            if (this.points.length >= TOTAL_POINTS) {
                this.state = 'finished';
                this.updateGraphic();
                this.saveDrawing();
                this.removeGraphic();
                this.context.disableTools();
            } else {
                this.points.push([...pt]);
                this.updateGraphic();
            }
        }
    };

    private onMouseMove = (params: any) => {
        if (this.state !== 'drawing' || this.points.length < 2) return;
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

        // Fills
        if (pts.length >= 3) {
            this.graphicGroup.add(new echarts.graphic.Polygon({ shape: { points: pts.slice(0, 3) }, style: { fill: 'rgba(33,150,243,0.08)' }, silent: true }));
        }
        if (pts.length >= 4) {
            this.graphicGroup.add(new echarts.graphic.Polygon({ shape: { points: pts.slice(1, 4) }, style: { fill: 'rgba(244,67,54,0.08)' }, silent: true }));
        }

        // Legs
        for (let i = 0; i < pts.length - 1; i++) {
            this.graphicGroup.add(new echarts.graphic.Line({
                shape: { x1: pts[i][0], y1: pts[i][1], x2: pts[i + 1][0], y2: pts[i + 1][1] },
                style: { stroke: LEG_COLORS[i % LEG_COLORS.length], lineWidth: 2 },
                silent: true,
            }));
        }

        // Dashed connectors
        if (pts.length >= 3) {
            this.graphicGroup.add(new echarts.graphic.Line({ shape: { x1: pts[0][0], y1: pts[0][1], x2: pts[2][0], y2: pts[2][1] }, style: { stroke: '#555', lineWidth: 1, lineDash: [4, 4] }, silent: true }));
        }
        if (pts.length >= 4) {
            this.graphicGroup.add(new echarts.graphic.Line({ shape: { x1: pts[1][0], y1: pts[1][1], x2: pts[3][0], y2: pts[3][1] }, style: { stroke: '#555', lineWidth: 1, lineDash: [4, 4] }, silent: true }));
        }

        // Labels & circles
        for (let i = 0; i < pts.length && i < LABELS.length; i++) {
            const [px, py] = pts[i];
            const isHigh = (i === 0 || py <= pts[i - 1][1]) && (i === pts.length - 1 || py <= pts[i + 1]?.[1]);
            this.graphicGroup.add(new echarts.graphic.Text({ style: { text: LABELS[i], x: px, y: isHigh ? py - 14 : py + 16, fill: '#e2e8f0', fontSize: 12, fontWeight: 'bold', align: 'center', verticalAlign: 'middle' }, silent: true }));
            this.graphicGroup.add(new echarts.graphic.Circle({ shape: { cx: px, cy: py, r: 4 }, style: { fill: '#fff', stroke: '#3b82f6', lineWidth: 1.5 }, z: 101, silent: true }));
        }
    }

    private saveDrawing() {
        const dataPoints = this.points.map((pt) => this.context.coordinateConversion.pixelToData({ x: pt[0], y: pt[1] }));
        if (dataPoints.every((p) => p !== null)) {
            this.context.addDrawing({
                id: `abcd-${Date.now()}`,
                type: 'abcd_pattern',
                points: dataPoints as any[],
                paneIndex: dataPoints[0]!.paneIndex || 0,
                style: { color: '#3b82f6', lineWidth: 2 },
            });
        }
    }
}
