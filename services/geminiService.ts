
import { GoogleGenAI, Modality } from "@google/genai";
import { DailyRecord } from "../types";
import { formatTime } from "../utils";

export const analyzeTimesheet = async (records: DailyRecord[], balance: number, query: string): Promise<string | null> => {
    try {
        // Criar instância logo antes do uso para pegar a chave mais atual
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const recentHistory = records.slice(-15).map(r => ({
            data: r.date,
            horas: formatTime(r.totalMinutes),
            saldo: formatTime(r.balanceMinutes),
            status: (r.entry && !r.exit) ? "Incompleto - Pendência detectada!" : "OK"
        }));

        const prompt = `Você é o "Nobel Auditor", um assistente de RH inteligente de elite para a Nobel Petrópolis.
        Sua missão é ajudar os colaboradores a gerirem seus tempos de forma eficiente e amigável.
        
        Dados Atuais do Colaborador:
        - Saldo de Banco de Horas Consolidado: ${formatTime(balance)}
        - Histórico de Batidas Recentes: ${JSON.stringify(recentHistory)}
        
        Pergunta do Funcionário: "${query}"
        
        Instruções de Resposta:
        1. Tom: Profissional, acolhedor e motivador.
        2. Analise padrões: Se houver pendências (entrada sem saída), alerte.
        3. Curto e Direto: Evite textos longos. Responda em Português Brasileiro.`;

        // Alterado para gemini-3-flash-preview para maior estabilidade e gratuidade
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt
        });
        
        return response.text || "Estou com dificuldades para processar sua resposta. Tente novamente.";
    } catch (error: any) {
        console.error("Erro Nobel Auditor:", error);
        if (error?.message?.includes("API_KEY_INVALID") || error?.message?.includes("not found")) {
            return "CHAVE_REQUERIDA";
        }
        return "Erro na comunicação com a central de inteligência Nobel. Verifique sua conexão ou tente novamente mais tarde.";
    }
};

export const getQuickInsight = async (records: DailyRecord[], balance: number): Promise<string | null> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const pattern = records.slice(-5).map(r => r.totalMinutes);
        const avg = pattern.length > 0 ? pattern.reduce((a,b) => a+b, 0) / pattern.length : 0;

        const prompt = `Gere uma única frase curta e motivadora para um colaborador da Nobel.
        Saldo: ${formatTime(balance)}. Média: ${formatTime(avg)}/dia. Max 100 caracteres.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });
        return response.text || null;
    } catch { return null; }
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
    // Usando offset e length para garantir robustez no buffer
    const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
    const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();
}
