export const STREETS = [
  'Paseo San Gaspar',
  'Paseo Santa Paula',
  'Paseo Rey Xolotl',
  'Paseo del Rosario',
  'Paseo de Coyula',
  'Paseo de Zalatitán',
  'Paseo de Colimilla',
  'Paseo de Matatlán',
] as const;

export type Street = (typeof STREETS)[number];
