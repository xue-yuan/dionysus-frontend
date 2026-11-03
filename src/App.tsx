import { Router, Route } from "@solidjs/router";
import { ErrorBoundary, lazy, Suspense } from "solid-js";
import "./index.css";
import { I18nProvider } from "./i18n";

const Home = lazy(() => import("./pages/Home.tsx"));
const RecipeGallery = lazy(() => import("./pages/RecipeGallery.tsx"));
const SavedRecipes = lazy(() => import("./pages/SavedRecipes.tsx"));

/**
 * Rendered outside the I18nProvider — if the provider itself is what threw,
 * calling `t` here would throw again — so the two strings stay in English.
 */
function Fallback(props: { error: unknown; reset: () => void }) {
  return (
    <div class="min-h-screen bg-paper flex items-center justify-center p-8">
      <div class="max-w-md text-center">
        <span class="eyebrow">Error</span>
        <h1 class="display mt-3 text-4xl">Something went wrong</h1>
        <p class="mt-4 font-mono text-[12px] text-ink-muted break-words">
          {props.error instanceof Error ? props.error.message : String(props.error)}
        </p>
        <button type="button" onClick={props.reset} class="btn btn-outline mt-8">
          Try again
        </button>
      </div>
    </div>
  );
}

function App() {
  return (
    <div class="min-h-screen bg-paper text-ink">
      <ErrorBoundary fallback={(error, reset) => <Fallback error={error} reset={reset} />}>
        <I18nProvider>
          <Suspense>
            <Router>
              <Route path="/" component={Home} />
              <Route path="/recipes" component={RecipeGallery} />
              <Route path="/saved" component={SavedRecipes} />
              <Route path="*" component={Home} />
            </Router>
          </Suspense>
        </I18nProvider>
      </ErrorBoundary>
    </div>
  );
}

export default App;
