import { AbstractPlugin } from '../../components/AbstractPlugin';
import { ExtendedLineDrawingRenderer } from './ExtendedLineDrawingRenderer';
import * as echarts from 'echarts';

const COLOR = '#d1d4dc';

type PluginState = 'idle' | 'drawing' | 'finished';

export class ExtendedLineTool extends AbstractPlugin {
    private zr!: any;
    private state: PluginState = 'idle';
    private startPoint: number[] | null = null;
    private endPoint: number[] | null = null;
    private group: any = null;
    private line: any = null;
    private dashLineForward: any = null;
    private dashLineBackward: any = null;
    private startCircle: any = null;
    private endCircle: any = null;

    constructor(options: { name?: string; icon?: string } = {}) {
        super({
            id: 'extended-line-tool',
            name: options?.name || 'Extended Line',
            icon: options?.icon || `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="23" x2="23" y2="1" stroke-dasharray="2,2" opacity="0.4"/><line x1="6" y1="18" x2="18" y2="6"/></svg>`,
        });
    }

    protected onInit(): void {
        this.zr = this.chart.getZr();
        this.context.registerDrawingRenderer(new ExtendedLineDrawingRenderer());
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
                        id: `extended-line-${Date.now()}`,
                        type: 'extended-line',
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
        this.dashLineForward = new echarts.graphic.Line({
            shape: { x1: 0, y1: 0, x2: 0, y2: 0 },
            style: { stroke: COLOR, lineWidth: 1, lineDash: [4, 4], opacity: 0.5 },
            z: 99,
        });
        this.dashLineBackward = new echarts.graphic.Line({
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
        this.group.add(this.dashLineBackward);
        this.group.add(this.dashLineForward);
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

        const dx = x2 - x1;
        const dy = y2 - y1;
        if (dx === 0 && dy === 0) return;

        // Dashed extension forward (past p2)
        const [fwX, fwY] = this.extendToEdge(x1, y1, dx, dy);
        this.dashLineForward.setShape({ x1: x2, y1: y2, x2: fwX, y2: fwY });

        // Dashed extension backward (past p1)
        const [bwX, bwY] = this.extendToEdge(x2, y2, -dx, -dy);
        this.dashLineBackward.setShape({ x1: x1, y1: y1, x2: bwX, y2: bwY });
    }

    private extendToEdge(ox: number, oy: number, dx: number, dy: number): [number, number] {
        const w = this.chart.getWidth();
        const h = this.chart.getHeight();
        let tMax = Infinity;
        if (dx !== 0) {
            const tx = dx > 0 ? (w - ox) / dx : -ox / dx;
            if (tx > 0) tMax = Math.min(tMax, tx);
        }
        if (dy !== 0) {
            const ty = dy > 0 ? (h - oy) / dy : -oy / dy;
            if (ty > 0) tMax = Math.min(tMax, ty);
        }
        if (!isFinite(tMax)) tMax = 1;
        return [ox + tMax * dx, oy + tMax * dy];
    }
}
