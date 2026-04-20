const MALE_PARTS = ['Tor', 'Bran', 'Kael', 'Dun', 'Rath', 'Vor', 'Grim', 'Ald', 'Finn', 'Crag', 'Dag', 'Holt', 'Marn', 'Rek', 'Skar'];
const FEMALE_PARTS = ['Ara', 'Lyn', 'Mora', 'Sela', 'Vara', 'Tara', 'Elna', 'Brea', 'Nara', 'Mira', 'Sova', 'Ilka', 'Rena', 'Thea', 'Vela'];
const SUFFIXES = ['', 'os', 'wyn', 'en', 'ith', 'an', 'ar', 'in', 'a', 'us'];

export function generateName(sex: 'male' | 'female', rng: () => number): string {
  const parts = sex === 'male' ? MALE_PARTS : FEMALE_PARTS;
  const base = parts[Math.floor(rng() * parts.length)]!;
  const suffix = SUFFIXES[Math.floor(rng() * SUFFIXES.length)]!;
  return base + suffix;
}
