import 'leaflet';

declare module 'leaflet' {
  interface MapOptions {
    rotate?: boolean;
    bearing?: number;
    touchRotate?: boolean;
    shiftKeyRotate?: boolean;
    rotateControl?: boolean | Record<string, unknown>;
    pitchDrag?: boolean;
  }

  interface Map {
    setBearing(
      theta: number,
      options?: { animate?: boolean; duration?: number; easeLinearity?: number }
    ): void;
    getBearing(): number;
    resetNorth(options?: {
      animate?: boolean;
      duration?: number;
      easeLinearity?: number;
    }): this;
  }
}
