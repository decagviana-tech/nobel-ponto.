
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
        let apiKey = process.env.API_KEY || '';
        
        // Limpeza de segurança: remove espaços em branco
        apiKey = apiKey.trim();

        if (!apiKey) {
            console.warn("API Key is missing. Configure VITE_API_KEY in Netlify.");
            return "IA não configurada. Por favor, adicione a VITE_API_KEY no Netlify.";
        }

        const ai = new GoogleGenAI({ apiKey });

        // Prepara dados mais detalhados para a IA
        const formattedData = records.slice(0, 14).map(r => {
            const missingPunches = [];
            if (r.entry && !r.exit) missingPunches.push('Saída');
            if (r.lunchStart && !r.lunchEnd) missingPunches.push('Volta Almoço');
            
            return {
                data: r.date,
                trabalhado: formatTime(r.totalMinutes),
                saldo_dia: formatTime(r.balanceMinutes),
                entrada: r.entry,
                saida: r.exit,
                localizacao: r.location || 'Não registrado',
                alertas: missingPunches.length > 0 ? `Esqueceu de bater: ${missingPunches.join(', ')}` : 'Ok'
            };
        });

        const prompt = `
        Você é o "Nobel AI", um auditor de ponto eletrônico inteligente e especialista em RH.
        
        CONTEXTO:
        - Saldo Banco de Horas Total: ${formatTime(balance)}
        - Dados recentes (JSON): ${JSON.stringify(formattedData)}
        
        DIRETRIZES:
        1. Responda à pergunta do usuário: "${query}"
        2. Analise proativamente se há dias com registros ímpares (ex: entrou e não saiu) e alerte o usuário.
        3. Se o saldo for negativo, dê uma dica motivacional curta de como recuperar.
        4. Se perguntarem sobre local, analise o campo 'localizacao'.
        5. Seja conciso e use formatação Markdown (negrito) para destacar números importantes.

        Responda em português do Brasil.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text || "Sem resposta da IA.";
    } catch (error) {
        console.error("Error invoking Gemini:", error);
        return "Desculpe, o serviço de inteligência está temporariamente indisponível. Verifique sua conexão.";
    }
};
