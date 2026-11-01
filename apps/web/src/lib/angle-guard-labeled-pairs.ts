// Pares etiquetados para validar el detector y el juez de la Guardia de ángulos.
// Son ejemplos NEUTROS (sin datos de clientes). `same: true` = un lector con la
// misma necesidad quedaría satisfecho con cualquiera de los dos (repetido);
// `same: false` = preguntas distintas aunque se parezcan en las palabras.

export interface LabeledPair {
  a: string;
  b: string;
  same: boolean;
  why: string;
}

export const LABELED_PAIRS: LabeledPair[] = [
  // ----- distintos (contrastes): cambia la acción, el público, el lugar o el producto -----
  { a: "10 Mistakes When Buying a Boat", b: "10 Mistakes When Selling a Boat", same: false, why: "comprar vs vender" },
  { a: "How to Rent Out Your Condo in Coral Gables", b: "How to Rent a Condo in Coral Gables", same: false, why: "propietario que alquila vs inquilino" },
  { a: "Best Schools in Coral Gables for Elementary Kids", b: "Best Schools in Coral Gables for High School Students", same: false, why: "otro nivel escolar" },
  { a: "Cómo comprar una casa en Miami", b: "Cómo vender una casa en Miami", same: false, why: "comprar vs vender" },
  { a: "Cómo alquilar un apartamento en Miami", b: "Cómo alquilar un apartamento en Orlando", same: false, why: "otra ciudad" },
  { a: "Seguro de salud para familias en Florida", b: "Seguro de salud para jubilados en Florida", same: false, why: "otro público" },
  { a: "Pros of Buying a Condo in Coral Gables", b: "Cons of Buying a Condo in Coral Gables", same: false, why: "ventajas vs desventajas" },
  { a: "Preguntas para hacerle a tu agente antes de comprar", b: "Preguntas para hacerle a tu agente antes de vender", same: false, why: "comprar vs vender" },
  { a: "Qué es una visa EB-5 y quién califica", b: "Qué es una visa H-1B y quién califica", same: false, why: "otro tipo de visa" },
  { a: "How to Roll Over a 401k Into an IRA", b: "How to Roll Over a 403b Into an IRA", same: false, why: "otro tipo de cuenta" },
  { a: "What Taxes Apply When Selling a Home in Coral Gables", b: "What Fees Apply When Selling a Home in Coral Gables", same: false, why: "impuestos vs comisiones" },
  { a: "Can You Add an ADU in Coral Gables", b: "Can You Use a VA Loan in Coral Gables", same: false, why: "otro tema" },
  { a: "How to Buy a Condo in Coral Gables", b: "How to Sell a Condo in Coral Gables", same: false, why: "comprar vs vender" },
  { a: "Cómo vender tu casa rápido en Coral Gables", b: "Qué impuestos pagas al vender tu casa en Coral Gables", same: false, why: "velocidad vs impuestos" },
  { a: "Best Brunch Spots in Wynwood", b: "Best Dinner Spots in Wynwood", same: false, why: "otra comida" },
  { a: "How to Build Muscle After 40", b: "How to Lose Fat After 40", same: false, why: "otro objetivo" },
  { a: "FHA 203k Loans for Fixer Uppers", b: "FHA Loans for First Time Buyers", same: false, why: "otro público y producto" },
  { a: "Cuánto cuesta un implante dental", b: "Cuánto cuesta un blanqueamiento dental", same: false, why: "otro tratamiento" },
  // ----- repetidos: la misma pregunta con otras palabras -----
  { a: "Tips for Embracing Change: Downsizing Your Longtime Residence", b: "Tips for Embracing Change: Downsizing Your Longtime Residence in Coral Gables", same: true, why: "mismo título con sufijo de lugar" },
  { a: "Cómo vender tu casa rápido", b: "Cómo vender rápido tu casa", same: true, why: "mismo orden alterado" },
  { a: "5 Ways to Stage Your Home", b: "7 Ways to Stage Your Home", same: true, why: "solo cambia el número de la lista" },
  { a: "Best Home Prices in Coral Gables", b: "Best Home Price in Coral Gables", same: true, why: "singular vs plural" },
  { a: "Cómo elegir un seguro de vida en Miami", b: "Cómo elegir el mejor seguro de vida en Miami", same: true, why: "añade un adjetivo" },
  { a: "Best Brunch Spots in Wynwood", b: "Top Brunch Spots in Wynwood for 2026", same: true, why: "mismo tema con otra palabra de apertura" },
  { a: "Steps to Prepare Your Home for a Quick Sale", b: "Essential Steps to Prepare Your Home for Sale", same: true, why: "misma pregunta con adjetivos" },
  { a: "Current Condo Market Trends", b: "What Are the Current Condo Market Trends?", same: true, why: "afirmación vs pregunta" },
  { a: "¿Cuánto cuesta un seguro de salud para familias en Florida?", b: "¿Cuál es el precio de un seguro de salud familiar en Florida?", same: true, why: "sinónimos (precio/costo)" },
];

/**
 * Pares INDEPENDIENTES: no aparecen en el prompt del juez ni se usaron para
 * ajustarlo. Miden si el juez generaliza o solo aprendió los 27 anteriores.
 */
export const HELDOUT_PAIRS: LabeledPair[] = [
  { a: "How to Hire a Contractor for a Kitchen Remodel", b: "How to Become a Contractor for Kitchen Remodels", same: false, why: "cliente vs profesional" },
  { a: "Cuánto cuesta una boda en Cancún", b: "Cuánto cuesta una boda en Tulum", same: false, why: "otro lugar" },
  { a: "Best Time to Plant Tomatoes in Florida", b: "Best Time to Harvest Tomatoes in Florida", same: false, why: "sembrar vs cosechar" },
  { a: "Pros and Cons of Solar Panels", b: "Cost of Solar Panels", same: false, why: "otro ángulo" },
  { a: "Requisitos para abrir una cuenta bancaria como extranjero", b: "Requisitos para abrir una cuenta bancaria como ciudadano", same: false, why: "otro público" },
  { a: "How to Choose a Family Dentist", b: "How to Choose the Best Family Dentist in Miami", same: true, why: "adjetivo y lugar de contexto" },
  { a: "7 Signs Your Roof Needs Replacing", b: "5 Signs Your Roof Needs to Be Replaced", same: true, why: "número y redacción" },
  { a: "Qué documentos necesito para rentar un apartamento", b: "Documentos necesarios para alquilar un apartamento", same: true, why: "sinónimos y formato" },
  { a: "Is Solar Worth It in Florida?", b: "Solar Panels in Florida: Are They Worth It?", same: true, why: "formato distinto" },
  { a: "Tax Deductions for Freelancers", b: "Tax Deduction for Freelancer", same: true, why: "singular y plural" },
];
