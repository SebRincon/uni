import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

const SENSITIVE_CATEGORIES = [
  'sexual_content',
  'violence_or_gore',
  'hate_or_harassment',
  'self_harm_or_suicide',
  'drug_use',
  'explicit_language',
] as const;

type CategoryName = typeof SENSITIVE_CATEGORIES[number];

const order = { none: 0, low: 1, medium: 2, high: 3 } as const;
type Severity = keyof typeof order;

const CATEGORY_SENSITIVITY_THRESHOLD: Record<CategoryName, Exclude<Severity, 'none'>> = {
  sexual_content: 'low',
  violence_or_gore: 'low',
  hate_or_harassment: 'low',
  self_harm_or_suicide: 'low',
  drug_use: 'medium',
  explicit_language: 'low',
};

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
          type: SchemaType.OBJECT,
          properties: {
            isSensitive: { type: SchemaType.BOOLEAN },
            block: { type: SchemaType.BOOLEAN },
            overallSeverity: { type: SchemaType.STRING, format: 'enum', enum: ['none', 'low', 'medium', 'high'] },
            categories: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  name: { type: SchemaType.STRING },
                  present: { type: SchemaType.BOOLEAN },
                  severity: { type: SchemaType.STRING, format: 'enum', enum: ['none', 'low', 'medium', 'high'] },
                },
                required: ['name', 'present', 'severity'],
              },
            },
            rationale: { type: SchemaType.STRING },
          },
          required: ['isSensitive', 'block', 'overallSeverity', 'categories', 'rationale'],
        },
      },
    });

    const systemPrompt = `You are a sophisticated content moderation AI for an educational discussion platform used by university students and faculty. Your primary goal is to foster a safe and constructive environment for academic discourse while allowing for the intellectual exploration of sensitive subjects.

    The key is to differentiate between the academic discussion OF a topic versus the promotion, incitement, or glorification OF harmful acts.

    Analyze the user text and return JSON according to the schema.

    ---
    **Guiding Principles & Examples:**

    1.  **Academic Context is Permitted:**
        * A history student analyzing violent events in a war IS NOT promoting violence.
        * A literature student quoting a text with explicit language IS NOT harassment.
        * A sociology class discussing drug policy IS NOT promoting drug use.

    2.  **Intent Matters:**
        * **Low Severity:** Passing mentions, clinical descriptions, quoted materials for analysis.
        * **Medium Severity:** In-depth discussion that could be uncomfortable but is clearly academic.
        * **High Severity / Block:** Direct threats, targeted harassment, hate speech, promoting self-harm, or clear violations of academic integrity.

    ---
    **Your Task:**

    Categories: ${SENSITIVE_CATEGORIES.join(', ')}.
    Severity scale: none, low, medium, high.

    - "isSensitive" is true if ANY category meets or exceeds its threshold:
      ${Object.entries(CATEGORY_SENSITIVITY_THRESHOLD)
        .map(([k, v]) => `${k}: >= ${v}`)
        .join('; ')}.

    - "block" is true ONLY for content that actively endangers users or violates core academic principles. This includes credible threats, targeted harassment, promotion of self-harm, and clear violations of academic integrity (plagiarism, sharing exam answers).

    Return a concise rationale explaining your decision based on these principles.`;

    const input = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'user', parts: [{ text: `TEXT TO MODERATE:\n${text}` }] },
    ];

    const res = await model.generateContent({ contents: input });
    const parsed = JSON.parse(res.response.text());
    console.log(parsed);

    // Normalize categories and enforce thresholds server-side as a guard
    const categories: { name: CategoryName; present: boolean; severity: Severity }[] = SENSITIVE_CATEGORIES.map((name) => {
      const found = (parsed.categories || []).find((c: any) => c.name === name);
      return (found as { name: CategoryName; present: boolean; severity: Severity }) || { name, present: false, severity: 'none' };
    });

    const isSensitive = categories.some((c) => c.present && order[c.severity] >= order[CATEGORY_SENSITIVITY_THRESHOLD[c.name]]);

    const block = Boolean(categories.find((c) => c.present && c.severity === 'high')) || Boolean(parsed.block);

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