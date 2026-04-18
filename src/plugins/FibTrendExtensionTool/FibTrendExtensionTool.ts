import * as echarts from 'echarts';
import { AbstractPlugin } from '../../components/AbstractPlugin';
import { FibTrendExtensionDrawingRenderer } from './FibTrendExtensionDrawingRenderer';

const LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.272, 1.618, 2, 2.618];
const COLORS = [
    '#787b86', '#f44336', '#ff9800', '#4caf50', '#2196f3',
    '#00bcd4', '#787b86', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5',
];

export class FibTrendExtensionTool extends AbstractPlugin {
    private points: number[][] = [];
    private state: 'idle' | 'drawing-trend' | 'drawing-retracement' | 'finished' = 'idle';
    private graphicGroup: any = null;

    constructor(options: { name?: string; icon?: string } = {}) {
        super({
            id: 'fib-trend-extension-tool',
            name: options.name || 'Fib Trend Extension',
            icon: options.icon || `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M120-80v-80h720v80H120Zm0-160v-80h720v80H120Zm0-160v-80h720v80H120Zm0-160v-80h720v80H120Zm0-160v-80h720v80H120Zm0-160v-80h720v80H120Z"/></svg>`,
        });
    }

    protected onInit(): void {
        this.context.registerDrawingRenderer(new FibTrendExtensionDrawingRenderer());
    }

    protected onActivate(): void {
        this.state = 'idle';
        this.points = [];
        this.context.getChart().getZr().setCursorStyle('crosshair');
        this.bindEvents();
    }

    protected onDeactivate(): void {
        this.state = 'idle';
        this.points = [];
        this.removeGraphic();
        this.unbindEvents();
        this.context.getChart().getZr().setCursorStyle('default');
    }

    private bindEvents() {
        const zr = this.context.getChart().getZr();
        zr.on('click', this.onClick);
        zr.on('mousemove', this.onMouseMove);
    }

    private unbindEvents() {
        const zr = this.context.getChart().getZr();
        zr.off('click', this.onClick);
        zr.off('mousemove', this.onMouseMove);
    }

    private onClick = (params: any) => {
        const pt = this.getPoint(params);

        if (this.state === 'idle') {
            this.state = 'drawing-trend';
            this.points = [pt, [...pt]];
            this.initGraphic();
            this.updateGraphic();
        } else if (this.state === 'drawing-trend') {
            this.state = 'drawing-retracement';
            this.points[1] = pt;
            this.points.push([...pt]);
            this.updateGraphic();
        } else if (this.state === 'drawing-retracement') {
            this.state = 'finished';
            this.points[2] = pt;
            this.updateGraphic();
            this.saveDrawing();
            this.removeGraphic();
            this.context.disableTools();
        }
    };

    private onMouseMove = (params: any) => {
        if (this.state === 'drawing-trend') {
            this.points[1] = this.getPoint(params);
            this.updateGraphic();
        } else if (this.state === 'drawing-retracement') {
            this.points[2] = this.getPoint(params);
            this.updateGraphic();
        }
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

        const [x1, y1] = this.points[0];
        const [x2, y2] = this.points[1];

        // Trend line
        this.graphicGroup.add(new echarts.graphic.Line({
            shape: { x1, y1, x2, y2 },
            style: { stroke: '#2196f3', lineWidth: 1.5, lineDash: [5, 4] },
            silent: true,
        }));

        if (this.points.length >= 3) {
            const [x3, y3] = this.points[2];

            // Retracement line
            this.graphicGroup.add(new echarts.graphic.Line({
                shape: { x1: x2, y1: y2, x2: x3, y2: y3 },
                style: { stroke: '#ff9800', lineWidth: 1.5, lineDash: [5, 4] },
                silent: true,
            }));

            // Extension levels
            const trendPixelDy = y2 - y1;
            const minX = Math.min(x1, x2, x3);
            const maxX = Math.max(x1, x2, x3);
            const extraWidth = (maxX - minX) * 0.5;
            const lineLeft = minX;
            const lineRight = maxX + extraWidth;

            for (let i = 0; i < LEVELS.length; i++) {
                const level = LEVELS[i];
                const ly = y3 + trendPixelDy * level;
                const lColor = COLORS[i % COLORS.length];

                this.graphicGroup.add(new echarts.graphic.Line({
                    shape: { x1: lineLeft, y1: ly, x2: lineRight, y2: ly },
                    style: { stroke: lColor, lineWidth: 1 },
                    silent: true,
                }));

                this.graphicGroup.add(new echarts.graphic.Text({
                    style: { text: `${level}`, x: lineRight + 4, y: ly - 6, fill: lColor, fontSize: 9 },
                    silent: true,
                }));

                // Fill between levels
                if (i < LEVELS.length - 1) {
                    const nextLy = y3 + trendPixelDy * LEVELS[i + 1];
                    const rectY = Math.min(ly, nextLy);
                    const rectH = Math.abs(nextLy - ly);
                    this.graphicGroup.add(new echarts.graphic.Rect({
                        shape: { x: lineLeft, y: rectY, width: lineRight - lineLeft, height: rectH },
                        style: { fill: COLORS[(i + 1) % COLORS.length], opacity: 0.06 },
                        silent: true,
                    }));
                }
            }
        }

        // Point circles
        for (const pt of this.points) {
            this.graphicGroup.add(new echarts.graphic.Circle({
                shape: { cx: pt[0], cy: pt[1], r: 4 },
                style: { fill: '#fff', stroke: '#3b82f6', lineWidth: 1.5 },
                z: 101,
                silent: true,
            }));
        }
    }

    private saveDrawing() {
        const dataPoints = this.points.map((pt) =>
            this.context.coordinateConversion.pixelToData({ x: pt[0], y: pt[1] }),
        );

        if (dataPoints.every((p) => p !== null)) {
            this.context.addDrawing({
                id: `fib-ext-${Date.now()}`,
                type: 'fib_trend_extension',
                points: dataPoints as any[],
                paneIndex: dataPoints[0]!.paneIndex || 0,
                style: { color: '#3b82f6', lineWidth: 1 },
            });
        }
    }
}
