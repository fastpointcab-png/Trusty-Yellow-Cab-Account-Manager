import { GoogleGenAI } from "@google/genai";
import { DailyReport } from '../types';

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY is missing. AI features will not work.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeFinancialData = async (reports: DailyReport[]): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "API Key missing. Cannot generate analysis.";

  // Simplify data to reduce token usage
  const summaryData = reports.map(r => ({
    driver: r.driverName,
    date: r.date,
    income: r.totalIncome,
    expenses: r.totalExpenses,
    profit: r.netProfit,
    fuel: r.expenses.fuel
  }));

  const prompt = `
    You are a financial analyst for a taxi business.
    Analyze the following recent daily reports JSON data (Currency: INR/₹).
    Provide a concise summary including:
    1. Overall business health (total profit, margins).
    2. Top performing driver.
    3. Any concerning expense trends (e.g., high fuel costs relative to income).
    4. Actionable advice for the admin.

    Data:
    ${JSON.stringify(summaryData, null, 2)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "No analysis generated.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Failed to generate analysis. Please try again later.";
  }
};