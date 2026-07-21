export const wasteStreams = [
  {
    value: "Wet",
    label: "Wet / organic",
    description: "Food scraps, vegetable waste, and other compostable market waste.",
  },
  {
    value: "Dry",
    label: "Dry recyclables",
    description: "Clean, non-organic recyclable material that is already segregated.",
  },
  {
    value: "Plastic",
    label: "Plastic",
    description: "Bottles, rigid containers, film, and other accepted plastic packaging.",
  },
  {
    value: "Paper",
    label: "Paper & cardboard",
    description: "Cartons, boxes, paper packaging, and clean paper products.",
  },
  {
    value: "Metal",
    label: "Metal",
    description: "Cans, tins, aluminium, and other recyclable metal items.",
  },
  {
    value: "Glass",
    label: "Glass",
    description: "Bottles, jars, and other safely contained recyclable glass.",
  },
  {
    value: "E-waste",
    label: "E-waste",
    description: "Small electronics, cables, batteries, and electrical accessories.",
    restricted: true,
  },
  {
    value: "Mixed",
    label: "Mixed waste",
    description: "Unsegregated loads that require a sorting-capable facility.",
    restricted: true,
  },
] as const;

export const wasteTypeValues = wasteStreams.map((stream) => stream.value) as [
  "Wet",
  "Dry",
  "Plastic",
  "Paper",
  "Metal",
  "Glass",
  "E-waste",
  "Mixed",
];

export type WasteType = (typeof wasteTypeValues)[number];

export const isWasteType = (value: unknown): value is WasteType =>
  typeof value === "string" &&
  (wasteTypeValues as readonly string[]).includes(value);

export const normalizeWasteTypes = (value: unknown): WasteType[] => {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(isWasteType))];
};
