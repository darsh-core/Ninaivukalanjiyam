const API_URL = "http://localhost:5002/api";

export interface Narrator {
  id: string;
  full_name_tamil: string | null;
  full_name_english: string | null;
  preferred_name: string | null;
  birth_year: number | null;
  place_of_birth: string | null;
  preferred_language: string;
  tamil_dialect: string | null;
  status: string;
}

export interface NarratorInput {
  full_name_tamil: string;
  full_name_english: string;
  preferred_name: string;
  birth_year: string;
  place_of_birth: string;
  preferred_language: string;
  tamil_dialect: string;
}

interface NarratorListResponse {
  success: boolean;
  count: number;
  data: Narrator[];
}

interface NarratorResponse {
  success: boolean;
  data: Narrator;
  message?: string;
}

export async function getNarrators(): Promise<Narrator[]> {
  const response = await fetch(`${API_URL}/narrators`);

  if (!response.ok) {
    throw new Error("Unable to load narrators");
  }

  const result: NarratorListResponse = await response.json();

  return result.data;
}

export async function createNarrator(
  narrator: NarratorInput
): Promise<Narrator> {
  const response = await fetch(`${API_URL}/narrators`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...narrator,
      birth_year: narrator.birth_year
        ? Number(narrator.birth_year)
        : null,
    }),
  });

  const result: NarratorResponse = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Unable to create narrator");
  }

  return result.data;
}