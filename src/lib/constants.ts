export interface PhysConst {
  name: string;
  value: number;
  unit: string;
  label: string;
}

export const DEFAULT_CONSTANTS: PhysConst[] = [
  { name: 'g', value: 9.8, unit: 'm/s^2', label: 'Acceleration due to gravity' },
  { name: 'c', value: 3e8, unit: 'm/s', label: 'Speed of light' },
  { name: 'h_p', value: 6.626e-34, unit: 'J s', label: 'Planck constant' },
  { name: 'hbar', value: 1.055e-34, unit: 'J s', label: 'Reduced Planck constant' },
  { name: 'e', value: 1.602e-19, unit: 'C', label: 'Elementary charge' },
  { name: 'm_e', value: 9.109e-31, unit: 'kg', label: 'Electron mass' },
  { name: 'm_p', value: 1.673e-27, unit: 'kg', label: 'Proton mass' },
  { name: 'k_B', value: 1.381e-23, unit: 'J/K', label: 'Boltzmann constant' },
  { name: 'N_A', value: 6.022e23, unit: '1/mol', label: 'Avogadro number' },
  { name: 'R', value: 8.314, unit: 'J/(mol K)', label: 'Gas constant' },
  { name: 'G', value: 6.674e-11, unit: 'N m^2/kg^2', label: 'Gravitational constant' },
  { name: 'eps0', value: 8.854e-12, unit: 'F/m', label: 'Permittivity of free space' },
  { name: 'mu0', value: 1.2566e-6, unit: 'H/m', label: 'Permeability of free space' },
  { name: 'sigma', value: 5.67e-8, unit: 'W/(m^2 K^4)', label: 'Stefan–Boltzmann constant' },
];
