import * as echarts from 'echarts';
import { AbstractPlugin } from '../../components/AbstractPlugin';
import { CypherPatternDrawingRenderer } from './CypherPatternDrawingRenderer';

const LABELS = ['X', 'A', 'B', 'C', 'D'];
const LEG_COLORS = ['#00bcd4', '#e91e63', '#8bc34a', '#ff5722'];
const TOTAL_POINTS = 5;

export class CypherPatternTool extends AbstractPlugin {
    private points: number[][] = [];
    private state: 'idle' | 'drawing' | 'finished' = 'idle';
    private graphicGroup: any = null;

    constructor(options: { name?: string; icon?: string } = {}) {
        super({
            id: 'cypher-pattern-tool',
            name: options.name || 'Cypher Pattern',
            icon: options.icon || `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#e3e3e3" stroke-width="1.5"><polyline points="2,16 7,4 11,12 17,2 22,14"/><circle cx="2" cy="16" r="1.5" fill="#e3e3e3"/><circle cx="7" cy="4" r="1.5" fill="#e3e3e3"/><circle cx="11" cy="12" r="1.5" fill="#e3e3e3"/><circle cx="17" cy="2" r="1.5" fill="#e3e3e3"/><circle cx="22" cy="14" r="1.5" fill="#e3e3e3"/></svg>`,
        });
    }

    protected onInit(): void { this.context.registerDrawingRenderer(new CypherPatternDrawingRenderer()); }

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

        if (pts.length >= 3) this.graphicGroup.add(new echarts.graphic.Polygon({ shape: { points: pts.slice(0, 3) }, style: { fill: 'rgba(0,188,212,0.08)' }, silent: true }));
        if (pts.length >= 5) this.graphicGroup.add(new echarts.graphic.Polygon({ shape: { points: pts.slice(2, 5) }, style: { fill: 'rgba(233,30,99,0.08)' }, silent: true }));

        for (let i = 0; i < pts.length - 1; i++) {
            this.graphicGroup.add(new echarts.graphic.Line({ shape: { x1: pts[i][0], y1: pts[i][1], x2: pts[i + 1][0], y2: pts[i + 1][1] }, style: { stroke: LEG_COLORS[i % LEG_COLORS.length], lineWidth: 2 }, silent: true }));
        }

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
            this.context.addDrawing({ id: `cypher-${Date.now()}`, type: 'cypher_pattern', points: dataPoints as any[], paneIndex: dataPoints[0]!.paneIndex || 0, style: { color: '#3b82f6', lineWidth: 2 } });
        }
    }
}
