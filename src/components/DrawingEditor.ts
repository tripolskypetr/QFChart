import { ChartContext, DrawingElement, DataCoordinate } from '../types';
import * as echarts from 'echarts';

export class DrawingEditor {
    private context: ChartContext;
    private isEditing: boolean = false;
    private currentDrawing: DrawingElement | null = null;
    private editingPointIndex: number | null = null;
    private zr: any;

    // Temporary ZRender elements for visual feedback during drag
    private editGroup: any = null;
    private editLines: any[] = [];
    private editPoints: any[] = [];

    private isMovingShape: boolean = false;
    private dragStart: { x: number; y: number } | null = null;
    private initialPixelPoints: { x: number; y: number }[] = [];

    constructor(context: ChartContext) {
        this.context = context;
        this.zr = this.context.getChart().getZr();
        this.bindEvents();
    }

    private bindEvents() {
        this.context.events.on('drawing:point:mousedown', this.onPointMouseDown);
        this.context.events.on('drawing:mousedown', this.onDrawingMouseDown);
    }

    private onDrawingMouseDown = (payload: { id: string; x: number; y: number }) => {
        if (this.isEditing) return;

        const drawing = this.context.getDrawing(payload.id);
        if (!drawing) return;

        this.isEditing = true;
        this.isMovingShape = true;
        this.currentDrawing = JSON.parse(JSON.stringify(drawing));
        this.dragStart = { x: payload.x, y: payload.y };

        // Capture initial pixel positions for all points
        this.initialPixelPoints = drawing.points.map((p) => {
            const pixel = this.context.coordinateConversion.dataToPixel(p);
            return pixel ? { x: pixel.x, y: pixel.y } : { x: 0, y: 0 };
        });

        this.context.lockChart();
        this.createEditGraphic();

        this.zr.on('mousemove', this.onMouseMove);
        this.zr.on('mouseup', this.onMouseUp);
        // Safety net: catch mouseup outside the canvas
        window.addEventListener('mouseup', this.onWindowMouseUp);
    };

    private onPointMouseDown = (payload: { id: string; pointIndex: number }) => {
        if (this.isEditing) return;

        const drawing = this.context.getDrawing(payload.id);
        if (!drawing) return;

        this.isEditing = true;
        this.currentDrawing = JSON.parse(JSON.stringify(drawing));
        this.editingPointIndex = payload.pointIndex;

        // Capture initial pixel positions for all points
        this.initialPixelPoints = drawing.points.map((p) => {
            const pixel = this.context.coordinateConversion.dataToPixel(p);
            return pixel ? { x: pixel.x, y: pixel.y } : { x: 0, y: 0 };
        });

        this.context.lockChart();
        this.createEditGraphic();

        this.zr.on('mousemove', this.onMouseMove);
        this.zr.on('mouseup', this.onMouseUp);
        // Safety net: catch mouseup outside the canvas
        window.addEventListener('mouseup', this.onWindowMouseUp);
    };

    private createEditGraphic() {
        if (!this.currentDrawing) return;

        this.editGroup = new echarts.graphic.Group();
        this.editLines = [];
        this.editPoints = [];

        const pixelPts = this.currentDrawing.points.map((p) => {
            const px = this.context.coordinateConversion.dataToPixel(p);
            return px ? { x: px.x, y: px.y } : null;
        });

        if (pixelPts.some((p) => !p)) return;
        const pts = pixelPts as { x: number; y: number }[];

        // Connect consecutive points with dashed lines
        for (let i = 0; i < pts.length - 1; i++) {
            const line = new echarts.graphic.Line({
                shape: { x1: pts[i].x, y1: pts[i].y, x2: pts[i + 1].x, y2: pts[i + 1].y },
                style: {
                    stroke: this.currentDrawing.style?.color || '#3b82f6',
                    lineWidth: this.currentDrawing.style?.lineWidth || 2,
                    lineDash: [4, 4],
                },
                silent: true,
            });
            this.editLines.push(line);
            this.editGroup.add(line);
        }

        // Control point circles for each point
        for (let i = 0; i < pts.length; i++) {
            const circle = new echarts.graphic.Circle({
                shape: { cx: pts[i].x, cy: pts[i].y, r: 5 },
                style: { fill: '#fff', stroke: '#3b82f6', lineWidth: 2 },
                z: 1000,
            });
            this.editPoints.push(circle);
            this.editGroup.add(circle);
        }

        this.zr.add(this.editGroup);
    }

