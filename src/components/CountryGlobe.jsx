import { useEffect, useMemo, useRef, useState } from 'react';
import { buildGraticule, loadCountries, polylineToPathD, ringToPathD } from '@/lib/geo';

const TOPOJSON_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const VIEW = 520;
const CX = VIEW / 2;
const CY = VIEW / 2;
const RADIUS = 220;

const AUTO_SPEED = 4; // degrees/second
const DRAG_SENSITIVITY = 0.3; // degrees per px
const DRAG_THRESHOLD = 4; // px of movement before a press counts as a drag (not a click)
const MOMENTUM_DECAY = 0.92; // per-frame (60fps-normalized) velocity retention
const TILT_LIMIT = 78; // degrees, keeps the pole from flipping under the cursor

const LAND_FILL = '#4d545e';
const LAND_STROKE = 'rgba(0,0,0,0.35)';
const AVAILABLE_FILL = '#77808c';
const AVAILABLE_HOVER_FILL = '#feec93';
const AVAILABLE_SELECTED_FILL = '#feec93';
const AVAILABLE_STROKE = 'rgba(254,236,147,0.55)';

const GRATICULE = buildGraticule(30);

/** Deterministic starfield so it doesn't reshuffle on every re-render;
 * points are filtered away from the globe disc itself, matching the
 * "starfield that avoids overlapping the globe" idea. */
function useStarfield(count = 70) {
  return useMemo(() => {
    let seed = 42;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const stars = [];
    while (stars.length < count) {
      const x = rand() * VIEW;
      const y = rand() * VIEW;
      if (Math.hypot(x - CX, y - CY) < RADIUS + 26) continue;
      stars.push({ x, y, r: rand() * 1.1 + 0.3, o: rand() * 0.6 + 0.2 });
    }
    return stars;
  }, [count]);
}

