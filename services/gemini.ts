import { GoogleGenAI } from "@google/genai";
import { Machine, Operation } from "../types";

/**
 * L'IA lit la gamme faite par l'utilisateur pour conseiller.
 */
export async function analyzeTextileContext(
  currentOperations: Operation[], 
  availableMachines: Machine[],
  userPrompt: string
) {
  try {
    const client = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const machinesList = availableMachines.map(m => m.name).join(', ');
    const operationsText = currentOperations.length > 0 
      ? currentOperations.map(op => `${op.order}. ${op.description} [${op.machineName || 'MAN'}] (${op.time.toFixed(2)} min)`).join('\n')
      : "Aucune opération saisie pour le moment.";

    const response = await client.models.generateContent({
      model: 'gemini-2.0-flash', 
      contents: `Tu es un Expert Méthode Textile (GSD).
      
      CONTEXTE - L'UTILISATEUR A SAISI CETTE GAMME MANUELLEMENT :
      ${operationsText}
      
      TA MISSION :
      1. "Lire" et "Comprendre" la gamme ci-dessus.
      2. Répondre à la demande de l'utilisateur : "${userPrompt}".
      3. Si l'utilisateur demande une analyse, identifie le type de vêtement, critique l'équilibrage ou suggère des améliorations.
      4. Si la gamme est vide, propose de l'aide pour commencer.

      Ton ton doit être professionnel, encourageant et technique. Tu es l'assistant, pas le créateur.`,
      config: {
        temperature: 0.3,
      },
    });

    return response.text;

  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Erreur IA : " + (error.message || "Service indisponible"));
  }
}
