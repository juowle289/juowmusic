import { useEffect, useMemo, useRef } from 'react';

const DEFAULT_EDGE_FADE = { width: '16%', opacity: 0.95 };

/**
 * 3D Curved Carousel.
 *
 * A ring of cards placed with `rotateY(angle) translateZ(radius)` inside one
 * `transform-style: preserve-3d` wrapper, viewed head-on through a
 * perspective container. Because the ring is only ever partially turned
 * toward the viewer, what's on screen at any moment reads as a gently
 * curved row bowing away into the distance at both ends - not a flat
 * strip and not a full "turntable" view of the whole circle.
 *
 * `radius` is auto-derived every frame from the container's own width (via
 * ResizeObserver) unless explicitly overridden, so the curve always spans
 * the full width of whatever it's placed in regardless of how many items
 * are in the ring - passing 4 items vs 10 changes how *dense* the ring
 * looks, not how wide it stretches.
 *
 * Critically, the ring itself is pushed back by `translateZ(-radius)`
 * *before* it's rotated (`ringRef`'s transform is
 * `translateZ(-radius) rotateY(rotation)`, applied in that order so the
 * rotation happens first and the pushback shifts the already-rotated
 * result). That places whichever card currently faces the viewer exactly
 * at z=0 - i.e. at its natural, undistorted size - while the rest of the
 * ring recedes into the screen as it curves away. Skipping this pushback
 * (translating each card forward by `radius` with nothing to counter it)
 * puts the front card *in front of* the perspective origin instead, which
 * blows its scale up dramatically as `radius` approaches `perspective` -
 * that's what a single giant, cropped card with the rest invisible means.
 *
 * All continuous motion (auto-rotate, drag, momentum decay) is driven by
 * direct DOM style writes inside a rAF loop rather than React state, so
 * spinning/dragging 60x a second doesn't trigger 60 re-renders a second.
 *
 * @param {object[]} items - source items (deduped, in order)
 * @param {(item: object, index: number) => import('react').ReactNode} renderItem
 * @param {(item: object) => string} itemKey
 *
 * Content & Layout
 * @param {number} [initialAngle=0] - starting rotation of the ring, in degrees
 * @param {number} [radius] - px distance from the ring's center to each card; auto-fit to container width when omitted
 * @param {number} [perspective=1700] - px perspective depth of the containing viewport
 * @param {number} [repeatCount=1] - how many times `items` is laid end-to-end around the ring (denser ring, same items, looping feel)
 *
 * Auto Rotation
 * @param {boolean} [autoRotate=true]
 * @param {'left'|'right'} [direction='right'] - 'right' reads as the ring turning right-to-left (front card exits left); 'left' is the mirror
 * @param {number} [speed=9] - degrees/second
 * @param {boolean} [hoverSlow=true] - ease to `hoverSlowFactor * speed` while the pointer is over the carousel, instead of stopping dead
 * @param {number} [hoverSlowFactor=0.15]
 *
 * Drag Interaction
 * @param {boolean} [draggable=true]
 * @param {number} [dragSensitivity=0.35] - degrees of rotation per px dragged
 * @param {boolean} [momentum=true] - keep spinning on release, decaying back to a stop (or back into auto-rotate)
 * @param {number} [momentumDecay=0.94] - per-frame (60fps-normalized) velocity retention; lower = stops sooner
 * @param {boolean} [mobileDrag=true] - allow touch-originated drags, not just mouse/pen
 * @param {boolean} [scrollWheel=true] - let wheel/trackpad input rotate the ring
 * @param {number} [wheelSensitivity=0.25] - degrees of rotation per wheel-delta unit
 *
 * Visual Effects
 * @param {{width: string, opacity: number}|null} [edgeFade] - gradient fade-to-black at both edges; pass `null` to disable
 */
