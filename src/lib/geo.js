const DEG2RAD = Math.PI / 180;

/* ------------------------------------------------------------------ *
 * TopoJSON decoding (minimal, hand-rolled - avoids adding d3-geo /
 * topojson-client as new dependencies we have no way to test the
 * install of in this environment). world-atlas's own format:
 *   topology.arcs[i]      -> delta-encoded, quantized [dx, dy] pairs
 *   topology.transform     -> { scale: [sx, sy], translate: [tx, ty] }
 *   geometry.arcs          -> indices into topology.arcs (Polygon: one
 *                             level of rings; MultiPolygon: one extra
 *                             level for each polygon's rings)
 *   negative index i       -> use arc ~i (bitwise complement) reversed
 * Decoded coordinates come out as [lon, lat] in decimal degrees -
 * world-atlas quantizes but does not project.
 * ------------------------------------------------------------------ */

function decodeArc(arc, transform) {
  const [sx, sy] = transform.scale;
  const [tx, ty] = transform.translate;
  let x = 0;
  let y = 0;
  return arc.map(([dx, dy]) => {
    x += dx;
    y += dy;
    return [x * sx + tx, y * sy + ty];
  });
}

function ringFromArcIndices(decodedArcs, arcIndices) {
  const points = [];
  for (const raw of arcIndices) {
    const idx = raw < 0 ? ~raw : raw;
    let coords = decodedArcs[idx];
    if (raw < 0) coords = coords.slice().reverse();
    // Consecutive arcs in a ring share their join point - drop the
    // duplicate rather than doubling it up in the final ring.
    if (points.length && coords.length) points.pop();
    points.push(...coords);
  }
  return points;
}

function geometryToPolygons(decodedArcs, geometry) {
  if (geometry.type === 'Polygon') {
    return [geometry.arcs.map((ring) => ringFromArcIndices(decodedArcs, ring))];
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.arcs.map((poly) => poly.map((ring) => ringFromArcIndices(decodedArcs, ring)));
  }
  return [];
}

/** Fetches + decodes the world-atlas 110m country topology into a plain
 * array of { id, name, polygons } - polygons: Polygon[], Polygon: Ring[],
 * Ring: [lon, lat][]. id is the ISO 3166-1 numeric code, as a string. */
