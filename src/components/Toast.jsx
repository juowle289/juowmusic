import { cn } from '@/lib/utils';

/** Fixed bottom-center pill, fades/slides in when `message` is truthy. */
export default function Toast({ message }) {
  return (
    <div
      className={cn(
        'pointer-events-none fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-full bg-black px-4 py-2 text-sm text-white shadow-xl ring-1 ring-white/10 transition-all duration-300',
        message ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
      )}
    >
      {message}
    </div>
  );
}
