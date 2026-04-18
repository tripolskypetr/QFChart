import { DrawingRenderer } from '../types';

export class DrawingRendererRegistry {
    private renderers = new Map<string, DrawingRenderer>();

    register(renderer: DrawingRenderer): void {
        this.renderers.set(renderer.type, renderer);
    }

    get(type: string): DrawingRenderer | undefined {
        return this.renderers.get(type);
    }
}
