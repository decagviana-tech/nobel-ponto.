
import { GoogleGenAI, Modality } from "@google/genai";
import { DailyRecord } from "../types";
import { formatTime } from "../utils";

// Fix: Added getQuickInsight to provide an automated overview of the employee's bank of hours status
export const getQuickInsight = async (records: DailyRecord[], balance: number): Promise<string | null> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const recentHistory = records.slice(-5).map(r => ({
            data: r.date,
            horas: formatTime(r.totalMinutes),
            saldo: formatTime(r.balanceMinutes),
        }));

        const prompt = `Analise brevemente o estado atual do banco de horas deste funcionário.
        Saldo Atual: ${formatTime(balance)}
        Últimos Registros: ${JSON.stringify(recentHistory)}
        
        Dê um conselho ou observação de RH de apenas uma frase curta e acolhedora em Português Brasileiro.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt
        });
        
        return response.text || null;
    } catch (error) {
        console.error("Erro QuickInsight:", error);
        return null;
    }
};

export const analyzeTimesheet = async (records: DailyRecord[], balance: number, query: string): Promise<string | null> => {
    try {
        // Inicializa sempre antes da chamada para capturar a chave injetada pelo Netlify ou pelo seletor de chaves
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const recentHistory = records.slice(-10).map(r => ({
            data: r.date,
            horas: formatTime(r.totalMinutes),
            saldo: formatTime(r.balanceMinutes),
            status: (r.entry && !r.exit) ? "Ponto Incompleto" : "OK"
        }));

        const prompt = `Você é o "Nobel Auditor", assistente de RH da Nobel Petrópolis.
        Dados do Colaborador:
        - Saldo Atual: ${formatTime(balance)}
        - Histórico Recente: ${JSON.stringify(recentHistory)}
        
        Pergunta: "${query}"
        
        Responda de forma curta, acolhedora e profissional em Português Brasileiro.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt
        });
        
        return response.text || "Não consegui processar a resposta.";
    } catch (error: any) {
        console.error("Erro Gemini:", error);
        const errorMsg = error?.message || "";
        
        // Captura erro de cota (429) ou chave não encontrada
        if (errorMsg.includes("429") || errorMsg.includes("RESOURCE_EXHAUSTED") || errorMsg.includes("quota")) {
            return "QUOTA_EXHAUSTED";
        }
        if (errorMsg.includes("API_KEY_INVALID") || errorMsg.includes("not found")) {
            return "CHAVE_REQUERIDA";
        }
        return "Erro de conexão com o Auditor Nobel. Tente novamente em alguns instantes.";
    }
};

export const generateSpeech = async (text: string): Promise<Uint8Array | null> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: text.replace(/[*#]/g, '') }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
                },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) return decodeBase64(base64Audio);
        return null;
    } catch (error) { return null; }
};

function decodeBase64(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
}

export async function playAudioBuffer(data: Uint8Array) {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
    const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();
}
