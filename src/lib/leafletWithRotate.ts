import L from './leafletGlobal';
import 'leaflet-rotate';

declare module 'leaflet' {
  interface MapOptions {
    rotate?: boolean;
    bearing?: number;
    pitch?: number;
    rotateControl?: boolean | object;
    touchRotate?: boolean;
    shiftKeyRotate?: boolean;
    compassBearing?: boolean;
  }

  interface Map {
    setBearing(
      theta: number,
      options?: { animate?: boolean; duration?: number; easeLinearity?: number }
    ): this;
    getBearing(): number;
    setPitch(
      pitch: number,
      options?: { animate?: boolean; duration?: number; easeLinearity?: number }
    ): this;
    getPitch(): number;
  }
}

export default L;
