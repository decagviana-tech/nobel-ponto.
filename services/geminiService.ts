
import { GoogleGenAI, Modality } from "@google/genai";
import { DailyRecord } from "../types";
import { formatTime } from "../utils";

const MODEL_TEXT = 'gemini-3-flash-preview';
const MODEL_TTS = 'gemini-2.5-flash-preview-tts';

const getAIInstance = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({ apiKey });
};

/**
 * Extrai apenas o texto das partes da resposta, ignorando assinaturas de pensamento (thought)
 * que causam avisos de 'non-text parts' no console.
 */
const extractCleanText = (response: any): string => {
    try {
        const parts = response.candidates?.[0]?.content?.parts || [];
        return parts
            .filter((part: any) => part.text)
            .map((part: any) => part.text)
            .join(' ')
            .trim();
    } catch (e) {
        return "";
    }
};

export const getQuickInsight = async (records: DailyRecord[], balance: number): Promise<string> => {
    const ai = getAIInstance();
    if (!ai) return "Sistema Nobel Operacional.";

    try {
        const formattedBalance = formatTime(balance);
        const status = balance >= 0 ? "positivo" : "negativo";
        
        // Novo prompt extremamente restrito e neutro
        const prompt = `Com base no saldo de banco de horas: ${formattedBalance}. 
        Sua tarefa é informar o colaborador sobre seu saldo de forma neutra e direta.
        REGRA: Diga apenas "Seu saldo está ${status} em ${formattedBalance}."
        Não adicione frases motivacionais, não fale sobre pontualidade e não dê conselhos. 
        Seja curto e objetivo.`;

        const response = await ai.models.generateContent({
            model: MODEL_TEXT,
            contents: prompt,
            config: { thinkingConfig: { thinkingBudget: 0 } }
        });
        
        const cleanText = extractCleanText(response);
        return cleanText || `Seu saldo está ${status} em ${formattedBalance}.`;
    } catch {
        return balance >= 0 ? `Seu saldo está positivo em ${formatTime(balance)}.` : `Seu saldo está negativo em ${formatTime(balance)}.`;
    }
};

export const analyzeTimesheet = async (records: DailyRecord[], balance: number, query: string): Promise<string> => {
    const ai = getAIInstance();
    if (!ai) return "ERRO_CHAVE_AUSENTE";

    try {
        const history = records.slice(-10).map(r => ({
            data: r.date,
            total: formatTime(r.totalMinutes),
            saldo: formatTime(r.balanceMinutes)
        }));

        const prompt = `Você é o Auditor Nobel, assistente técnico de RH da Nobel Petrópolis.
        CONTEXTO: Saldo Atual: ${formatTime(balance)}, Histórico Recente: ${JSON.stringify(history)}.
        PERGUNTA DO COLABORADOR: "${query}".
        
        DIRETRIZES DE RESPOSTA:
        1. Responda apenas o que foi perguntado de forma técnica e numérica.
        2. Use o formato: "Seu saldo está [positivo/negativo] em [valor]".
        3. Nunca use frases como "você está quase em dia", "continue brilhando" ou "indicando pontualidade".
        4. Mantenha um tom sério, profissional e puramente informativo.
        5. Se a pergunta for fora de contexto, responda apenas informando o saldo atual.`;

        const response = await ai.models.generateContent({
            model: MODEL_TEXT,
            contents: prompt,
            config: { thinkingConfig: { thinkingBudget: 0 } }
        });
        
        return extractCleanText(response) || `Seu saldo atual é de ${formatTime(balance)}.`;
    } catch (error: any) {
        if (error?.message?.includes("429")) return "ERRO_LIMITE_ATINGIDO";
        return "Serviço de análise temporariamente indisponível.";
    }
};

function decode(base64: string) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
    const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
    return buffer;
}

export const generateSpeech = async (text: string): Promise<Uint8Array | null> => {
    const ai = getAIInstance();
    if (!ai) return null;
    try {
        const response = await ai.models.generateContent({
            model: MODEL_TTS,
            contents: [{ parts: [{ text: text.replace(/[*#]/g, '') }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
            },
        });
        const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        return data ? decode(data) : null;
    } catch { return null; }
};

export async function playAudioBuffer(data: Uint8Array) {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const buffer = await decodeAudioData(data, ctx);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start();
    } catch (e) { console.error("Erro áudio:", e); }
}
