// Controlled vocabulary for soil descriptions.
// Each entry: [code, abbreviation, full name]. Codes are what we store; the
// abbreviation or full name is what gets printed, depending on settings.
// Sources: USDA Soil Survey Manual (Ch. 3) field terms; Maine 10-144 CMR Ch. 241.

export const HORIZONS = ['Oi', 'Oe', 'Oa', 'A', 'Ap', 'E', 'Bh', 'Bhs', 'Bs', 'Bw', 'Bg', 'BC', 'C', 'Cd', 'Cg', '2C', '2Cd'];

export const HUES = ['10R', '2.5YR', '5YR', '7.5YR', '10YR', '2.5Y', '5Y', 'GLEY1', 'GLEY2'];
export const VALUES = ['2', '2.5', '3', '4', '5', '6', '7', '8'];
export const CHROMAS = ['1', '2', '3', '4', '5', '6', '8'];
export const GLEY_CHIPS = ['N', '10Y', '5GY', '10GY', '5G', '5BG', '10B', '5PB']; // gley "chroma" positions

export const TEXTURE_MODS = [
  ['gr', 'gr', 'Gravelly'], ['vgr', 'vgr', 'Very gravelly'], ['xgr', 'xgr', 'Extremely gravelly'],
  ['cb', 'cb', 'Cobbly'], ['vcb', 'vcb', 'Very cobbly'], ['st', 'st', 'Stony'], ['vst', 'vst', 'Very stony'],
  ['cn', 'cn', 'Channery'], ['mk', 'mk', 'Mucky'],
];

export const TEXTURES = [
  ['cos', 'cos', 'Coarse sand'], ['s', 's', 'Sand'], ['fs', 'fs', 'Fine sand'], ['vfs', 'vfs', 'Very fine sand'],
  ['lcos', 'lcos', 'Loamy coarse sand'], ['ls', 'ls', 'Loamy sand'], ['lfs', 'lfs', 'Loamy fine sand'],
  ['cosl', 'cosl', 'Coarse sandy loam'], ['sl', 'sl', 'Sandy loam'], ['fsl', 'fsl', 'Fine sandy loam'],
  ['vfsl', 'vfsl', 'Very fine sandy loam'], ['l', 'l', 'Loam'], ['sil', 'sil', 'Silt loam'], ['si', 'si', 'Silt'],
  ['scl', 'scl', 'Sandy clay loam'], ['cl', 'cl', 'Clay loam'], ['sicl', 'sicl', 'Silty clay loam'],
  ['sc', 'sc', 'Sandy clay'], ['sic', 'sic', 'Silty clay'], ['c', 'c', 'Clay'],
  ['pt', 'pt', 'Peat'], ['mpt', 'mpt', 'Mucky peat'], ['muck', 'muck', 'Muck'],
];

export const STRUCT_GRADES = [
  ['0', '', 'Structureless'], ['1', 'wk', 'Weak'], ['2', 'mod', 'Moderate'], ['3', 'st', 'Strong'],
];
export const STRUCT_SIZES = [
  ['vf', 'vf', 'Very fine'], ['f', 'f', 'Fine'], ['m', 'm', 'Medium'], ['co', 'co', 'Coarse'], ['vc', 'vc', 'Very coarse'],
];
export const STRUCT_TYPES = [
  ['gr', 'gr', 'Granular'], ['sbk', 'sbk', 'Subangular blocky'], ['abk', 'abk', 'Angular blocky'],
  ['pl', 'pl', 'Platy'], ['pr', 'pr', 'Prismatic'], ['sg', 'sg', 'Single grain'], ['ma', 'm', 'Massive'],
];

export const CONSISTENCE = [
  ['lo', 'lo', 'Loose'], ['vfr', 'vfr', 'Very friable'], ['fr', 'fr', 'Friable'], ['fi', 'fi', 'Firm'],
  ['vfi', 'vfi', 'Very firm'], ['efi', 'efi', 'Extremely firm'],
];

export const REDOX_ABUNDANCE = [['f', 'f', 'Few'], ['c', 'c', 'Common'], ['m', 'm', 'Many']];
export const REDOX_SIZE = [['f', 'f', 'Fine'], ['m', 'm', 'Medium'], ['co', 'co', 'Coarse']];
export const REDOX_CONTRAST = [['ft', 'f', 'Faint'], ['d', 'd', 'Distinct'], ['p', 'p', 'Prominent']];
export const REDOX_KIND = [
  ['conc', '', 'Concentrations'], ['depl', '', 'Depletions'], ['rm', 'RM', 'Reduced matrix'],
];

export const DRAINAGE = [
  ['ED', 'Excessively drained'], ['SED', 'Somewhat excessively drained'], ['WD', 'Well drained'],
  ['MWD', 'Moderately well drained'], ['SPD', 'Somewhat poorly drained'], ['PD', 'Poorly drained'],
  ['VPD', 'Very poorly drained'],
];

export const HSG = ['A', 'B', 'C', 'D', 'A/D', 'B/D', 'C/D'];

export const LIMITING = [
  ['gw', 'Groundwater'], ['rl', 'Restrictive Layer'], ['br', 'Bedrock'],
];

// Ch. 241 Table 5D soil profiles (short descriptions for the picker).
export const PROFILES = [
  ['1', 'Lodgment till: silt loam throughout; firm, dense with depth (4.1 SF)'],
  ['2', 'Ablation till: loam to sandy loam, no restrictive horizon (3.3 SF)'],
  ['3', 'Lodgment till: loam to loamy sand over compact/restrictive lower horizons (3.3 SF)'],
  ['4', 'Ablation till: sl-ls over loose loamy sand (2.6 SF)'],
  ['5', 'Stratified drift: loam-ls over fine/medium sand (2.6 SF)'],
  ['6', 'Stratified drift: ls-sand over coarse sand or gravel (2.6 SF)'],
  ['7', 'Mixed: 15"+ till/drift over silt-clay or firm basal till (3.3 SF)'],
  ['8', 'Lacustrine: loam-fsl over firm silt loam/silt (4.1 SF)'],
  ['9', 'Marine: silt loam over firm silt loam-silty clay (5.0 SF)'],
  ['10', 'Organic: 16"+ partially decomposed organics (not permitted)'],
  ['11', 'Alluvial / dune / beach: best fit'],
  ['12', 'Filled site: best fit'],
];

// Lookups --------------------------------------------------------------
const tables = {
  textureMod: TEXTURE_MODS, texture: TEXTURES, grade: STRUCT_GRADES, size: STRUCT_SIZES, stype: STRUCT_TYPES,
  consistence: CONSISTENCE, rAbund: REDOX_ABUNDANCE, rSize: REDOX_SIZE, rContrast: REDOX_CONTRAST, rKind: REDOX_KIND,
};
export function term(table, code) {
  if (!code) return null;
  const row = tables[table].find(r => r[0] === code);
  return row ? { code: row[0], abbr: row[1], full: row[2] } : { code, abbr: code, full: code };
}
