/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
}

export const QUESTIONS: Question[] = [
  {
    id: '1',
    text: '¿Qué es un riesgo en Broxel?',
    options: ['Es la posibilidad de que ocurra algún evento inesperado', 'Es una multa', 'Es un evento que siempre genera una ganancia económica', 'Ninguna anterior'],
    correctIndex: 0,
  },
  {
    id: '2',
    text: '¿Cuáles son los principales tipos de Riesgos que gestionamos en Broxel?',
    options: ['Interno, Externo, Legal, Regulatorio y de Recursos Humanos', 'Financiero, Crédito, Infraestructura, Liquidez, Mercado y Operacional', 'Operacional, Tecnológico, de Cumplimiento, Reputacional, Crédito y Antisoborno', 'Ninguna de las anteriores'],
    correctIndex: 2,
  },
  {
    id: '3',
    text: '¿Quién pintó la Mona Lisa?',
    options: ['Van Gogh', 'Picasso', 'Da Vinci', 'Dali'],
    correctIndex: 2,
  },
  {
    id: '4',
    text: '¿Cuál es el océano más grande?',
    options: ['Atlántico', 'Índico', 'Ártico', 'Pacífico'],
    correctIndex: 3,
  },
  {
    id: '5',
    text: '¿Cuántos continentes hay en la Tierra?',
    options: ['5', '6', '7', '8'],
    correctIndex: 2,
  },
  {
    id: '6',
    text: '¿Cuál es el río más largo del mundo?',
    options: ['Nilo', 'Amazonas', 'Misisipi', 'Yangtsé'],
    correctIndex: 1,
  },
  {
    id: '7',
    text: '¿En qué año llegó el hombre a la Luna?',
    options: ['1965', '1969', '1972', '1959'],
    correctIndex: 1,
  },
  {
    id: '8',
    text: '¿Cuál es el elemento químico del agua?',
    options: ['CO2', 'O2', 'H2O', 'NaCl'],
    correctIndex: 2,
  },
  {
    id: '9',
    text: '¿Quién escribió "Don Quijote de la Mancha"?',
    options: ['Cervantes', 'García Márquez', 'Neruda', 'Borges'],
    correctIndex: 0,
  },
  {
    id: '10',
    text: '¿Cuál es el animal terrestre más rápido?',
    options: ['León', 'Guepardo', 'Tigre', 'Cabra'],
    correctIndex: 1,
  },
];

export const GAME_SPEEDS = {
  EASY: { label: 'Fácil', velocity: 2, multiplier: 1 },
  MEDIUM: { label: 'Medio', velocity: 4, multiplier: 1.5 },
  HARD: { label: 'Difícil', velocity: 7, multiplier: 2.5 },
};

export type Difficulty = keyof typeof GAME_SPEEDS;
