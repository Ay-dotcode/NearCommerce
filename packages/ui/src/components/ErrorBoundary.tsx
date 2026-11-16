import { Component, ErrorInfo, ReactNode } from "react";
import { ErrorFallback } from "./ErrorFallback";

interface ErrorBoundaryProps {
  children: ReactNode;
  // Custom fallback; receives a function that clears the error and renders the children again.
  fallback?: (reset: () => void) => ReactNode;
  // Hook for error reporting (Sentry and similar).
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// Catches errors thrown while rendering its children so one broken component cannot take the
// whole app down to a blank page.
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
    console.error("Unhandled UI error:", error, info.componentStack);
  }

  private reset = () => this.setState({ hasError: false });

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      this.props.fallback?.(this.reset) ?? (
        <ErrorFallback onRetry={this.reset} />
      )
    );
  }
}
