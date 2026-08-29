import { useEffect, useRef } from 'react';

// How long the crossfade/preload window is, in seconds. This is also what
// makes playback gapless even when the fade itself is barely audible: the
// NEXT track is fully loaded and already playing quietly in the background
// well before the current one ends, so there's never a moment where
// playback has to stop and wait on a fresh network fetch.
const CROSSFADE_SECONDS = 5;

/**
 * Owns two <audio> elements and swaps which one is "live" for true
 * crossfade + gapless playback, instead of the classic single-<audio>
 * approach where switching tracks means stopping, swapping `src`, and
 * re-buffering (the audible "gap" between songs most homemade players have).
 *
 * Each element gets its own persistent Web Audio graph:
 *   source -> trackGain -> masterGain -> analyser -> destination
 * `trackGain` is what actually performs the crossfade ramp, and doubles as
 * the loudness-normalization control (its "full" value is that track's
 * computed gain from useLoudnessGain, not a flat 1) - so a quiet track
 * fading in and a loud one fading out land at a matched perceived volume,
 * not just cross-dissolved at their raw, mismatched levels.
 *
 * `createMediaElementSource()` can only ever be called ONCE for a given
 * <audio> element for its entire lifetime, so each graph is cached
 * directly on the DOM node itself (survives React StrictMode's
 * mount->unmount->remount in dev, which a plain ref would not).
 */
