import type { Coordinates } from "@/lib/domain";

export interface LocationProvider { getCurrentLocation(): Promise<Coordinates>; }

export class BrowserGpsProvider implements LocationProvider {
  getCurrentLocation(): Promise<Coordinates> {
    return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, timestamp: new Date(position.timestamp) }),
      reject,
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
    ));
  }
}

export class ManualLocationProvider implements LocationProvider {
  constructor(private readonly location: Coordinates) {}
  async getCurrentLocation(): Promise<Coordinates> { return this.location; }
}
