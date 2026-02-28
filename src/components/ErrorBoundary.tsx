import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[global-error-boundary] Render failure', {
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="grid min-h-screen place-items-center bg-slate-950 p-6 text-slate-100">
          <div className="max-w-lg rounded-lg border border-rose-700/50 bg-slate-900 p-6 text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-rose-300">Demo guardrail</p>
            <h1 className="mt-2 text-xl font-bold">Something went wrong, but the session is safe.</h1>
            <p className="mt-2 text-sm text-slate-300">Please refresh the route. Core demo state is preserved in the global session stores.</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
