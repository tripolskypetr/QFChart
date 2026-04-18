import { AbstractPlugin } from '../../components/AbstractPlugin';
import { RayDrawingRenderer } from './RayDrawingRenderer';
import * as echarts from 'echarts';

const COLOR = '#d1d4dc';

type PluginState = 'idle' | 'drawing' | 'finished';

export class RayTool extends AbstractPlugin {
    private zr!: any;
    private state: PluginState = 'idle';
    private startPoint: number[] | null = null;
    private endPoint: number[] | null = null;
    private group: any = null;
    private line: any = null;
    private dashLine: any = null;
    private startCircle: any = null;
    private endCircle: any = null;

    constructor(options: { name?: string; icon?: string } = {}) {
        super({
            id: 'ray-tool',
            name: options?.name || 'Ray',
            icon: options?.icon || `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="20" x2="21" y2="4"/><circle cx="21" cy="4" r="0" fill="currentColor"/><polyline points="16,4 21,4 21,9" stroke-width="1.5"/></svg>`,
        });
    }

    protected onInit(): void {
        this.zr = this.chart.getZr();
        this.context.registerDrawingRenderer(new RayDrawingRenderer());
    }

    protected onActivate(): void {
        this.state = 'idle';
        this.chart.getZr().setCursorStyle('crosshair');
        this.zr.on('click', this.onClick);
        this.zr.on('mousemove', this.onMouseMove);
    }

    protected onDeactivate(): void {
        this.state = 'idle';
        this.chart.getZr().setCursorStyle('default');
        this.zr.off('click', this.onClick);
        this.zr.off('mousemove', this.onMouseMove);
        this.removeGraphic();
    }

    protected onDestroy(): void {
        this.removeGraphic();
    }

    private onClick = (params: any) => {
        if (this.state === 'idle') {
            this.state = 'drawing';
            this.startPoint = this.getPoint(params);
            this.endPoint = this.getPoint(params);
            this.initGraphic();
            this.updateGraphic();
        } else if (this.state === 'drawing') {
            this.state = 'finished';
            this.endPoint = this.getPoint(params);

            if (this.startPoint && this.endPoint) {
                const start = this.context.coordinateConversion.pixelToData({
                    x: this.startPoint[0], y: this.startPoint[1],
                });
                const end = this.context.coordinateConversion.pixelToData({
                    x: this.endPoint[0], y: this.endPoint[1],
                });

                if (start && end) {
                    this.context.addDrawing({
                        id: `ray-${Date.now()}`,
                        type: 'ray',
                        points: [start, end],
                        paneIndex: start.paneIndex || 0,
                        style: { color: COLOR, lineWidth: 1 },
                    });
                }
            }

            this.removeGraphic();
            this.context.disableTools();
        }
    };

    private onMouseMove = (params: any) => {
        if (this.state !== 'drawing') return;
        this.endPoint = this.getPoint(params);
        this.updateGraphic();
    };

    private initGraphic(): void {
        if (this.group) return;
        this.group = new echarts.graphic.Group();
        this.line = new echarts.graphic.Line({
            shape: { x1: 0, y1: 0, x2: 0, y2: 0 },
            style: { stroke: COLOR, lineWidth: 1 },
            z: 100,
        });
        this.dashLine = new echarts.graphic.Line({
            shape: { x1: 0, y1: 0, x2: 0, y2: 0 },
            style: { stroke: COLOR, lineWidth: 1, lineDash: [4, 4], opacity: 0.5 },
            z: 99,
        });
        this.startCircle = new echarts.graphic.Circle({
            shape: { cx: 0, cy: 0, r: 4 },
            style: { fill: '#fff', stroke: COLOR, lineWidth: 1 },
            z: 101,
        });
        this.endCircle = new echarts.graphic.Circle({
            shape: { cx: 0, cy: 0, r: 4 },
            style: { fill: '#fff', stroke: COLOR, lineWidth: 1 },
            z: 101,
        });
        this.group.add(this.dashLine);
        this.group.add(this.line);
        this.group.add(this.startCircle);
        this.group.add(this.endCircle);
        this.zr.add(this.group);
    }

    private removeGraphic(): void {
        if (this.group) {
            this.zr.remove(this.group);
            this.group = null;
        }
    }

    private updateGraphic(): void {
        if (!this.startPoint || !this.endPoint || !this.group) return;
        const [x1, y1] = this.startPoint;
        const [x2, y2] = this.endPoint;
        this.line.setShape({ x1, y1, x2, y2 });
        this.startCircle.setShape({ cx: x1, cy: y1 });
        this.endCircle.setShape({ cx: x2, cy: y2 });

        // Dashed extension from p2 to chart edge
        const [ex, ey] = this.extendToEdge(x1, y1, x2, y2);
        this.dashLine.setShape({ x1: x2, y1: y2, x2: ex, y2: ey });
    }

    private extendToEdge(x1: number, y1: number, x2: number, y2: number): [number, number] {
        const dx = x2 - x1;
        const dy = y2 - y1;
        if (dx === 0 && dy === 0) return [x2, y2];

        const w = this.chart.getWidth();
        const h = this.chart.getHeight();
        let tMax = Infinity;
        if (dx !== 0) {
            const tx = dx > 0 ? (w - x1) / dx : -x1 / dx;
            if (tx > 0) tMax = Math.min(tMax, tx);
        }
        if (dy !== 0) {
            const ty = dy > 0 ? (h - y1) / dy : -y1 / dy;
            if (ty > 0) tMax = Math.min(tMax, ty);
        }
        if (!isFinite(tMax)) tMax = 1;
        return [x1 + tMax * dx, y1 + tMax * dy];
    }
}
