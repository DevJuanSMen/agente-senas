// Señas que cubre la demo: letras y números estáticos de LSC.
// Las letras con movimiento quedan marcadas como pendientes (fase 2).

export const LETRAS = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split("");
export const NUMEROS = "0123456789".split("");

// Letras de LSC que llevan movimiento, según el dataset LSC70 (validado por expertos
// de la Universidad del Cauca). Ajustable si alguien que conozca LSC indica otra cosa.
export const DINAMICAS = new Set(["G", "H", "J", "Ñ", "S", "Z"]);

export const ESTATICAS = [...LETRAS.filter((l) => !DINAMICAS.has(l)), ...NUMEROS];

export const esNumero = (e: string) => NUMEROS.includes(e);

// Cómo se pronuncia cada etiqueta al leerla en voz alta.
const NOMBRES: Record<string, string> = {
  A: "a", B: "be", C: "ce", D: "de", E: "e", F: "efe", G: "ge", H: "hache", I: "i", J: "jota",
  K: "ka", L: "ele", M: "eme", N: "ene", Ñ: "eñe", O: "o", P: "pe", Q: "cu", R: "erre", S: "ese",
  T: "te", U: "u", V: "uve", W: "doble uve", X: "equis", Y: "ye", Z: "zeta",
  "0": "cero", "1": "uno", "2": "dos", "3": "tres", "4": "cuatro", "5": "cinco",
  "6": "seis", "7": "siete", "8": "ocho", "9": "nueve",
};
export const nombreHablado = (e: string) => NOMBRES[e] ?? e;
