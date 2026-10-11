/**
 * Utilitaires pour la langue française
 */

/**
 * Renvoie « d' » devant une voyelle ou un h muet (a, e, é, è, ê, i, o, u, y, h) et « de » sinon.
 * « de » inclut l'espace subséquent (« de ») pour permettre la concaténation directe `${de(nom)}${nom}`
 * tout en conservant une élision sans espace pour « d' » (ex. « livrable d'Exploration », « livrable de Finalisation »).
 */
export function de(nom?: string): string {
  if (!nom) return 'de ';
  const trimmed = nom.trim();
  const first = trimmed.charAt(0).toLowerCase();
  // Voyelles et h muet : a, e, é, è, ê, ë, i, î, ï, o, ô, ö, u, ù, û, ü, y, h
  const isElided = /^[aàâäeéèêëiîïoôöuùûüyh]/i.test(first);
  return isElided ? "d'" : "de ";
}