export async function loadCountries(url, { signal } = {}) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Failed to load world atlas (${res.status})`);
  const topology = await res.json();
  const decodedArcs = topology.arcs.map((arc) => decodeArc(arc, topology.transform));
  return topology.objects.countries.geometries.map((g) => ({
    id: String(g.id),
    name: g.properties?.name ?? 'Unknown',
    polygons: geometryToPolygons(decodedArcs, g),
  }));
}

/* ------------------------------------------------------------------ *
 * Orthographic projection with a two-axis rotation (spin + tilt) and
 * horizon (limb) clipping.
 * ------------------------------------------------------------------ */

/** Rotates + projects one [lon, lat] point. Returns the 3D unit-sphere
 * position (post-rotation) alongside the 2D screen position, since the
 * clipper needs the former and the renderer needs the latter. */
export function projectPoint(lon, lat, rotation, radius, cx, cy) {
  const lambda = (lon + rotation.lambda) * DEG2RAD;
  const phi = lat * DEG2RAD;

  const x0 = Math.cos(phi) * Math.sin(lambda);
  const y0 = Math.sin(phi);
  const z0 = Math.cos(phi) * Math.cos(lambda);

  const tilt = rotation.phi * DEG2RAD;
  const cosT = Math.cos(tilt);
  const sinT = Math.sin(tilt);
  const x = x0;
  const y = y0 * cosT - z0 * sinT;
  const z = y0 * sinT + z0 * cosT;

  return {
    x3: x,
    y3: y,
    z3: z,
    sx: cx + radius * x,
    sy: cy - radius * y,
    visible: z > 0,
  };
}

/** Point on the horizon circle (z=0) between a visible and a hidden
 * point, found by linearly interpolating the two rotated unit vectors to
 * z=0 and re-normalizing the x/y so it lands exactly on the disc edge.
 * (A true great-circle slerp would be marginally more accurate, but at
 * 110m polygon resolution consecutive vertices are close enough together
 * that the linear approximation is visually indistinguishable.) */
function horizonCrossing(a, b, radius, cx, cy) {
  const t = a.z3 / (a.z3 - b.z3);
  let x = a.x3 + t * (b.x3 - a.x3);
  let y = a.y3 + t * (b.y3 - a.y3);
  const len = Math.hypot(x, y) || 1;
  x /= len;
  y /= len;
  return { x3: x, y3: y, z3: 0, sx: cx + radius * x, sy: cy - radius * y, visible: true };
}

/** Short-way SVG arc between two points that both sit on the horizon
 * circle - used to bridge a ring's boundary across the hidden side of
 * the globe instead of drawing a straight chord through the disc (the
 * classic "wrong chord" artifact naive orthographic renderers produce). */
function horizonArc(radius, from, to) {
  const a1 = Math.atan2(from.y3, from.x3);
  let a2 = Math.atan2(to.y3, to.x3);
  let diff = a2 - a1;
  while (diff <= -Math.PI) diff += 2 * Math.PI;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  const sweep = diff > 0 ? 1 : 0;
  return `A ${radius} ${radius} 0 0 ${sweep} ${to.sx} ${to.sy} `;
}

/** Projects + clips one closed ring into an SVG path `d` fragment (no
 * leading/trailing whitespace guarantees, safe to concatenate). Returns
 * '' if the ring is entirely on the far side of the globe right now. */
export function ringToPathD(ring, rotation, radius, cx, cy) {
  const pts = ring.map(([lon, lat]) => projectPoint(lon, lat, rotation, radius, cx, cy));
  const n = pts.length;
  if (n < 2) return '';

  if (pts.every((p) => p.visible)) {
    let d = `M ${pts[0].sx} ${pts[0].sy} `;
    for (let i = 1; i < n; i++) d += `L ${pts[i].sx} ${pts[i].sy} `;
    return `${d}Z `;
  }
  if (pts.every((p) => !p.visible)) return '';

  // Rotate the point list to start exactly at a hidden->visible crossing,
  // so the walk below never has to special-case "are we mid-ring".
  let startIdx = -1;
  for (let i = 0; i < n; i++) {
    const prev = pts[(i - 1 + n) % n];
    if (!prev.visible && pts[i].visible) {
      startIdx = i;
      break;
    }
  }
  if (startIdx === -1) return ''; // no visible run at all (shouldn't happen given the checks above)

  let d = '';
  let firstCross = null;
  let pendingExit = null;

  for (let step = 0; step < n; step++) {
    const i = (startIdx + step) % n;
    const prev = pts[(i - 1 + n) % n];
    const cur = pts[i];

    if (cur.visible) {
      if (!prev.visible) {
        const cross = horizonCrossing(prev, cur, radius, cx, cy);
        if (firstCross === null) {
          firstCross = cross;
          d += `M ${cross.sx} ${cross.sy} `;
        } else if (pendingExit) {
          d += horizonArc(radius, pendingExit, cross);
          pendingExit = null;
        }
        d += `L ${cur.sx} ${cur.sy} `;
      } else {
        d += `L ${cur.sx} ${cur.sy} `;
      }
    } else if (prev.visible) {
      pendingExit = horizonCrossing(cur, prev, radius, cx, cy);
      d += `L ${pendingExit.sx} ${pendingExit.sy} `;
    }
  }

  if (pendingExit && firstCross) d += horizonArc(radius, pendingExit, firstCross);
  return `${d}Z `;
}

/** Same idea as ringToPathD but for an OPEN polyline (graticule
 * meridians/parallels) - just breaks into separate visible-only
 * subpaths at the horizon, no need to bridge the gaps with an arc since
 * there's no fill to keep contiguous. */
export function polylineToPathD(line, rotation, radius, cx, cy) {
  let d = '';
  let drawing = false;
  for (const [lon, lat] of line) {
    const p = projectPoint(lon, lat, rotation, radius, cx, cy);
    if (p.visible) {
      d += `${drawing ? 'L' : 'M'} ${p.sx} ${p.sy} `;
      drawing = true;
    } else {
      drawing = false;
    }
  }
  return d;
}

/** Builds a simple lat/lon graticule as an array of polylines (each an
 * array of [lon, lat] points), meridians and parallels every `step`
 * degrees. */
export function buildGraticule(step = 30) {
  const lines = [];
  for (let lon = -180; lon < 180; lon += step) {
    const line = [];
    for (let lat = -80; lat <= 80; lat += 5) line.push([lon, lat]);
    lines.push(line);
  }
  for (let lat = -60; lat <= 60; lat += step) {
    const line = [];
    for (let lon = -180; lon <= 180; lon += 5) line.push([lon, lat]);
    lines.push(line);
  }
  return lines;
}
