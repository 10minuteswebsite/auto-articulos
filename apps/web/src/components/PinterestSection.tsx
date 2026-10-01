"use client";

import { sectionStyle, h2Style } from "./dashboard-ui";
import ComposioConnect from "./ComposioConnect";

export default function PinterestSection() {
  return (
    <section style={sectionStyle}>
      <h2 style={h2Style}>Pinterest</h2>
      <p className="lead-copy" style={{ margin: "0 0 16px 0" }}>
        Conexión administrada desde esta tarjeta. Elige aquí el tablero que usará SEO TOTAL.
      </p>
      <ComposioConnect inline apps={["pinterest"]} />
    </section>
  );
}
