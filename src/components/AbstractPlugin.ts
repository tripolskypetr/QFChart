import { ChartContext, Plugin, PluginConfig, OHLCV } from "../types";
import { EventType, EventHandler } from "../utils/EventBus";
import * as echarts from "echarts";

export abstract class AbstractPlugin implements Plugin {
  public id: string;
  public name?: string;
  public icon?: string;

  protected context!: ChartContext;
  private eventListeners: Array<{ event: EventType; handler: EventHandler }> =
    [];

  // Snap indicator
  private _snapIndicator: any = null;
  private _snapMoveHandler: ((e: any) => void) | null = null;
  private _snapKeyDownHandler: ((e: KeyboardEvent) => void) | null = null;
  private _snapKeyUpHandler: ((e: KeyboardEvent) => void) | null = null;
  private _snapBlurHandler: (() => void) | null = null;
  private _snapActive: boolean = false;
  private _lastMouseEvent: any = null;

  constructor(config: PluginConfig) {
    this.id = config.id;
    this.name = config.name;
    this.icon = config.icon;
  }

  public init(context: ChartContext): void {
    this.context = context;
    this.onInit();
  }

  /**
   * Lifecycle hook called after context is initialized.
   * Override this instead of init().
   */
  protected onInit(): void {}

  public activate(): void {
    this.onActivate();
    this._bindSnapIndicator();
    this.context.events.emit("plugin:activated", this.id);
  }

  /**
   * Lifecycle hook called when the plugin is activated.
   */
  protected onActivate(): void {}

  public deactivate(): void {
    this._unbindSnapIndicator();
    this.onDeactivate();
    this.context.events.emit("plugin:deactivated", this.id);
  }

  /**
   * Lifecycle hook called when the plugin is deactivated.
   */
  protected onDeactivate(): void {}

  public destroy(): void {
    this._unbindSnapIndicator();
    this.removeAllListeners();
    this.onDestroy();
  }

  /**
   * Lifecycle hook called when the plugin is destroyed.
   */
  protected onDestroy(): void {}

  // --- Helper Methods ---

  /**
   * Register an event listener that will be automatically cleaned up on destroy.
   */
  protected on(event: EventType, handler: EventHandler): void {
    this.context.events.on(event, handler);
    this.eventListeners.push({ event, handler });
  }

  /**
   * Remove a specific event listener.
   */
  protected off(event: EventType, handler: EventHandler): void {
    this.context.events.off(event, handler);
    this.eventListeners = this.eventListeners.filter(
      (l) => l.event !== event || l.handler !== handler
    );
  }

  /**
   * Remove all listeners registered by this plugin.
   */
  protected removeAllListeners(): void {
    this.eventListeners.forEach(({ event, handler }) => {
      this.context.events.off(event, handler);
    });
    this.eventListeners = [];
  }

  /**
   * Access to the ECharts instance.
   */
  protected get chart() {
    return this.context.getChart();
  }

  /**
   * Access to market data.
   */
  protected get marketData(): OHLCV[] {
    return this.context.getMarketData();
  }

  /**
   * Get the event point coordinates, snapping to nearest candle OHLC if Ctrl is held.
   * Use this instead of [params.offsetX, params.offsetY] in click/mousemove handlers.
   */
  protected getPoint(params: any): [number, number] {
    const x = params.offsetX;
    const y = params.offsetY;
    const event = params.event;
    const ctrlKey = event?.ctrlKey || event?.metaKey;

    if (ctrlKey) {
      const snapped = this.context.snapToCandle({ x, y });
      return [snapped.x, snapped.y];
    }

    return [x, y];
  }

  // --- Snap Indicator (internal) ---

  private _bindSnapIndicator(): void {
    const zr = this.context.getChart().getZr();

    this._snapMoveHandler = (e: any) => {
      this._lastMouseEvent = e;
      const ctrlKey = e.event?.ctrlKey || e.event?.metaKey;
      if (ctrlKey) {
        this._showSnapAt(e.offsetX, e.offsetY);
      } else {
        this._hideSnap();
      }
    };

    this._snapKeyDownHandler = (e: KeyboardEvent) => {
      if ((e.key === "Control" || e.key === "Meta") && this._lastMouseEvent) {
        this._showSnapAt(this._lastMouseEvent.offsetX, this._lastMouseEvent.offsetY);
      }
    };

    this._snapKeyUpHandler = (e: KeyboardEvent) => {
      if (e.key === "Control" || e.key === "Meta") {
        this._hideSnap();
      }
    };

    // On Mac, Cmd+Tab can swallow the keyup event — hide snap when window loses focus
    this._snapBlurHandler = () => {
      this._hideSnap();
    };

    zr.on("mousemove", this._snapMoveHandler);
    window.addEventListener("keydown", this._snapKeyDownHandler);
    window.addEventListener("keyup", this._snapKeyUpHandler);
    window.addEventListener("blur", this._snapBlurHandler);
  }

  private _unbindSnapIndicator(): void {
    if (this._snapMoveHandler) {
      try {
        this.context.getChart().getZr().off("mousemove", this._snapMoveHandler);
      } catch {}
      this._snapMoveHandler = null;
    }
    if (this._snapKeyDownHandler) {
      window.removeEventListener("keydown", this._snapKeyDownHandler);
      this._snapKeyDownHandler = null;
    }
    if (this._snapKeyUpHandler) {
      window.removeEventListener("keyup", this._snapKeyUpHandler);
      this._snapKeyUpHandler = null;
    }
    if (this._snapBlurHandler) {
      window.removeEventListener("blur", this._snapBlurHandler);
      this._snapBlurHandler = null;
    }
    this._removeSnapGraphic();
    this._lastMouseEvent = null;
  }

  private _removeSnapGraphic(): void {
    if (this._snapIndicator) {
      try {
        this.context.getChart().getZr().remove(this._snapIndicator);
      } catch {}
      this._snapIndicator = null;
      this._snapActive = false;
    }
  }

  private _showSnapAt(x: number, y: number): void {
    const snapped = this.context.snapToCandle({ x, y });
    const zr = this.context.getChart().getZr();
    if (!this._snapIndicator) {
      this._snapIndicator = new echarts.graphic.Circle({
        shape: { cx: 0, cy: 0, r: 5 },
        style: {
          fill: "rgba(59, 130, 246, 0.3)",
          stroke: "#3b82f6",
          lineWidth: 1.5,
        },
        z: 9999,
        silent: true,
      });
      zr.add(this._snapIndicator);
    }

    this._snapIndicator.setShape({ cx: snapped.x, cy: snapped.y });
    this._snapIndicator.show();
    this._snapActive = true;
  }

  private _hideSnap(): void {
    if (this._snapIndicator && this._snapActive) {
      this._snapIndicator.hide();
      this._snapActive = false;
    }
  }
}
