import * as echarts from 'echarts';
import { AbstractPlugin } from '../../components/AbstractPlugin';
import { FibSpeedResistanceFanDrawingRenderer } from './FibSpeedResistanceFanDrawingRenderer';

const LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
const COLORS = ['#787b86', '#f44336', '#ff9800', '#4caf50', '#2196f3', '#00bcd4', '#787b86'];

export class FibSpeedResistanceFanTool extends AbstractPlugin {
    private startPoint: number[] | null = null;
    private endPoint: number[] | null = null;
    private state: 'idle' | 'drawing' | 'finished' = 'idle';

    // Temporary ZRender elements
    private graphicGroup: any = null;

    constructor(options: { name?: string; icon?: string } = {}) {
        super({
            id: 'fib-speed-resistance-fan-tool',
            name: options.name || 'Fib Speed Resistance Fan',
            icon:
                options.icon ||
                `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#e3e3e3"><path d="M2 21L22 3M2 21l20-6M2 21l20-9M2 21l20-12M2 21l20-15M2 21l6-18M2 21l9-18M2 21l12-18M2 21l15-18" stroke="#e3e3e3" stroke-width="1" fill="none"/></svg>`,
        });
    }

    protected onInit(): void {
        this.context.registerDrawingRenderer(new FibSpeedResistanceFanDrawingRenderer());
    }

    protected onActivate(): void {
        this.state = 'idle';
        this.startPoint = null;
        this.endPoint = null;
        this.context.getChart().getZr().setCursorStyle('crosshair');
        this.bindEvents();
    }

    protected onDeactivate(): void {
        this.state = 'idle';
        this.startPoint = null;
        this.endPoint = null;
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
            this.saveDrawing();

            this.removeGraphic();
            this.context.disableTools();
        }
    };

    private onMouseMove = (params: any) => {
        if (this.state === 'drawing') {
            this.endPoint = this.getPoint(params);
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
        if (!this.graphicGroup || !this.startPoint || !this.endPoint) return;
        this.graphicGroup.removeAll();

        const x1 = this.startPoint[0];
        const y1 = this.startPoint[1];
        const x2 = this.endPoint[0];
        const y2 = this.endPoint[1];

        const dx = x2 - x1;
        const dy = y2 - y1;

        // Price rays and time rays
        LEVELS.forEach((level, index) => {
            const color = COLORS[index % COLORS.length];

            // Price ray: start → (x1 + dx, y1 + dy * level)
            this.graphicGroup.add(
                new echarts.graphic.Line({
                    shape: { x1, y1, x2: x1 + dx, y2: y1 + dy * level },
                    style: { stroke: color, lineWidth: 1 },
                    silent: true,
                }),
            );

            // Time ray: start → (x1 + dx * level, y1 + dy)
            this.graphicGroup.add(
                new echarts.graphic.Line({
                    shape: { x1, y1, x2: x1 + dx * level, y2: y1 + dy },
                    style: { stroke: color, lineWidth: 1 },
                    silent: true,
                }),
            );
        });

        // Fill between adjacent price rays
        for (let i = 0; i < LEVELS.length - 1; i++) {
            const pr1: [number, number] = [x1 + dx, y1 + dy * LEVELS[i]];
            const pr2: [number, number] = [x1 + dx, y1 + dy * LEVELS[i + 1]];

            this.graphicGroup.add(
                new echarts.graphic.Polygon({
                    shape: { points: [[x1, y1], pr1, pr2] },
                    style: { fill: COLORS[(i + 1) % COLORS.length], opacity: 0.06 },
                    silent: true,
                }),
            );
        }

        // Fill between adjacent time rays
        for (let i = 0; i < LEVELS.length - 1; i++) {
            const tr1: [number, number] = [x1 + dx * LEVELS[i], y1 + dy];
            const tr2: [number, number] = [x1 + dx * LEVELS[i + 1], y1 + dy];

            this.graphicGroup.add(
                new echarts.graphic.Polygon({
                    shape: { points: [[x1, y1], tr1, tr2] },
                    style: { fill: COLORS[(i + 1) % COLORS.length], opacity: 0.06 },
                    silent: true,
                }),
            );
        }

        // Bounding box edges
        this.graphicGroup.add(
            new echarts.graphic.Line({
                shape: { x1: x2, y1, x2, y2 },
                style: { stroke: '#555', lineWidth: 1, lineDash: [3, 3] },
                silent: true,
            }),
        );
        this.graphicGroup.add(
            new echarts.graphic.Line({
                shape: { x1, y1: y2, x2, y2 },
                style: { stroke: '#555', lineWidth: 1, lineDash: [3, 3] },
                silent: true,
            }),
        );

        // Diagonal
        this.graphicGroup.add(
            new echarts.graphic.Line({
                shape: { x1, y1, x2, y2 },
                style: { stroke: '#999', lineWidth: 1, lineDash: [4, 4] },
                silent: true,
            }),
        );
    }

    private saveDrawing() {
        if (!this.startPoint || !this.endPoint) return;

        const start = this.context.coordinateConversion.pixelToData({
            x: this.startPoint[0],
            y: this.startPoint[1],
        });
        const end = this.context.coordinateConversion.pixelToData({
            x: this.endPoint[0],
            y: this.endPoint[1],
        });

        if (start && end) {
            this.context.addDrawing({
                id: `fib-fan-${Date.now()}`,
                type: 'fib_speed_resistance_fan',
                points: [start, end],
                paneIndex: start.paneIndex || 0,
                style: {
                    color: '#3b82f6',
                    lineWidth: 1,
                },
            });
        }
    }
}
