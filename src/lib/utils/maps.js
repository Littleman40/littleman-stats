export const MAP_OPTIONS = [
  { slug: 'srp', label: 'SRP', apiName: 'shuto_revival_project_beta' },
  { slug: '415', label: '415', apiName: 'nohesi_415' },
  { slug: '110', label: '110', apiName: 'nohesi_110' }
];

export const DEFAULT_MAP_SLUG = 'srp';

export function fnResolveMap(mapSlug) {
  const match = MAP_OPTIONS.find((mapOption) => mapOption.slug === mapSlug);
  if (match !== undefined) {
    return match;
  }
  return MAP_OPTIONS.find((mapOption) => mapOption.slug === DEFAULT_MAP_SLUG);
}

export function fnResolveMapSlug(mapSlug) {
  return fnResolveMap(mapSlug).slug;
}