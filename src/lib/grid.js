const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

// Same degree thresholds the OBIS tile service uses to pick a geohash length.
const CELL_SIZES = [45, 11.25, 1.40625, 0.3515625, 0.0439453125, 0.010986328125, 0.001373291015625, 0.00034332275390625];

export function cellsPerTile(points) {
  return points ? 256 : 20;
}

export function gridPrecision(zoom, points) {
  const z = Math.max(0, Math.floor(Number(zoom) || 0));
  const degPerCell = 360 / (2 ** z * cellsPerTile(points));
  let precision = 8;
  for (let i = 0; i < CELL_SIZES.length; i += 1) {
    if (degPerCell > CELL_SIZES[i]) {
      precision = i + 1;
      break;
    }
  }
  return Math.max(3, precision);
}

export function encodeGeohash(lat, lon, precision) {
  let latitude = Number(lat);
  let longitude = Number(lon);
  while (longitude < -180) longitude += 360;
  while (longitude > 180) longitude -= 360;
  let index = 0;
  let bit = 0;
  let even = true;
  let hash = "";
  let latMin = -90;
  let latMax = 90;
  let lonMin = -180;
  let lonMax = 180;
  while (hash.length < precision) {
    if (even) {
      const mid = (lonMin + lonMax) / 2;
      if (longitude >= mid) {
        index = index * 2 + 1;
        lonMin = mid;
      } else {
        index *= 2;
        lonMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (latitude >= mid) {
        index = index * 2 + 1;
        latMin = mid;
      } else {
        index *= 2;
        latMax = mid;
      }
    }
    even = !even;
    bit += 1;
    if (bit === 5) {
      hash += BASE32[index];
      bit = 0;
      index = 0;
    }
  }
  return hash;
}