export default function useAudioEngine({
  crossfadeEnabled,
  activeGain,
  upcomingGain,
  nextTrack,
  onTimeUpdate,
  onDurationChange,
  onEnded,
  onAutoAdvance,
  onPlaybackError,
}) {
  const audioARef = useRef(null);
  const audioBRef = useRef(null);
  const audioRefs = { A: audioARef, B: audioBRef };

  const ctxRef = useRef(null);
  const masterGainRef = useRef(null);
  const analyserRef = useRef(null);
  const activeKeyRef = useRef('A');
  const crossfadingRef = useRef(false);
  const lastAutoAdvancedSlugRef = useRef(null);

  const crossfadeEnabledRef = useRef(crossfadeEnabled);
  const activeGainRef = useRef(activeGain);
  const upcomingGainRef = useRef(upcomingGain);
  const nextTrackRef = useRef(nextTrack);
  const callbacksRef = useRef({ onTimeUpdate, onDurationChange, onEnded, onAutoAdvance, onPlaybackError });

  useEffect(() => {
    crossfadeEnabledRef.current = crossfadeEnabled;
  }, [crossfadeEnabled]);
  useEffect(() => {
    upcomingGainRef.current = upcomingGain;
  }, [upcomingGain]);
  useEffect(() => {
    nextTrackRef.current = nextTrack;
  }, [nextTrack]);
  useEffect(() => {
    callbacksRef.current = { onTimeUpdate, onDurationChange, onEnded, onAutoAdvance, onPlaybackError };
  });

  // The active track's gain can change independently (loudness measurement
  // resolves async, after the track is already playing) - when it does,
  // and we're not mid-crossfade, push it straight onto the live graph.
  useEffect(() => {
    activeGainRef.current = activeGain;
    if (crossfadingRef.current) return;
    const graph = graphFor(activeKeyRef.current);
    if (graph && ctxRef.current) {
      graph.trackGain.gain.setValueAtTime(activeGain, ctxRef.current.currentTime);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGain]);

  function ensureContext() {
    if (ctxRef.current) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const masterGain = ctx.createGain();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.75;
    masterGain.connect(analyser);
    analyser.connect(ctx.destination);
    ctxRef.current = ctx;
    masterGainRef.current = masterGain;
    analyserRef.current = analyser;
  }

  function graphFor(key) {
    const audio = audioRefs[key].current;
    if (!audio) return null;
    if (audio._engineGraph) return audio._engineGraph;

    ensureContext();
    try {
      const source = ctxRef.current.createMediaElementSource(audio);
      const trackGain = ctxRef.current.createGain();
      trackGain.gain.value = key === activeKeyRef.current ? activeGainRef.current : 0;
      source.connect(trackGain);
      trackGain.connect(masterGainRef.current);
      const graph = { source, trackGain };
      audio._engineGraph = graph;
      return graph;
    } catch {
      // Graph creation can fail (e.g. already attached elsewhere). Playback
      // still works via the plain <audio> element - just without gain
      // control, so that element's volume/crossfade/normalization are
      // silently skipped rather than crashing anything.
      audio._engineGraph = null;
      return null;
    }
  }

  function otherKey(key) {
    return key === 'A' ? 'B' : 'A';
  }

  // --- Wire up permanent per-element listeners once on mount --------------
  useEffect(() => {
    const cleanups = ['A', 'B'].map((key) => {
      const audio = audioRefs[key].current;
      if (!audio) return () => {};

      const isActive = () => activeKeyRef.current === key;

      const onTime = () => {
        if (!isActive()) return;
        callbacksRef.current.onTimeUpdate(audio.currentTime);

        if (crossfadingRef.current || !crossfadeEnabledRef.current) return;
        const remaining = audio.duration - audio.currentTime;
        if (!Number.isFinite(remaining) || remaining > CROSSFADE_SECONDS || remaining <= 0) return;
        const next = nextTrackRef.current;
        if (!next) return; // last track in the queue - let it play out naturally
        startCrossfade(next, remaining);
      };
      const onLoadedMeta = () => {
        if (isActive()) callbacksRef.current.onDurationChange(audio.duration);
      };
      const onTrackEnded = () => {
        if (!isActive() || crossfadingRef.current) return;
        // Crossfade didn't handle this transition (disabled, or no next
        // track was known in time) - fall back to a plain hard switch.
        callbacksRef.current.onEnded();
      };
      const onError = () => {
        if (isActive()) callbacksRef.current.onPlaybackError();
      };

      audio.addEventListener('timeupdate', onTime);
      audio.addEventListener('loadedmetadata', onLoadedMeta);
      audio.addEventListener('ended', onTrackEnded);
      audio.addEventListener('error', onError);
      return () => {
        audio.removeEventListener('timeupdate', onTime);
        audio.removeEventListener('loadedmetadata', onLoadedMeta);
        audio.removeEventListener('ended', onTrackEnded);
        audio.removeEventListener('error', onError);
      };
    });
    return () => cleanups.forEach((fn) => fn());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startCrossfade(next, availableSeconds) {
    ensureContext();
    crossfadingRef.current = true;

    const fromKey = activeKeyRef.current;
    const toKey = otherKey(fromKey);
    const fromAudio = audioRefs[fromKey].current;
    const toAudio = audioRefs[toKey].current;
    const fromGraph = graphFor(fromKey);
    const toGraph = graphFor(toKey);
    const targetGain = upcomingGainRef.current ?? 1;
    const duration = Math.max(0.3, Math.min(CROSSFADE_SECONDS, availableSeconds));
    const now = ctxRef.current.currentTime;

    toAudio.src = next.audioSrc;
    toAudio.currentTime = 0;
    if (toGraph) toGraph.trackGain.gain.setValueAtTime(0, now);
    toAudio.play().catch(() => {});

    if (fromGraph) {
      fromGraph.trackGain.gain.cancelScheduledValues(now);
      fromGraph.trackGain.gain.setValueAtTime(fromGraph.trackGain.gain.value, now);
      fromGraph.trackGain.gain.linearRampToValueAtTime(0, now + duration);
    }
    if (toGraph) {
      toGraph.trackGain.gain.cancelScheduledValues(now);
      toGraph.trackGain.gain.linearRampToValueAtTime(targetGain, now + duration);
    }

    window.setTimeout(() => {
      fromAudio.pause();
      fromAudio.currentTime = 0;
      activeKeyRef.current = toKey;
      crossfadingRef.current = false;
      lastAutoAdvancedSlugRef.current = next.slug;
      // Pass the real, already-in-progress currentTime/duration of `toAudio`
      // through to the caller's onAutoAdvance in the SAME call that swaps
      // `currentSong` - not as a separate onDurationChange call beforehand,
      // since that value would just get stomped back to 0 a moment later by
      // whatever store action onAutoAdvance triggers to change tracks
      // (that action has its own, separate reset-to-0 default it applies
      // for the *normal* skip-button case, which runs unconditionally
      // unless it's told otherwise here).
      callbacksRef.current.onAutoAdvance({
        currentTime: Number.isFinite(toAudio.currentTime) ? toAudio.currentTime : 0,
        duration: Number.isFinite(toAudio.duration) ? toAudio.duration : 0,
      });
    }, duration * 1000);
  }

  return {
    audioARef,
    audioBRef,

    /** Hard-loads a track into the currently-active buffer - used for the
     * very first track, and any user-initiated change (skip/prev/queue
     * click) where an instant switch is correct, not a fade. If this slug
     * is the one a crossfade *just* auto-advanced to, it's a no-op - that
     * audio is already playing correctly in place. */
    loadTrack(track, { autoplay } = {}) {
      if (lastAutoAdvancedSlugRef.current === track.slug) {
        lastAutoAdvancedSlugRef.current = null;
        return;
      }
      ensureContext();
      const key = activeKeyRef.current;
      const audio = audioRefs[key].current;
      if (!audio) return;
      audio.src = track.audioSrc;
      audio.load();
      const graph = graphFor(key);
      if (graph) graph.trackGain.gain.setValueAtTime(activeGainRef.current, ctxRef.current.currentTime);
      if (autoplay) {
        ctxRef.current?.resume?.();
        audio.play().catch(() => callbacksRef.current.onPlaybackError());
      }
    },

    play() {
      ensureContext();
      ctxRef.current?.resume?.();
      const audio = audioRefs[activeKeyRef.current].current;
      audio?.play().catch(() => callbacksRef.current.onPlaybackError());
    },

    pause() {
      audioRefs[activeKeyRef.current].current?.pause();
      // A crossfade in progress should stop dead on manual pause rather
      // than keep fading in the background while the UI reads "paused".
      if (crossfadingRef.current) {
        audioRefs[otherKey(activeKeyRef.current)].current?.pause();
      }
    },

    seek(time) {
      const audio = audioRefs[activeKeyRef.current].current;
      if (!audio) return;
      if (audio.readyState >= 1) {
        // HAVE_METADATA or better - safe to set immediately.
        audio.currentTime = time;
      } else {
        // No metadata yet (e.g. seek requested right after switching
        // tracks) - setting currentTime now is unreliable across browsers
        // and can get silently reset back to 0 once metadata *does* load.
        // Defer the actual seek to the moment it becomes safe.
        const onLoadedMeta = () => {
          audio.currentTime = time;
          audio.removeEventListener('loadedmetadata', onLoadedMeta);
        };
        audio.addEventListener('loadedmetadata', onLoadedMeta);
      }
    },

    setVolume(volume) {
      ensureContext();
      if (masterGainRef.current) masterGainRef.current.gain.value = volume;
    },

    getAnalyser() {
      return analyserRef.current;
    },
  };
}
