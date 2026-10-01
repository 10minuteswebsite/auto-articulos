"use client";

import { sectionStyle, h2Style } from "./dashboard-ui";
import ComposioConnect from "./ComposioConnect";

export default function FacebookSection() {
  return (
    <section style={sectionStyle}>
      <h2 style={h2Style}>Facebook</h2>
      <p className="lead-copy" style={{ margin: "0 0 16px 0" }}>
        En este sitio conectas tu cuenta de Facebook para que SEO TOTAL pueda publicar los artículos o el contenido seleccionado por la IA que tú apruebes en la Página que elijas. Sigue las instrucciones para configurarla paso a paso.
      </p>
      <ComposioConnect inline apps={["facebook"]} />
    </section>
  );
}
