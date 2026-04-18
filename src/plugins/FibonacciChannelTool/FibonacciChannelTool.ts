import * as echarts from "echarts";
import { AbstractPlugin } from "../../components/AbstractPlugin";
import { FibonacciChannelDrawingRenderer } from "./FibonacciChannelDrawingRenderer";

export class FibonacciChannelTool extends AbstractPlugin {
  private startPoint: number[] | null = null;
  private endPoint: number[] | null = null;
  private widthPoint: number[] | null = null;
  private state: "idle" | "drawing-baseline" | "drawing-width" | "finished" =
    "idle";

  // Temporary ZRender elements
  private graphicGroup: any = null;

  // Fib levels config
  private readonly levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
  private readonly colors = [
    "#787b86", // 0
    "#f44336", // 0.236
    "#ff9800", // 0.382
    "#4caf50", // 0.5
    "#2196f3", // 0.618
    "#00bcd4", // 0.786
    "#787b86", // 1
  ];

  constructor(options: { name?: string; icon?: string } = {}) {
    super({
      id: "fibonacci-channel-tool",
      name: options.name || "Fibonacci Channel",
      icon:
        options.icon ||
        `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M120-200v-80l80-80H120v-80h160l120-120H120v-80h360l120-120H120v-80h720v80H520l-120 120h440v80H320L200-440h640v80H280l-80 80h640v80H120Z"/></svg>`,
    });
  }

  protected onInit(): void {
    this.context.registerDrawingRenderer(new FibonacciChannelDrawingRenderer());
  }

  public onActivate(): void {
    this.state = "idle";
    this.startPoint = null;
    this.endPoint = null;
    this.widthPoint = null;
    this.context.getChart().getZr().setCursorStyle("crosshair");
    this.bindEvents();
  }

  public onDeactivate(): void {
    this.state = "idle";
    this.startPoint = null;
    this.endPoint = null;
    this.widthPoint = null;
    this.removeGraphic();
    this.unbindEvents();
    this.context.getChart().getZr().setCursorStyle("default");
  }

  private bindEvents() {
    const zr = this.context.getChart().getZr();
    zr.on("click", this.onClick);
    zr.on("mousemove", this.onMouseMove);
  }

  private unbindEvents() {
    const zr = this.context.getChart().getZr();
    zr.off("click", this.onClick);
    zr.off("mousemove", this.onMouseMove);
  }

  private onClick = (params: any) => {
    if (this.state === "idle") {
      this.state = "drawing-baseline";
      this.startPoint = this.getPoint(params);
      this.endPoint = this.getPoint(params);
      this.initGraphic();
      this.updateGraphic();
    } else if (this.state === "drawing-baseline") {
      this.state = "drawing-width";
      this.endPoint = this.getPoint(params);
      this.widthPoint = this.getPoint(params);
      this.updateGraphic();
    } else if (this.state === "drawing-width") {
      this.state = "finished";
      this.widthPoint = this.getPoint(params);
      this.updateGraphic();
      this.saveDrawing();

      this.removeGraphic();
      this.context.disableTools();
    }
  };

  private onMouseMove = (params: any) => {
    if (this.state === "drawing-baseline") {
      this.endPoint = this.getPoint(params);
      this.updateGraphic();
    } else if (this.state === "drawing-width") {
      this.widthPoint = this.getPoint(params);
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

    // Baseline
    this.graphicGroup.add(
      new echarts.graphic.Line({
        shape: { x1, y1, x2, y2 },
        style: { stroke: "#787b86", lineWidth: 2 },
        silent: true,
      })
    );

    // If we have a width point, draw the channel levels
    if (this.widthPoint && this.state !== "drawing-baseline") {
      const wp = this.widthPoint;

      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len === 0) return;

      const nx = -dy / len;
      const ny = dx / len;

      const dist = (wp[0] - x1) * nx + (wp[1] - y1) * ny;

      this.levels.forEach((level, index) => {
        const offsetX = nx * dist * level;
        const offsetY = ny * dist * level;

        const lx1 = x1 + offsetX;
        const ly1 = y1 + offsetY;
        const lx2 = x2 + offsetX;
        const ly2 = y2 + offsetY;

        const color = this.colors[index % this.colors.length];

        this.graphicGroup.add(
          new echarts.graphic.Line({
            shape: { x1: lx1, y1: ly1, x2: lx2, y2: ly2 },
            style: { stroke: color, lineWidth: 1 },
            silent: true,
          })
        );

        if (index < this.levels.length - 1) {
          const nextLevel = this.levels[index + 1];
          const nOffsetX = nx * dist * nextLevel;
          const nOffsetY = ny * dist * nextLevel;

          const nx1 = x1 + nOffsetX;
          const ny1 = y1 + nOffsetY;
          const nx2 = x2 + nOffsetX;
          const ny2 = y2 + nOffsetY;

          this.graphicGroup.add(
            new echarts.graphic.Polygon({
              shape: {
                points: [
                  [lx1, ly1],
                  [lx2, ly2],
                  [nx2, ny2],
                  [nx1, ny1],
                ],
              },
              style: {
                fill: this.colors[(index + 1) % this.colors.length],
                opacity: 0.1,
              },
              silent: true,
            })
          );
        }
      });
    }
  }

  private saveDrawing() {
    if (!this.startPoint || !this.endPoint || !this.widthPoint) return;

    const start = this.context.coordinateConversion.pixelToData({
      x: this.startPoint[0],
      y: this.startPoint[1],
    });
    const end = this.context.coordinateConversion.pixelToData({
      x: this.endPoint[0],
      y: this.endPoint[1],
    });
    const width = this.context.coordinateConversion.pixelToData({
      x: this.widthPoint[0],
      y: this.widthPoint[1],
    });

    if (start && end && width) {
      const paneIndex = start.paneIndex || 0;

      this.context.addDrawing({
        id: `fib-channel-${Date.now()}`,
        type: "fibonacci_channel",
        points: [start, end, width],
        paneIndex: paneIndex,
        style: {
          color: "#3b82f6",
          lineWidth: 1,
        },
      });
    }
  }
}
