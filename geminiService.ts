import { GoogleGenerativeAI } from "@google/generative-ai";
import { DailyRecord } from "../types";
import { formatTime } from "../utils";

const getClient = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("API Key is missing");
  return new GoogleGenerativeAI(apiKey);
};

export const analyzeTimesheet = async (
  records: DailyRecord[],
  balance: number,
  query: string
) => {
  try {
    const ai = getClient();

    const formattedData = records.slice(0, 14).map((r) => ({
      date: r.date,
      hours: formatTime(r.totalMinutes),
      balance: formatTime(r.balanceMinutes),
      details: `Entry: ${r.entry}, Exit: ${r.exit}`,
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

    const response = await ai.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    return response.response.text();
  } catch (error) {
    console.error("Error invoking Gemini:", error);
    return "Desculpe, não consegui conectar ao serviço de inteligência no momento. Verifique sua chave de API.";
  }
};
