/**
 * GIS Dynamic Routing & Traffic Simulation Service
 * Uses Open Source Routing Machine (OSRM) for real road-snapped turn-by-turn geometry,
 * with smooth non-zigzag bezier fallback and live ETA calculations.
 */

export class RoutingSimulator {
  /**
   * Fetches real road coordinates from public OSRM driving router
   * or falls back to smooth natural street curvature (no zig-zags).
   */
  static async getRealRoadRoute(startLat, startLon, endLat, endLon, viaLat = null, viaLon = null) {
    try {
      const waypoints = viaLat && viaLon
        ? `${startLon},${startLat};${viaLon},${viaLat};${endLon},${endLat}`
        : `${startLon},${startLat};${endLon},${endLat}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const url = `https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson`;
      const resp = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (resp.ok) {
        const data = await resp.json();
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const coords = route.geometry.coordinates.map(([lon, lat]) => ({
            latitude: parseFloat(lat.toFixed(6)),
            longitude: parseFloat(lon.toFixed(6)),
          }));
          const distanceKm = Math.round((route.distance / 1000) * 10) / 10;
          const durationMinutes = Math.max(1, Math.round((route.duration / 60) * 10) / 10);
          return {
            coordinates: coords,
            distanceKm,
            durationMinutes,
            source: 'osrm_real_roads',
          };
        }
      }
    } catch (e) {
      // Fallback
    }

    // High quality smooth fallback without jagged zigzag
    const fallbackCoords = this.generateSmoothRoute(startLat, startLon, endLat, endLon, viaLat ? 1 : 0);
    const dist = this.calculateDirectDistanceKm(startLat, startLon, endLat, endLon);
    return {
      coordinates: fallbackCoords,
      distanceKm: Math.round(dist * 1.25 * 10) / 10,
      durationMinutes: Math.max(1, Math.round(((dist * 1.25) / 45) * 60 * 10) / 10),
      source: 'smooth_fallback',
    };
  }

  /**
   * Generates clean, smooth natural road curves without zig-zag sawtooth artifacts
   */
  static generateSmoothRoute(startLat, startLon, endLat, endLon, curveBias = 0, numSteps = 28) {
    const coords = [];
    const midLat = (startLat + endLat) / 2 + (curveBias !== 0 ? curveBias * 0.007 : (endLon - startLon) * 0.12);
    const midLon = (startLon + endLon) / 2 - (curveBias !== 0 ? curveBias * 0.005 : (endLat - startLat) * 0.12);

    for (let i = 0; i <= numSteps; i++) {
      const t = i / numSteps;
      // Smooth quadratic bezier
      const lat = (1 - t) * (1 - t) * startLat + 2 * (1 - t) * t * midLat + t * t * endLat;
      const lon = (1 - t) * (1 - t) * startLon + 2 * (1 - t) * t * midLon + t * t * endLon;
      coords.push({
        latitude: parseFloat(lat.toFixed(6)),
        longitude: parseFloat(lon.toFixed(6)),
      });
    }
    return coords;
  }

  /**
   * Backward compatible synchronous coordinate generator (smooth curve)
   */
  static generateRouteCoordinates(startLat, startLon, endLat, endLon, numSteps = 28) {
    return this.generateSmoothRoute(startLat, startLon, endLat, endLon, 0, numSteps);
  }

  /**
   * Calculates a smooth alternative bypass route avoiding a congested zone
   */
  static generateAlternativeRoute(startLat, startLon, endLat, endLon, detourDirection = 1) {
    return this.generateSmoothRoute(startLat, startLon, endLat, endLon, detourDirection * 1.5, 32);
  }

  static calculateDirectDistanceKm(lat1, lon1, lat2, lon2) {
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return 6371 * c;
  }

  /**
   * Calculates remaining distance and ETA along a route from a given waypoint index
   */
  static computeRemainingETA(route, currentIndex, speedKmH = 48, trafficFactor = 1.0) {
    if (!route || route.length <= 1 || currentIndex >= route.length - 1) {
      return { remainingKm: 0.1, etaMinutes: 0.5 };
    }

    let totalDistKm = 0;
    for (let i = currentIndex; i < route.length - 1; i++) {
      const p1 = route[i];
      const p2 = route[i + 1];
      totalDistKm += this.calculateDirectDistanceKm(p1.latitude, p1.longitude, p2.latitude, p2.longitude);
    }

    const effectiveSpeed = Math.max(15, speedKmH / trafficFactor);
    const etaMinutes = (totalDistKm / effectiveSpeed) * 60;

    return {
      remainingKm: Math.round(totalDistKm * 10) / 10,
      etaMinutes: Math.max(0.5, Math.round(etaMinutes * 10) / 10),
    };
  }
}
