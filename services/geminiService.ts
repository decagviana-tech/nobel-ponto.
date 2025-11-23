import { GoogleGenAI } from "@google/genai";
import { DailyRecord } from "../types";
import { formatTime } from "../utils";

const getClient = () => {
    // Tenta pegar a chave de várias formas para garantir
    const apiKey = import.meta.env.VITE_API_KEY || ''; 
    // Se não tiver chave, não quebra o build, só avisa no console
    if (!apiKey) console.warn("API Key is missing");
    return new GoogleGenAI({ apiKey: apiKey || 'dummy_key' });
}

export const analyzeTimesheet = async (records: DailyRecord[], balance: number, query: string): Promise<string | null> => {
    try {
        const ai = getClient();
        // Se a chave for dummy, retorna erro amigável
        if ((ai as any).apiKey === 'dummy_key') return "IA não configurada.";

        const formattedData = records.slice(0, 14).map(r => ({
            date: r.date,
            hours: formatTime(r.totalMinutes),
            balance: formatTime(r.balanceMinutes),
            details: `Entry: ${r.entry}, Exit: ${r.exit}`
        }));

        const prompt = `RH Assistant Context: ${JSON.stringify(formattedData)} Balance: ${balance}. User Query: ${query}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text || "Sem resposta.";
    } catch (error) {
        console.error("Error invoking Gemini:", error);
        return "Erro na IA.";
    }
};
