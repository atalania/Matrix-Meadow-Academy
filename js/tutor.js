// ══════════════════════════════════════════════════════
// Tutor AI Integration (migrated from Flask backend)
// Calls the portal's /api/ai/openai proxy.
// ══════════════════════════════════════════════════════

const TUTOR_MODEL = 'gpt-4.1-mini';

const TUTOR_SYSTEM = `You are Professor Meadow, a warm and encouraging math tutor for high school students learning linear algebra through an interactive game. Your job is to evaluate a student's conceptual understanding after they complete a level.

Rules:
- Keep your response SHORT: 3-5 sentences maximum.
- Be encouraging but intellectually honest.
- If understanding is solid: celebrate it and add one deepening insight they hadn't mentioned.
- If understanding is partial: acknowledge what's right first, then gently clarify the one gap.
- If the student is confused or off-track: reassure them and give a concrete analogy or simple rephrasing of the core idea.
- Never just repeat what the student wrote back to them.
- Use plain language. Occasional math notation like (x,y)->(2x,2y) is fine.
- Do NOT reveal or hint at answers to future levels.`;

/**
 * Ask Professor Meadow for feedback on a student's answer.
 * @param {{ level_title: string, level_concept: string, tutor_question: string, student_answer: string, attempts: number }} params
 * @returns {Promise<string>} The tutor's response text.
 */
export async function askTutor({ level_title, level_concept, tutor_question, student_answer, attempts }) {
  const userMsg =
    `Level just completed: ${level_title}\n` +
    `Core concept for this level: ${level_concept}\n\n` +
    `Question I asked the student: ${tutor_question}\n` +
    `Student's written response: ${student_answer}\n` +
    `Number of attempts the student needed: ${attempts}\n\n` +
    `Please respond as Professor Meadow, evaluating their understanding.`;

  const res = await fetch('/api/ai/openai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: TUTOR_MODEL,
      messages: [
        { role: 'system', content: TUTOR_SYSTEM },
        { role: 'user', content: userMsg },
      ],
      max_tokens: 300,
    }),
  });

  const data = await res.json();
  const reply = data.choices?.[0]?.message?.content;
  return reply || 'Nice work — keep going!';
}
