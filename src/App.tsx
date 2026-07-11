import { Router, Route } from "@solidjs/router";
import { lazy } from "solid-js";
import "./index.css";

const Home = lazy(() => import("./pages/Home.tsx"));
const AddRecipe = lazy(() => import("./pages/AddRecipe.tsx"));
const RecipeGallery = lazy(() => import("./pages/RecipeGallery.tsx"));
const RecipeDetails = lazy(() => import("./pages/RecipeDetails.tsx"));
const SavedRecipes = lazy(() => import("./pages/SavedRecipes.tsx"));
import { I18nProvider } from "./i18n";

function App() {
  return (
    <div class="min-h-screen bg-base-100 text-base-content font-sans relative">
      <I18nProvider>
        <Router>
          <Route path="/" component={Home} />
          <Route path="/add" component={AddRecipe} />
          <Route path="/recipes" component={RecipeGallery} />
          <Route path="/recipes/:id" component={RecipeDetails} />
          <Route path="/saved" component={SavedRecipes} />
        </Router>
      </I18nProvider>
    </div>
  );
}

export default App;
