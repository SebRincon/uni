import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

const SENSITIVE_CATEGORIES = [
  'sexual_content',
  'violence_or_gore',
  'hate_or_harassment',
  'self_harm_or_suicide',
  'drug_use',
  'explicit_language',
];

const CATEGORY_SENSITIVITY_THRESHOLD: Record<string, 'low' | 'medium' | 'high'> = {
  sexual_content: 'low',
  violence_or_gore: 'low',
  hate_or_harassment: 'low',
  self_harm_or_suicide: 'low',
  drug_use: 'medium',
  explicit_language: 'low',
};

const order = { none: 0, low: 1, medium: 2, high: 3 } as const;

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'Missing text' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Server missing GEMINI_API_KEY' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            isSensitive: { type: 'boolean' },
            block: { type: 'boolean' },
            overallSeverity: { type: 'string', enum: ['none', 'low', 'medium', 'high'] },
            categories: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  present: { type: 'boolean' },
                  severity: { type: 'string', enum: ['none', 'low', 'medium', 'high'] },
                },
                required: ['name', 'present', 'severity'],
              },
            },
            rationale: { type: 'string' },
          },
          required: ['isSensitive', 'block', 'overallSeverity', 'categories', 'rationale'],
        },
      },
    });

    const systemPrompt = `You are a content moderation classifier. Analyze the user text and return JSON according to the schema.
Categories: ${SENSITIVE_CATEGORIES.join(', ')}.
Severity scale: none, low, medium, high.
- "present" means the category is present.
- "severity" reflects intensity/likelihood of harm.
- "isSensitive" is true if ANY category meets or exceeds its threshold:
  ${Object.entries(CATEGORY_SENSITIVITY_THRESHOLD).map(([k,v]) => `${k}: >= ${v}`).join('; ')}.
- "block" true only for extreme cases suitable for removal (e.g., credible threats, sexual content involving minors, explicit instructions for self-harm).
Return concise rationale.`;

    const input = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'user', parts: [{ text: `TEXT TO MODERATE:\n${text}` }] },
    ];

    const res = await model.generateContent({ contents: input });
    const parsed = JSON.parse(res.response.text());

    // Normalize categories and enforce thresholds server-side as a guard
    const categories = SENSITIVE_CATEGORIES.map((name) => {
      const found = (parsed.categories || []).find((c: any) => c.name === name);
      return found || { name, present: false, severity: 'none' };
    });

    const isSensitive = categories.some((c: any) => c.present && order[c.severity] >= order[CATEGORY_SENSITIVITY_THRESHOLD[c.name]]);

    const block = Boolean(categories.find((c: any) => c.present && c.severity === 'high')) || Boolean(parsed.block);

    return NextResponse.json({
      isSensitive,
      block,
      overallSeverity: parsed.overallSeverity || (block ? 'high' : isSensitive ? 'low' : 'none'),
      categories,
      rationale: parsed.rationale || '',
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Moderation failed' }, { status: 500 });
  }
}