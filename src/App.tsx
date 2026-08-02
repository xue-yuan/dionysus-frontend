import { Router, Route } from "@solidjs/router";
import { ErrorBoundary, lazy, Suspense } from "solid-js";
import "./index.css";
import { I18nProvider } from "./i18n";

const Home = lazy(() => import("./pages/Home.tsx"));
const RecipeGallery = lazy(() => import("./pages/RecipeGallery.tsx"));
const SavedRecipes = lazy(() => import("./pages/SavedRecipes.tsx"));

function Fallback(props: { error: unknown; reset: () => void }) {
  return (
    <div class="min-h-screen flex flex-col items-center justify-center gap-8 bg-black text-white p-8 text-center">
      <span class="text-7xl opacity-20" aria-hidden="true">
        🥃
      </span>
      <h1 class="text-2xl font-black uppercase tracking-[0.4em] text-white/40">
        Something spilled
      </h1>
      <p class="text-xs text-white/20 max-w-md break-words">
        {props.error instanceof Error ? props.error.message : String(props.error)}
      </p>
      <button
        type="button"
        onClick={props.reset}
        class="px-8 py-3 border border-white/10 rounded-xl text-[11px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:border-white/20 transition-all"
      >
        [ Retry ]
      </button>
    </div>
  );
}

function App() {
  return (
    <div class="min-h-screen bg-base-100 text-base-content font-sans relative">
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
