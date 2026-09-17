import { exhibitHref } from "./router";
import manifest from "../../exhibits/manifest.json";

export function Landing() {
  return (
    <div style={{ padding: "3rem", maxWidth: 640, margin: "0 auto" }}>
      <h1>Exhibits</h1>
      <ul>
        {manifest.map((e) => (
          <li key={e.slug}>
            <a href={exhibitHref(e.slug)}>{e.title}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