    private onMouseMove = (e: any) => {
        if (!this.isEditing || !this.currentDrawing) return;

        const x = e.offsetX;
        const y = e.offsetY;

        if (this.isMovingShape && this.dragStart) {
            const dx = x - this.dragStart.x;
            const dy = y - this.dragStart.y;

            // Compute new positions for all points
            const newPts = this.initialPixelPoints.map((p) => ({
                x: p.x + dx,
                y: p.y + dy,
            }));

            // Update lines
            for (let i = 0; i < this.editLines.length; i++) {
                this.editLines[i].setShape({
                    x1: newPts[i].x,
                    y1: newPts[i].y,
                    x2: newPts[i + 1].x,
                    y2: newPts[i + 1].y,
                });
            }

            // Update point circles
            for (let i = 0; i < this.editPoints.length; i++) {
                this.editPoints[i].setShape({ cx: newPts[i].x, cy: newPts[i].y });
            }
        } else if (this.editingPointIndex !== null) {
            // Compute new positions: only the dragged point moves
            const newPts = this.initialPixelPoints.map((p) => ({ x: p.x, y: p.y }));
            newPts[this.editingPointIndex] = { x, y };

            // Update lines connected to this point
            for (let i = 0; i < this.editLines.length; i++) {
                this.editLines[i].setShape({
                    x1: newPts[i].x,
                    y1: newPts[i].y,
                    x2: newPts[i + 1].x,
                    y2: newPts[i + 1].y,
                });
            }

            // Update the dragged point circle
            this.editPoints[this.editingPointIndex].setShape({ cx: x, cy: y });
        }
    };

    private onMouseUp = (e: any) => {
        if (!this.isEditing) return;
        this.finishEditing(e.offsetX, e.offsetY);
    };

    /**
     * Safety net: catches mouseup when the cursor leaves the canvas area.
     * Uses the last known pixel positions to compute the final drop location
     * relative to the chart container.
     */
    private onWindowMouseUp = (e: MouseEvent) => {
        if (!this.isEditing) return;

        // Convert page coordinates to offset relative to the chart canvas
        const dom = this.zr.dom as HTMLElement;
        if (dom) {
            const rect = dom.getBoundingClientRect();
            const offsetX = e.clientX - rect.left;
            const offsetY = e.clientY - rect.top;
            this.finishEditing(offsetX, offsetY);
        } else {
            // Fallback: just clean up without committing the move
            this.finishEditing(this.dragStart?.x ?? 0, this.dragStart?.y ?? 0);
        }
    };

    /**
     * Convert pixel to data, falling back to the drawing's known pane
     * when the point is outside the grid (e.g., dragged beyond viewport).
     * Uses convertFromPixel with the specific gridIndex directly, bypassing
     * the containPixel check that would return null for out-of-bounds points.
     */
    private pixelToDataForPane(x: number, y: number, paneIndex: number): DataCoordinate | null {
        // First try the normal conversion (respects pane boundaries)
        const normal = this.context.coordinateConversion.pixelToData({ x, y });
        if (normal) return normal;

        // Fallback: force conversion using the drawing's known pane
        try {
            const chart = this.context.getChart();
            const p = chart.convertFromPixel({ gridIndex: paneIndex }, [x, y]);
            if (p) {
                // We need the dataIndexOffset — read from the chart's xAxis data length
                const option = chart.getOption() as any;
                const xAxisData = option?.xAxis?.[paneIndex]?.data;
                const marketData = this.context.getMarketData();
                const dataIndexOffset = xAxisData ? Math.round((xAxisData.length - marketData.length) / 2) : 0;
                return { timeIndex: Math.round(p[0]) - dataIndexOffset, value: p[1], paneIndex };
            }
        } catch (_) {
            // Ignore conversion errors
        }
        return null;
    }

    private finishEditing(finalX: number, finalY: number) {
        if (!this.currentDrawing) {
            this.cleanup();
            return;
        }

        const paneIndex = this.currentDrawing.paneIndex || 0;

        if (this.isMovingShape && this.dragStart) {
            const dx = finalX - this.dragStart.x;
            const dy = finalY - this.dragStart.y;

            // Update all points using pane-aware conversion
            const newPoints = this.initialPixelPoints.map((p) =>
                this.pixelToDataForPane(p.x + dx, p.y + dy, paneIndex),
            );

            if (newPoints.every((p) => p !== null)) {
                for (let i = 0; i < newPoints.length; i++) {
                    this.currentDrawing.points[i] = newPoints[i]!;
                }

                if (newPoints[0]?.paneIndex !== undefined) {
                    this.currentDrawing.paneIndex = newPoints[0].paneIndex;
                }

                this.context.updateDrawing(this.currentDrawing);
            }
        } else if (this.editingPointIndex !== null) {
            const newData = this.pixelToDataForPane(finalX, finalY, paneIndex);

            if (newData) {
                this.currentDrawing.points[this.editingPointIndex] = newData;

                if (this.editingPointIndex === 0 && newData.paneIndex !== undefined) {
                    this.currentDrawing.paneIndex = newData.paneIndex;
                }

                this.context.updateDrawing(this.currentDrawing);
            }
        }

        this.cleanup();
    }

    private cleanup() {
        this.isEditing = false;
        this.isMovingShape = false;
        this.dragStart = null;
        this.initialPixelPoints = [];
        this.currentDrawing = null;
        this.editingPointIndex = null;
        this.editLines = [];
        this.editPoints = [];

        if (this.editGroup) {
            this.zr.remove(this.editGroup);
            this.editGroup = null;
        }

        this.zr.off('mousemove', this.onMouseMove);
        this.zr.off('mouseup', this.onMouseUp);
        window.removeEventListener('mouseup', this.onWindowMouseUp);

        this.context.unlockChart();
    }
}
