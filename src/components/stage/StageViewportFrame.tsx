import { forwardRef, type HTMLAttributes } from 'react';

type StageViewportFrameProps = HTMLAttributes<HTMLDivElement>;

export const StageViewportFrame = forwardRef<HTMLDivElement, StageViewportFrameProps>(function StageViewportFrame(
  { className = '', children, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={`flex flex-1 min-h-0 items-center justify-center overflow-hidden rounded-lg border border-slate-700 bg-slate-800 p-[clamp(16px,2vh,28px)] ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
});

