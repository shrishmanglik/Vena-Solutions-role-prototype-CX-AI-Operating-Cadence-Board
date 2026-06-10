import type { PortfolioAssumptions } from "./portfolio";
import { defaultPortfolioAssumptions } from "./portfolio";

export type ScenarioId = "Conservative" | "Base" | "Aggressive";

export type ScenarioSelection = ScenarioId | "Custom";

export interface ScenarioPreset {
  id: ScenarioId;
  label: string;
  description: string;
  assumptions: PortfolioAssumptions;
}

export const scenarioPresets: ScenarioPreset[] = [
  {
    id: "Conservative",
    label: "Conservative",
    description: "Lower cost basis, narrow rollout, cautious adoption, heavier pilot budget.",
    assumptions: {
      loadedHourlyCost: 95,
      scaleMultiplier: 2,
      adoptionCoverage: 60,
      pilotInvestment: 220000,
      cxDelayCostPerDay: 300
    }
  },
  {
    id: "Base",
    label: "Base",
    description: "Planning baseline used for the default pilot business case.",
    assumptions: { ...defaultPortfolioAssumptions }
  },
  {
    id: "Aggressive",
    label: "Aggressive",
    description: "Broad rollout with strong adoption and a leaner pilot investment.",
    assumptions: {
      loadedHourlyCost: 150,
      scaleMultiplier: 6,
      adoptionCoverage: 92,
      pilotInvestment: 165000,
      cxDelayCostPerDay: 550
    }
  }
];

export function getScenarioPreset(id: ScenarioId): ScenarioPreset {
  return scenarioPresets.find((preset) => preset.id === id) ?? scenarioPresets[1];
}

export function matchScenario(assumptions: PortfolioAssumptions): ScenarioSelection {
  const match = scenarioPresets.find(
    (preset) =>
      preset.assumptions.loadedHourlyCost === assumptions.loadedHourlyCost &&
      preset.assumptions.scaleMultiplier === assumptions.scaleMultiplier &&
      preset.assumptions.adoptionCoverage === assumptions.adoptionCoverage &&
      preset.assumptions.pilotInvestment === assumptions.pilotInvestment &&
      preset.assumptions.cxDelayCostPerDay === assumptions.cxDelayCostPerDay
  );

  return match ? match.id : "Custom";
}

export function isScenarioSelection(value: unknown): value is ScenarioSelection {
  return value === "Conservative" || value === "Base" || value === "Aggressive" || value === "Custom";
}
