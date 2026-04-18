import { AbstractPlugin } from '../../components/AbstractPlugin';
import { VerticalLineDrawingRenderer } from './VerticalLineDrawingRenderer';

export class VerticalLineTool extends AbstractPlugin {
    private zr!: any;

    constructor(options: { name?: string; icon?: string } = {}) {
        super({
            id: 'vertical-line-tool',
            name: options?.name || 'Vertical Line',
            icon: options?.icon || `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="2" x2="12" y2="22"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>`,
        });
    }

    protected onInit(): void {
        this.zr = this.chart.getZr();
        this.context.registerDrawingRenderer(new VerticalLineDrawingRenderer());
    }

    protected onActivate(): void {
        this.chart.getZr().setCursorStyle('crosshair');
        this.zr.on('click', this.onClick);
    }

    protected onDeactivate(): void {
        this.chart.getZr().setCursorStyle('default');
        this.zr.off('click', this.onClick);
    }

    protected onDestroy(): void {}

    private onClick = (params: any) => {
        const point = this.getPoint(params);
        if (!point) return;

        const data = this.context.coordinateConversion.pixelToData({
            x: point[0], y: point[1],
        });

        if (data) {
            this.context.addDrawing({
                id: `vline-${Date.now()}`,
                type: 'vertical-line',
                points: [data],
                paneIndex: data.paneIndex || 0,
                style: { color: '#d1d4dc', lineWidth: 1 },
            });
        }

        this.context.disableTools();
    };
}
