/**
 * GIS Dynamic Routing & Traffic Simulation Service
 * Generates coordinate waypoints, simulates real-time ambulance movement,
 * and triggers dynamic mid-transit rerouting when road congestion spikes.
 */

export class RoutingSimulator {
  /**
   * Generates realistic multi-point polyline route between two points
   * with minor road perturbation curves
   */
  static generateRouteCoordinates(startLat, startLon, endLat, endLon, numSteps = 24) {
    const coords = [];
    for (let i = 0; i <= numSteps; i++) {
      const t = i / numSteps;
      // Linear interpolation
      let lat = startLat + (endLat - startLat) * t;
      let lon = startLon + (endLon - startLon) * t;

      // Add realistic street curve offset (except at endpoints)
      if (i > 0 && i < numSteps) {
        const curveOffset = Math.sin(t * Math.PI) * 0.0035 * (i % 2 === 0 ? 1 : -0.7);
        lat += curveOffset;
        lon += curveOffset * 0.8;
      }

      coords.push({
        latitude: parseFloat(lat.toFixed(6)),
        longitude: parseFloat(lon.toFixed(6)),
      });
    }
    return coords;
  }

  /**
   * Calculates an alternative route avoiding a congested zone
   */
  static generateAlternativeRoute(startLat, startLon, endLat, endLon, detourDirection = 1) {
    const coords = [];
    const numSteps = 28;
    for (let i = 0; i <= numSteps; i++) {
      const t = i / numSteps;
      let lat = startLat + (endLat - startLat) * t;
      let lon = startLon + (endLon - startLon) * t;

      // Pronounced detour bypass curve around congestion
      const detour = Math.sin(t * Math.PI) * 0.012 * detourDirection;
      lat += detour;
      lon -= detour * 0.6;

      coords.push({
        latitude: parseFloat(lat.toFixed(6)),
        longitude: parseFloat(lon.toFixed(6)),
      });
    }
    return coords;
  }

  /**
   * Calculates remaining distance and ETA along a route from a given waypoint index
   */
  static computeRemainingETA(route, currentIndex, speedKmH = 45, trafficFactor = 1.0) {
    if (!route || route.length <= 1 || currentIndex >= route.length - 1) {
      return { remainingKm: 0.2, etaMinutes: 0.5 };
    }

    let totalDistKm = 0;
    for (let i = currentIndex; i < route.length - 1; i++) {
      const p1 = route[i];
      const p2 = route[i + 1];
      const dLat = ((p2.latitude - p1.latitude) * Math.PI) / 180;
      const dLon = ((p2.longitude - p1.longitude) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((p1.latitude * Math.PI) / 180) *
          Math.cos((p2.latitude * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      totalDistKm += 6371 * c;
    }

    const effectiveSpeed = Math.max(15, speedKmH / trafficFactor);
    const etaMinutes = (totalDistKm / effectiveSpeed) * 60;

    return {
      remainingKm: Math.round(totalDistKm * 10) / 10,
      etaMinutes: Math.max(0.5, Math.round(etaMinutes * 10) / 10),
    };
  }
}
