import { AbstractPlugin } from '../../components/AbstractPlugin';
import { TrendAngleDrawingRenderer } from './TrendAngleDrawingRenderer';
import * as echarts from 'echarts';

const COLOR = '#d1d4dc';

type PluginState = 'idle' | 'drawing' | 'finished';

export class TrendAngleTool extends AbstractPlugin {
    private zr!: any;
    private state: PluginState = 'idle';
    private startPoint: number[] | null = null;
    private endPoint: number[] | null = null;
    private group: any = null;
    private line: any = null;
    private hRefLine: any = null;
    private arc: any = null;
    private angleText: any = null;
    private startCircle: any = null;
    private endCircle: any = null;

    constructor(options: { name?: string; icon?: string } = {}) {
        super({
            id: 'trend-angle-tool',
            name: options?.name || 'Trend Angle',
            icon: options?.icon || `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="20" x2="21" y2="6"/><line x1="3" y1="20" x2="14" y2="20" opacity="0.4"/><path d="M8 20 A5 5 0 0 1 7 16" stroke-width="1.5"/></svg>`,
        });
    }

    protected onInit(): void {
        this.zr = this.chart.getZr();
        this.context.registerDrawingRenderer(new TrendAngleDrawingRenderer());
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
                        id: `trend-angle-${Date.now()}`,
                        type: 'trend-angle',
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
        this.hRefLine = new echarts.graphic.Line({
            shape: { x1: 0, y1: 0, x2: 0, y2: 0 },
            style: { stroke: COLOR, lineWidth: 1, lineDash: [4, 4], opacity: 0.4 },
            z: 99,
        });
        this.arc = new echarts.graphic.Arc({
            shape: { cx: 0, cy: 0, r: 25, startAngle: 0, endAngle: 0 },
            style: { stroke: COLOR, lineWidth: 1, fill: 'none' },
            z: 99,
        });
        this.angleText = new echarts.graphic.Text({
            style: { text: '', fill: COLOR, fontSize: 11, fontFamily: 'sans-serif' },
            z: 101,
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
        this.group.add(this.hRefLine);
        this.group.add(this.arc);
        this.group.add(this.line);
        this.group.add(this.angleText);
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

        // Horizontal reference from p1
        const hLen = Math.max(Math.abs(dx), 40);
        this.hRefLine.setShape({ x1, y1, x2: x1 + hLen, y2: y1 });

        // Angle (negate dy for natural angle since screen Y is inverted)
        const angleRad = Math.atan2(-dy, dx);
        const angleDeg = angleRad * (180 / Math.PI);
        const arcR = Math.min(25, Math.sqrt(dx * dx + dy * dy) * 0.3);

        // Arc from 0 (horizontal) to the line angle
        const screenAngle = Math.atan2(dy, dx); // screen-space angle
        const arcStart = Math.min(0, screenAngle);
        const arcEnd = Math.max(0, screenAngle);
        this.arc.setShape({ cx: x1, cy: y1, r: arcR, startAngle: arcStart, endAngle: arcEnd });

        // Angle label
        this.angleText.setStyle({ text: `${angleDeg.toFixed(1)}\u00B0` });
        this.angleText.x = x1 + arcR + 6;
        this.angleText.y = y1 + (dy < 0 ? -14 : 2);
        this.angleText.markRedraw();
    }
}