export default function CountryGlobe({ availableIds, selectedId, onSelectCountry }) {
  const [countries, setCountries] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);

  const containerRef = useRef(null);
  const bgPathRef = useRef(null);
  const graticuleRef = useRef(null);
  const availablePathRefs = useRef({});
  const tooltipRef = useRef(null);

  const rotationRef = useRef({ lambda: -100, phi: -18 });
  const draggingRef = useRef(false);
  const pendingRef = useRef(null);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const lastMoveTimeRef = useRef(0);
  const velocityRef = useRef({ dLambda: 0, dPhi: 0 });
  const momentumActiveRef = useRef(false);

  const stars = useStarfield();

  useEffect(() => {
    const controller = new AbortController();
    loadCountries(TOPOJSON_URL, { signal: controller.signal })
      .then(setCountries)
      .catch((err) => {
        if (err.name !== 'AbortError') setLoadError(true);
      });
    return () => controller.abort();
  }, []);

  const availableIdSet = useMemo(() => new Set(availableIds), [availableIds]);

  const { availableCountries, otherCountries } = useMemo(() => {
    if (!countries) return { availableCountries: [], otherCountries: [] };
    const available = [];
    const other = [];
    for (const c of countries) (availableIdSet.has(c.id) ? available : other).push(c);
    return { availableCountries: available, otherCountries: other };
  }, [countries, availableIdSet]);

  const hoveredCountry = availableCountries.find((c) => c.id === hoveredId) ?? null;

  // Main render loop: rotation state lives in refs, and every SVG path's
  // `d` attribute is written directly via setAttribute here rather than
  // through React props, so a continuously-spinning globe doesn't mean
  // continuous React re-renders - React only re-renders for hover/select
  // (a handful of times per interaction), not for motion (60 times/sec).
  useEffect(() => {
    if (!countries) return undefined;
    let raf;
    let last = performance.now();

    const renderFrame = () => {
      const rot = rotationRef.current;

      if (bgPathRef.current) {
        let d = '';
        for (const c of otherCountries) {
          for (const polygon of c.polygons) {
            for (const ring of polygon) d += ringToPathD(ring, rot, RADIUS, CX, CY);
          }
        }
        bgPathRef.current.setAttribute('d', d);
      }

      for (const c of availableCountries) {
        const el = availablePathRefs.current[c.id];
        if (!el) continue;
        let d = '';
        for (const polygon of c.polygons) {
          for (const ring of polygon) d += ringToPathD(ring, rot, RADIUS, CX, CY);
        }
        el.setAttribute('d', d);
      }

      if (graticuleRef.current) {
        let d = '';
        for (const line of GRATICULE) d += polylineToPathD(line, rot, RADIUS, CX, CY);
        graticuleRef.current.setAttribute('d', d);
      }
    };

    const tick = (now) => {
      const dt = Math.min((now - last) / 1000, 1 / 15);
      last = now;
      const rot = rotationRef.current;

      if (draggingRef.current) {
        // rotation is written directly by the pointermove handler
      } else if (momentumActiveRef.current) {
        const v = velocityRef.current;
        rot.lambda += v.dLambda * dt;
        rot.phi = clamp(rot.phi + v.dPhi * dt, -TILT_LIMIT, TILT_LIMIT);
        const decay = MOMENTUM_DECAY ** (dt * 60);
        v.dLambda *= decay;
        v.dPhi *= decay;
        if (Math.hypot(v.dLambda, v.dPhi) < 0.8) momentumActiveRef.current = false;
      } else {
        rot.lambda += AUTO_SPEED * dt;
      }

      renderFrame();
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [countries, availableCountries, otherCountries]);

  const handlePointerDown = (e) => {
    // Don't start dragging (or capture the pointer) immediately on press -
    // only once movement crosses a small threshold, in handlePointerMove.
    // Capturing right away would redirect this pointer's later "click"
    // event to the container instead of whichever country path is under
    // the cursor, silently breaking country selection on every click.
    pendingRef.current = { x: e.clientX, y: e.clientY, pointerId: e.pointerId };
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    lastMoveTimeRef.current = performance.now();
    momentumActiveRef.current = false;
    velocityRef.current = { dLambda: 0, dPhi: 0 };
  };

  const handlePointerMove = (e) => {
    if (tooltipRef.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      tooltipRef.current.style.left = `${e.clientX - rect.left + 14}px`;
      tooltipRef.current.style.top = `${e.clientY - rect.top + 10}px`;
    }

    const pending = pendingRef.current;
    if (!draggingRef.current && pending && pending.pointerId === e.pointerId) {
      const dist = Math.hypot(e.clientX - pending.x, e.clientY - pending.y);
      if (dist > DRAG_THRESHOLD) {
        draggingRef.current = true;
        e.currentTarget.setPointerCapture?.(e.pointerId);
      }
    }
    if (!draggingRef.current) return;

    const now = performance.now();
    const dt = Math.max((now - lastMoveTimeRef.current) / 1000, 1 / 240);
    const dx = e.clientX - lastPointerRef.current.x;
    const dy = e.clientY - lastPointerRef.current.y;
    const dLambda = dx * DRAG_SENSITIVITY;
    // Positive dy (dragging downward) should tip the near side of the
    // globe down with it, following the cursor - not away from it.
    const dPhi = dy * DRAG_SENSITIVITY;

    const rot = rotationRef.current;
    rot.lambda += dLambda;
    rot.phi = clamp(rot.phi + dPhi, -TILT_LIMIT, TILT_LIMIT);

    velocityRef.current = { dLambda: dLambda / dt, dPhi: dPhi / dt };
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    lastMoveTimeRef.current = now;
  };

  const endDrag = () => {
    pendingRef.current = null;
    if (!draggingRef.current) return;
    draggingRef.current = false;
    const v = velocityRef.current;
    momentumActiveRef.current = Math.hypot(v.dLambda, v.dPhi) > 6;
  };

  return (
    <div
      ref={containerRef}
      className="relative aspect-square w-full cursor-grab touch-none select-none active:cursor-grabbing"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
      onPointerCancel={endDrag}
    >
      <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className="size-full">
        <defs>
          <radialGradient id="globe-ocean" cx="42%" cy="38%" r="70%">
            <stop offset="0%" stopColor="#22262d" />
            <stop offset="70%" stopColor="#101318" />
            <stop offset="100%" stopColor="#05060a" />
          </radialGradient>
        </defs>

        {/* Starfield */}
        {stars.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={s.o} />
        ))}

        {/* Ocean / sphere base */}
        <circle cx={CX} cy={CY} r={RADIUS} fill="url(#globe-ocean)" />

        {/* Graticule */}
        <path ref={graticuleRef} d="" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.6" />

        {/* Every country without song data - one shared path, inert */}
        <path ref={bgPathRef} d="" fill={LAND_FILL} stroke={LAND_STROKE} strokeWidth="0.5" />

        {/* Countries with song data - individually interactive */}
        {availableCountries.map((c) => (
          <path
            key={c.id}
            ref={(el) => {
              availablePathRefs.current[c.id] = el;
            }}
            d=""
            fill={selectedId === c.id ? AVAILABLE_SELECTED_FILL : hoveredId === c.id ? AVAILABLE_HOVER_FILL : AVAILABLE_FILL}
            stroke={AVAILABLE_STROKE}
            strokeWidth={selectedId === c.id ? 1.4 : 0.8}
            className="cursor-pointer transition-colors duration-150"
            onPointerEnter={() => setHoveredId(c.id)}
            onPointerLeave={() => setHoveredId((h) => (h === c.id ? null : h))}
            onClick={() => onSelectCountry(c)}
          />
        ))}

        {/* Rim shading for a touch of sphere depth on top of everything */}
        <circle cx={CX} cy={CY} r={RADIUS} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="2" />
      </svg>

      {hoveredCountry && (
        <div
          ref={tooltipRef}
          className="pointer-events-none absolute top-0 left-0 z-10 rounded-md bg-black/85 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-white shadow-lg"
        >
          {hoveredCountry.name}
        </div>
      )}

      {!countries && !loadError && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-juow-soft/50">Loading globe…</div>
      )}
      {loadError && (
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-juow-soft/50">
          Couldn&apos;t load map data. Check your connection and reload.
        </div>
      )}
    </div>
  );
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
