import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4 text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-2">
            Something went wrong
          </h1>
          <p className="mb-4">
            We apologize for the inconvenience. Please reload the app.
          </p>
          <pre className="bg-gray-900 p-4 rounded text-xs text-left w-full overflow-auto max-w-sm border border-gray-800">
            {this.state.error?.toString()}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-3 bg-white text-black font-bold rounded-full"
          >
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
