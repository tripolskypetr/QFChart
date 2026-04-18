import { AbstractPlugin } from '../../components/AbstractPlugin';
import { InfoLineDrawingRenderer } from './InfoLineDrawingRenderer';
import * as echarts from 'echarts';

type PluginState = 'idle' | 'drawing' | 'finished';

export class InfoLineTool extends AbstractPlugin {
    private zr!: any;
    private state: PluginState = 'idle';
    private startPoint: number[] | null = null;
    private endPoint: number[] | null = null;
    private group: any = null;
    private line: any = null;
    private startCircle: any = null;
    private endCircle: any = null;

    constructor(options: { name?: string; icon?: string } = {}) {
        super({
            id: 'info-line-tool',
            name: options?.name || 'Info Line',
            icon: options?.icon || `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="2" y1="22" x2="22" y2="2"/><rect x="12" y="8" width="8" height="5" rx="1" fill="none" stroke-width="1.5"/></svg>`,
        });
    }

    protected onInit(): void {
        this.zr = this.chart.getZr();
        this.context.registerDrawingRenderer(new InfoLineDrawingRenderer());
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
            this.updateGraphic();

            if (this.startPoint && this.endPoint) {
                const start = this.context.coordinateConversion.pixelToData({
                    x: this.startPoint[0], y: this.startPoint[1],
                });
                const end = this.context.coordinateConversion.pixelToData({
                    x: this.endPoint[0], y: this.endPoint[1],
                });

                if (start && end) {
                    this.context.addDrawing({
                        id: `info-line-${Date.now()}`,
                        type: 'info-line',
                        points: [start, end],
                        paneIndex: start.paneIndex || 0,
                        style: { color: '#d1d4dc', lineWidth: 1 },
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
            style: { stroke: '#d1d4dc', lineWidth: 1 },
            z: 100,
        });
        this.startCircle = new echarts.graphic.Circle({
            shape: { cx: 0, cy: 0, r: 4 },
            style: { fill: '#fff', stroke: '#d1d4dc', lineWidth: 1 },
            z: 101,
        });
        this.endCircle = new echarts.graphic.Circle({
            shape: { cx: 0, cy: 0, r: 4 },
            style: { fill: '#fff', stroke: '#d1d4dc', lineWidth: 1 },
            z: 101,
        });
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
    }
}
