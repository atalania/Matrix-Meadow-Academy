import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI

app = Flask(__name__)

_raw = os.environ.get("FRONTEND_ORIGINS", "*")
ALLOWED_ORIGINS = [o.strip() for o in _raw.split(",")] if _raw != "*" else "*"
CORS(app, resources={r"/api/*": {"origins": ALLOWED_ORIGINS}})

api_key = os.environ.get("OPENAI_API_KEY")
client = OpenAI(api_key=api_key) if api_key else None

TUTOR_SYSTEM = """You are Professor Meadow, a warm and encouraging math tutor for high school students learning linear algebra through an interactive game. Your job is to evaluate a student's conceptual understanding after they complete a level.

Rules:
- Keep your response SHORT: 3-5 sentences maximum.
- Be encouraging but intellectually honest.
- If understanding is solid: celebrate it and add one deepening insight they hadn't mentioned.
- If understanding is partial: acknowledge what's right first, then gently clarify the one gap.
- If the student is confused or off-track: reassure them and give a concrete analogy or simple rephrasing of the core idea.
- Never just repeat what the student wrote back to them.
- Use plain language. Occasional math notation like (x,y)->(2x,2y) is fine.
- Do NOT reveal or hint at answers to future levels.
"""

@app.route("/api/tutor", methods=["POST"])
def tutor():
    if client is None:
        return jsonify({"error": "Tutor backend is not configured"}), 500

    data = request.get_json(silent=True) or {}

    level_title = data.get("level_title", "Unknown level")
    level_concept = data.get("level_concept", "")
    tutor_question = data.get("tutor_question", "")
    student_answer = str(data.get("student_answer", "")).strip()

    try:
        attempts = int(data.get("attempts", 1))
    except (TypeError, ValueError):
        attempts = 1

    if not student_answer:
        return jsonify({"error": "student_answer is required"}), 400

    user_msg = (
        f"Level just completed: {level_title}\n"
        f"Core concept for this level: {level_concept}\n\n"
        f"Question I asked the student: {tutor_question}\n"
        f"Student's written response: {student_answer}\n"
        f"Number of attempts the student needed: {attempts}\n\n"
        "Please respond as Professor Meadow, evaluating their understanding."
    )

    try:
        response = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {"role": "system", "content": TUTOR_SYSTEM},
                {"role": "user", "content": user_msg}
            ],
            max_tokens=300,
        )

        reply = response.choices[0].message.content or "Nice work — keep going!"
        return jsonify({"response": reply})

    except Exception:
        app.logger.exception("Tutor endpoint failed")
        return jsonify({"error": "Tutor service unavailable"}), 500

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)