"use client";

import { sectionStyle, h2Style } from "./dashboard-ui";
import ComposioConnect from "./ComposioConnect";

export default function InstagramSection() {
  return (
    <section style={sectionStyle}>
      <h2 style={h2Style}>Instagram</h2>
      <p className="lead-copy" style={{ margin: "0 0 16px 0" }}>
        En este sitio conectas tu cuenta de Instagram para que SEO TOTAL pueda publicar los artículos o el contenido seleccionado por la IA que tú apruebes. Sigue las instrucciones para configurarla paso a paso.
      </p>
      <ComposioConnect inline apps={["instagram"]} />
    </section>
  );
}
