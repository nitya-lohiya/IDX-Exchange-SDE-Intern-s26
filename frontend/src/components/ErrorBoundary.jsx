import { Component } from "react";
import PropTypes from "prop-types";
import "./ErrorBoundary.css";

/**
 * Catches render-time errors anywhere below it and shows a recovery UI instead
 * of React unmounting the whole tree (which leaves a blank white page).
 *
 * This has to be a class: getDerivedStateFromError and componentDidCatch have
 * no hook equivalent, so an error boundary cannot be written as a function
 * component. It only catches errors thrown during render, in lifecycle methods,
 * and in constructors below it — NOT event handlers, async callbacks, or errors
 * thrown by the boundary itself.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    // Runs during the render phase — return the next state, no side effects.
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    // Commit phase: safe place to report to an error tracker.
    if (import.meta.env.DEV) {
      console.error("Render error caught by ErrorBoundary:", error, errorInfo);
    }
  }

  handleReset = () => {
    // Clearing the error re-renders the children and gives them another try.
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="error-boundary" role="alert">
        <div className="error-boundary__card">
          <h1>Something went wrong</h1>
          <p>
            This part of the page failed to load. You can try again, or head back
            to the listings.
          </p>
          {import.meta.env.DEV && (
            <pre className="error-boundary__details">{String(error?.message || error)}</pre>
          )}
          <div className="error-boundary__actions">
            <button type="button" onClick={this.handleReset}>
              Try again
            </button>
            <a href="/">Back to listings</a>
          </div>
        </div>
      </div>
    );
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node,
};
