import { Component } from 'react';

/** Last line of defence: without it, one render error anywhere unmounts the
 * whole app and leaves a blank white/black screen with no way out. */
export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[juowmusic] Unhandled render error:', error, info?.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center text-white">
        <h1 className="text-2xl font-medium">Something went wrong</h1>
        <p className="mt-2 max-w-md text-sm text-white/60">An unexpected error stopped this page from loading. Reloading usually fixes it.</p>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={() => window.location.reload()} className="rounded-full bg-[#feec93] px-5 py-2 text-sm font-medium text-black">
            Reload page
          </button>
          <a href="/" className="rounded-full border border-white/20 px-5 py-2 text-sm hover:border-[#feec93]">
            Go home
          </a>
        </div>
      </main>
    );
  }
}
