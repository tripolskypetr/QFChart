import { AbstractPlugin } from '../../components/AbstractPlugin';
import { HorizontalLineDrawingRenderer } from './HorizontalLineDrawingRenderer';

export class HorizontalLineTool extends AbstractPlugin {
    private zr!: any;

    constructor(options: { name?: string; icon?: string } = {}) {
        super({
            id: 'horizontal-line-tool',
            name: options?.name || 'Horizontal Line',
            icon: options?.icon || `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="2" y1="12" x2="22" y2="12"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>`,
        });
    }

    protected onInit(): void {
        this.zr = this.chart.getZr();
        this.context.registerDrawingRenderer(new HorizontalLineDrawingRenderer());
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
                id: `hline-${Date.now()}`,
                type: 'horizontal-line',
                points: [data],
                paneIndex: data.paneIndex || 0,
                style: { color: '#d1d4dc', lineWidth: 1 },
            });
        }

        this.context.disableTools();
    };
}
