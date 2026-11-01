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

// ---------------------------------------------------------------------------
// Casos del JUEZ POR LISTA: un título nuevo frente a 25 existentes. En 6 hay una
// «aguja» (el mismo ángulo con sinónimos entre los 25) y en 6 no la hay (mismo
// tema, otra pregunta). Reproducen el caso real de una tanda que repite a la
// anterior con otras palabras. Textos neutros, sin datos de clientes.
// ---------------------------------------------------------------------------

import type { ListCase } from "./angle-guard-judge";

const DISTRACTORS: string[] = [
  "Cómo funciona el período de inscripción abierta", "Qué es un deducible y cómo se aplica", "Diferencias entre HMO y PPO",
  "Cómo encontrar un médico dentro de la red", "Qué cubre un seguro de visión para adultos", "Guía para elegir un dentista de confianza",
  "Cuándo conviene contratar un seguro de vida a término", "Seguro de auto: qué cubre la responsabilidad civil", "Cómo proteger tu casa contra huracanes",
  "Qué es el copago y cuándo se paga", "Beneficios de un plan para jubilados", "Cómo renovar tu plan cada año sin sorpresas",
  "Qué hacer en una emergencia médica fuera de tu ciudad", "Recetas y medicamentos genéricos: cómo ahorrar en la farmacia", "Cómo funcionan las cuentas de ahorro para gastos médicos",
  "Cómo funcionan los períodos de gracia en los pagos del plan", "Cobertura para embarazo y parto explicada", "Qué es una preautorización y por qué la piden",
  "Cómo comparar redes de hospitales en tu zona", "Planes para pequeñas empresas: lo básico", "Vacunas y chequeos preventivos cubiertos",
  "Cómo leer tu explicación de beneficios", "Seguro de viaje: cuándo es necesario", "Telemedicina: qué cubre tu plan",
  "Home Insurance Basics for First-Time Owners", "How Flood Insurance Differs from Standard Coverage", "Understanding Your Auto Policy Declarations Page",
  "What Is Umbrella Insurance and Who Needs It", "How to File a Property Claim Step by Step", "Choosing Between Term and Whole Life Insurance",
  "Dental Plans: Cleanings, Fillings and Crowns", "Vision Coverage: Exams, Glasses and Contacts", "Renters Insurance: What It Covers and What It Doesn't",
  "How Deductibles Work in Homeowners Policies", "Medicare Enrollment Periods Explained", "Short-Term Plans: Risks and Alternatives",
  "Cómo cambiar de plan si te mudas a otro condado", "Qué es el máximo de gastos de bolsillo", "Seguro de salud para estudiantes extranjeros",
  "Cómo apelar una decisión de tu aseguradora",
];

function listCase(candidate: string, needle: string | null, nearMiss: string | string[] | null, why: string, salt: number): ListCase {
  const nearMisses = Array.isArray(nearMiss) ? nearMiss : nearMiss ? [nearMiss] : [];
  const pool = DISTRACTORS.filter((d) => d !== needle && !nearMisses.includes(d));
  const start = (salt * 7) % pool.length;
  const picked = Array.from({ length: 24 }, (_, i) => pool[(start + i * 3) % pool.length]);
  const unique = [...new Set(picked)];
  while (unique.length < 24) unique.push(pool[(start + unique.length * 5 + 1) % pool.length]);
  const neighbors = unique.slice(0, 24);
  const specials = needle ? [needle] : nearMisses;
  specials.forEach((special, i) => neighbors.splice(((salt * 5) + i * 4) % 24, 0, special));
  while (neighbors.length < 25) neighbors.push(pool[(start + 99 + neighbors.length) % pool.length]);
  while (neighbors.length > 25) neighbors.pop();
  return { candidate, neighbors, expected: needle ? neighbors.indexOf(needle) : null, why };
}

export const LIST_CASES: ListCase[] = [
  // con aguja: el mismo ángulo con sinónimos
  listCase("Errores que pueden costarte al seleccionar un plan de salud", "Errores que debes evitar al elegir un seguro de salud", null, "elegir/seleccionar, evitar/costarte, seguro/plan", 1),
  listCase("Cómo ahorrar dinero en tu seguro dental", "Formas de reducir el costo de tu plan dental", null, "ahorrar/reducir costo", 2),
  listCase("Qué documentos necesitas para inscribirte en Medicaid", "Documentos requeridos para solicitar Medicaid", null, "inscribirte/solicitar", 3),
  listCase("Beneficios de tener seguro de vida a temprana edad", "Ventajas de contratar un seguro de vida cuando eres joven", null, "beneficios/ventajas, temprana edad/joven", 4),
  listCase("How to Lower Your Home Insurance Premium", "Ways to Reduce Your Homeowners Insurance Costs", null, "lower premium/reduce costs", 5),
  listCase("Qué hacer si te niegan una reclamación de seguro", "Pasos a seguir cuando rechazan tu reclamo del seguro", null, "niegan/rechazan, reclamación/reclamo", 6),
  // sin aguja: mismo tema, otra pregunta (el vecino cercano está en la lista a propósito)
  listCase("Cómo elegir un seguro de salud para tu familia", null, "Cómo elegir un seguro de salud para jubilados", "otro público", 7),
  listCase("Costos ocultos de un plan de salud", null, "Beneficios ocultos de un plan de salud", "costos frente a beneficios", 8),
  listCase("Cómo cancelar tu seguro de auto", null, "Cómo contratar tu seguro de auto", "cancelar frente a contratar", 9),
  listCase("Requisitos para el subsidio del Marketplace en Florida", null, "Requisitos para Medicaid en Florida", "otro programa", 10),
  listCase("Seguro de salud para trabajadores independientes", null, "Seguro de salud para pequeñas empresas", "otro público", 11),
  listCase("Best Dental Plans for Seniors", null, "Best Dental Plans for Children", "otro público", 12),
  // sin aguja, del tipo que el juez marcaba de más con datos reales: mismo tema general, otra pregunta concreta
  listCase("Cómo evitar costos extra al usar tu plan de salud", null, ["Cómo comparar los costos de distintos planes de salud", "Cómo entender los costos ocultos de tu plan"], "evitar, comparar y entender costos son preguntas distintas", 13),
  listCase("Cómo coordinar la mudanza después de vender tu casa", null, ["Cómo fijar el precio correcto de venta de tu casa", "Cómo preparar tu casa antes de venderla"], "mudanza, precio y preparación son preguntas distintas", 14),
  listCase("Cómo ahorrar dinero usando el programa de subsidios", null, ["Beneficios de inscribirte en el programa de subsidios", "Requisitos para entrar al programa de subsidios"], "ahorrar, beneficios y requisitos son preguntas distintas", 15),
  listCase("Gastos ocultos al analizar la rentabilidad de una propiedad de alquiler", null, ["Cómo calcular la rentabilidad de una propiedad de alquiler", "Impuestos y cuotas de un condominio de inversión"], "gastos ocultos, cálculo e impuestos son preguntas distintas", 16),
];
