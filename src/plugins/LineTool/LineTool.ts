import { AbstractPlugin } from '../../components/AbstractPlugin';
import { LineDrawingRenderer } from './LineDrawingRenderer';
import * as echarts from 'echarts';

type PluginState = 'idle' | 'drawing' | 'finished';

export class LineTool extends AbstractPlugin {
    private zr!: any;
    private state: PluginState = 'idle';
    private startPoint: number[] | null = null;
    private endPoint: number[] | null = null;

    // ZRender Elements
    private group: any = null;
    private line: any = null;
    private startCircle: any = null;
    private endCircle: any = null;

    constructor(options: { name?: string; icon?: string } = {}) {
        super({
            id: 'trend-line',
            name: options?.name || 'Trend Line',
            icon:
                options?.icon ||
                `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="2" y1="22" x2="22" y2="2" /></svg>`,
        });
    }

    protected onInit(): void {
        this.zr = this.chart.getZr();
        this.context.registerDrawingRenderer(new LineDrawingRenderer());
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

        // @ts-ignore - state type comparison
        if (this.state === 'drawing') {
            this.removeGraphic();
        }
    }

    protected onDestroy(): void {
        this.removeGraphic();
    }

    // --- Interaction Handlers ---

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

            // Convert to native chart drawing
            if (this.startPoint && this.endPoint) {
                const start = this.context.coordinateConversion.pixelToData({
                    x: this.startPoint[0],
                    y: this.startPoint[1],
                });
                const end = this.context.coordinateConversion.pixelToData({
                    x: this.endPoint[0],
                    y: this.endPoint[1],
                });

                if (start && end) {
                    const paneIndex = start.paneIndex || 0;

                    this.context.addDrawing({
                        id: `line-${Date.now()}`,
                        type: 'line',
                        points: [start, end],
                        paneIndex: paneIndex,
                        style: {
                            color: '#d1d4dc',
                            lineWidth: 1,
                        },
                    });
                }
            }

            // Cleanup local ZRender graphic as it's now part of the chart series
            this.removeGraphic();
            this.context.disableTools();
        }
    };

    private onMouseMove = (params: any) => {
        if (this.state !== 'drawing') return;
        this.endPoint = this.getPoint(params);
        this.updateGraphic();
    };

    // --- Graphics ---

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
