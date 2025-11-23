
import { GoogleGenAI } from "@google/genai";
import { DailyRecord } from "../types";
import { formatTime } from "../utils";

// Ensure process.env.API_KEY is recognized by TypeScript
declare const process: {
  env: {
    API_KEY: string;
  };
};

export const analyzeTimesheet = async (records: DailyRecord[], balance: number, query: string): Promise<string | null> => {
    try {
        // Initialize the client with the API key from the environment variable.
        // Guidelines state: The API key must be obtained exclusively from the environment variable process.env.API_KEY.
        const apiKey = process.env.API_KEY;
        
        if (!apiKey) {
            console.warn("API Key is missing. Configure API_KEY in your environment.");
            return "IA não configurada. Por favor, adicione a API_KEY nas configurações.";
        }

        const ai = new GoogleGenAI({ apiKey });

        const formattedData = records.slice(0, 14).map(r => ({ // Contexto dos últimos 14 registros
            date: r.date,
            hours: formatTime(r.totalMinutes),
            balance: formatTime(r.balanceMinutes),
            details: `Entry: ${r.entry}, Exit: ${r.exit}`
        }));

        const prompt = `
        Você é um Assistente de RH Inteligente do aplicativo SmartPoint.
        Analise os dados de ponto do funcionário abaixo e responda à pergunta do usuário.
        
        Dados Atuais:
        - Saldo Total do Banco de Horas: ${formatTime(balance)}
        - Histórico Recente (últimos dias): ${JSON.stringify(formattedData)}
        
        Regras:
        - Jornada padrão: 8 horas diárias.
        - Total semanal esperado: 44 horas.
        - Seja cordial, profissional e direto.
        - Se o saldo for negativo, sugira dias para recuperar.
        - Se o usuário perguntar sobre leis trabalhistas (Brasil), responda com base na CLT de forma resumida.

        Pergunta do Usuário: "${query}"
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text || "Sem resposta da IA.";
    } catch (error) {
        console.error("Error invoking Gemini:", error);
        return "Desculpe, não consegui conectar ao serviço de inteligência no momento.";
    }
};
