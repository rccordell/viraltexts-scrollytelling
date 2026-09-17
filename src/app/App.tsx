import { useRoute } from "./router";
import { Landing } from "./Landing";
import { ExhibitPage } from "./ExhibitPage";

export function App() {
  const route = useRoute();

  if (route.name === "exhibit") {
    return <ExhibitPage slug={route.slug} />;
  }
  return <Landing />;
}