export default function PlaylistCarousel({
  items,
  renderItem,
  itemKey,
  // Content & Layout
  initialAngle = 0,
  radius,
  perspective = 1700,
  repeatCount = 1,
  // Auto Rotation
  autoRotate = true,
  direction = 'right',
  speed = 9,
  hoverSlow = true,
  hoverSlowFactor = 0.15,
  // Drag Interaction
  draggable = true,
  dragSensitivity = 0.35,
  momentum = true,
  momentumDecay = 0.94,
  mobileDrag = true,
  scrollWheel = true,
  wheelSensitivity = 0.25,
  // Visual Effects
  edgeFade = DEFAULT_EDGE_FADE,
}) {
  const containerRef = useRef(null);
  const ringRef = useRef(null);
  const cardRefs = useRef([]);
  const containerWidthRef = useRef(1200);
  const cardWidthRef = useRef(220);

  // How many card-widths' worth of spacing should tile across the
  // container when radius is auto-computed - i.e. roughly how many cards
  // read as "in frame" at once. Higher = tighter/more cards visible,
  // lower = fewer, bigger cards.
  const VISIBLE_SPAN = 7;

  // Ring content: `items` repeated end-to-end `repeatCount` times so the
  // circle can be made denser without changing what's actually in it.
  const ringItems = useMemo(() => {
    const out = [];
    const reps = Math.max(1, Math.round(repeatCount));
    for (let r = 0; r < reps; r++) {
      for (const item of items) out.push({ item, key: `${itemKey(item)}::${r}` });
    }
    return out;
  }, [items, itemKey, repeatCount]);

  const n = ringItems.length;
  const angleStep = n ? 360 / n : 0;
  const dirSign = direction === 'left' ? 1 : -1; // 'right' => ring sweeps right-to-left

  // Motion state lives in refs, not React state - none of it should ever
  // trigger a re-render on its own.
  const rotationRef = useRef(initialAngle);
  const velocityRef = useRef(0); // degrees/second
  const hoveredRef = useRef(false);
  const draggingRef = useRef(false);
  const momentumActiveRef = useRef(false);
  const lastPointerX = useRef(0);
  const lastMoveTime = useRef(0);

  // Track the container's own width so auto-radius can follow it live
  // (initial screen size, orientation change, sidebar collapsing, etc).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const update = () => {
      containerWidthRef.current = el.clientWidth;
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Track the ACTUAL rendered width of a card (renderItem's own markup sets
  // this via Tailwind breakpoints - e.g. narrower on mobile) so auto-radius
  // can guarantee enough spacing to fit it, instead of assuming a fixed
  // card size. Without this, a spacing formula tuned for desktop card
  // widths produces cards that overlap once the real rendered card is
  // wider (proportionally) than what that formula assumed on small screens.
  useEffect(() => {
    const el = cardRefs.current[0];
    if (!el) return undefined;
    const update = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) cardWidthRef.current = w;
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [n]);

  useEffect(() => {
    let last = performance.now();
    let raf;
    const angleStepRad = (angleStep * Math.PI) / 180;

    const applyTransforms = () => {
      let effectiveRadius = radius;
      if (effectiveRadius == null) {
        // Chord between two adjacent front-facing cards is ~R*sin(angleStep);
        // solve for R so that chord matches "container width / VISIBLE_SPAN",
        // i.e. roughly VISIBLE_SPAN cards' worth of spacing tiles the width -
        // but never less than the card's own rendered width plus a margin,
        // or adjacent cards would overlap on narrower screens.
        const minSpacing = cardWidthRef.current * 1.18;
        const targetSpacing = Math.max(containerWidthRef.current / VISIBLE_SPAN, minSpacing);
        effectiveRadius = angleStepRad > 0.0001 ? targetSpacing / Math.sin(angleStepRad) : containerWidthRef.current / 2;
      }

      if (ringRef.current) {
        // Pushing the ring back by its own radius BEFORE rotating means the
        // card currently facing the viewer lands at z=0 (natural size),
        // with the rest of the ring curving away into the screen - see the
        // component doc comment above for the full explanation.
        ringRef.current.style.transform = `translateZ(${-effectiveRadius}px) rotateY(${rotationRef.current}deg)`;
      }
      for (let i = 0; i < n; i++) {
        const el = cardRefs.current[i];
        if (!el) continue;
        const cardAngleDeg = i * angleStep;
        el.style.transform = `translate(-50%, -50%) rotateY(${cardAngleDeg}deg) translateZ(${effectiveRadius}px)`;

        // Depth cue: fade/dim whichever cards are currently swung toward
        // the back of the ring, instead of every card sitting at the same
        // flat opacity regardless of facing.
        const angleRad = ((cardAngleDeg + rotationRef.current) * Math.PI) / 180;
        const facing = Math.cos(angleRad); // 1 = facing viewer, -1 = facing away
        const depth = (facing + 1) / 2; // normalized 0..1
        el.style.opacity = String(0.2 + depth * 0.8);
        el.style.filter = depth < 0.55 ? `brightness(${0.45 + depth})` : 'none';
      }
    };

    const tick = (now) => {
      const dt = (now - last) / 1000;
      last = now;

      if (draggingRef.current) {
        // Rotation is written directly by the pointermove handler while a
        // drag is in progress - nothing to integrate here.
      } else if (momentumActiveRef.current) {
        rotationRef.current += velocityRef.current * dt;
        velocityRef.current *= Math.pow(momentumDecay, dt * 60);
        if (Math.abs(velocityRef.current) < 2) {
          momentumActiveRef.current = false;
          velocityRef.current = 0;
        }
      } else if (autoRotate) {
        const activeSpeed = hoverSlow && hoveredRef.current ? speed * hoverSlowFactor : speed;
        rotationRef.current += dirSign * activeSpeed * dt;
      }

      applyTransforms();
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [angleStep, n, radius, autoRotate, speed, hoverSlow, hoverSlowFactor, dirSign, momentumDecay]);

  // Wheel needs a non-passive listener to be able to preventDefault (React's
  // synthetic onWheel is passive by default), so it's wired up manually.
  useEffect(() => {
    if (!scrollWheel) return undefined;
    const el = containerRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      draggingRef.current = false;
      momentumActiveRef.current = false;
      velocityRef.current = 0;
      rotationRef.current += -dirSign * e.deltaY * wheelSensitivity;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [scrollWheel, wheelSensitivity, dirSign]);

  const endDrag = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (momentum && Math.abs(velocityRef.current) > 5) {
      momentumActiveRef.current = true;
    } else {
      velocityRef.current = 0;
    }
  };

  const onPointerDown = (e) => {
    if (!draggable) return;
    if (e.pointerType === 'touch' && !mobileDrag) return;
    draggingRef.current = true;
    momentumActiveRef.current = false;
    velocityRef.current = 0;
    lastPointerX.current = e.clientX;
    lastMoveTime.current = performance.now();
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!draggingRef.current) return;
    const now = performance.now();
    const dx = e.clientX - lastPointerX.current;
    const dt = Math.max((now - lastMoveTime.current) / 1000, 1 / 240);
    const deltaAngle = dx * dragSensitivity;
    rotationRef.current += deltaAngle;
    velocityRef.current = deltaAngle / dt;
    lastPointerX.current = e.clientX;
    lastMoveTime.current = now;
  };

  return (
    <div
      ref={containerRef}
      className="relative mx-auto h-[22rem] w-full touch-pan-y select-none overflow-hidden sm:h-[26rem] md:h-[30rem]"
      style={{ perspective: `${perspective}px` }}
      onMouseEnter={() => (hoveredRef.current = true)}
      onMouseLeave={() => {
        hoveredRef.current = false;
        endDrag();
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <div ref={ringRef} className="absolute left-1/2 top-1/2" style={{ transformStyle: 'preserve-3d' }}>
        {ringItems.map(({ item, key }, i) => (
          <div
            key={key}
            ref={(el) => (cardRefs.current[i] = el)}
            className="absolute left-1/2 top-1/2 will-change-transform"
            style={{ backfaceVisibility: 'hidden' }}
          >
            {renderItem(item, i)}
          </div>
        ))}
      </div>

      {edgeFade && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 z-10"
            style={{
              width: edgeFade.width,
              background: `linear-gradient(to right, rgba(0,0,0,${edgeFade.opacity}), rgba(0,0,0,0))`,
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 z-10"
            style={{
              width: edgeFade.width,
              background: `linear-gradient(to left, rgba(0,0,0,${edgeFade.opacity}), rgba(0,0,0,0))`,
            }}
          />
        </>
      )}
    </div>
  );
}
