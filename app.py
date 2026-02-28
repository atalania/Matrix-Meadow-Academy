"""
Matrix Meadow Academy — AI Tutor Backend
-----------------------------------------
Deploy on Render as a Python web service.

import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI

app = Flask(__name__)

# ── CORS ──────────────────────────────────────────────────────────────────────
# Set FRONTEND_ORIGINS on Render as a comma-separated list of your GitHub Pages
# URLs, e.g.:  https://yourname.github.io,https://yourname.github.io/matrix-meadow
#
# Leave unset (or set to *) during local development.
_raw = os.environ.get("FRONTEND_ORIGINS", "*")
ALLOWED_ORIGINS = [o.strip() for o in _raw.split(",")] if _raw != "*" else "*"

CORS(app, resources={r"/api/*": {"origins": ALLOWED_ORIGINS}})
# ─────────────────────────────────────────────────────────────────────────────

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

TUTOR_SYSTEM = """You are Professor Meadow, a warm and encouraging math tutor for high school \
students learning linear algebra through an interactive game. Your job is to evaluate a \
student's conceptual understanding after they complete a level.

Rules:
- Keep your response SHORT: 3-5 sentences maximum.
- Be encouraging but intellectually honest.
- If understanding is solid: celebrate it and add one deepening insight they hadn't mentioned.
- If understanding is partial: acknowledge what's right first, then gently clarify the one gap.
- If the student is confused or off-track: reassure them and give a concrete analogy or \
  simple rephrasing of the core idea.
- Never just repeat what the student wrote back to them.
- Use plain language. Occasional math notation like (x,y)->(2x,2y) is fine.
- Do NOT reveal or hint at answers to future levels."""


@app.route("/api/tutor", methods=["POST"])
def tutor():
    data = request.get_json(force=True)

    level_title    = data.get("level_title", "Unknown level")
    level_concept  = data.get("level_concept", "")
    tutor_question = data.get("tutor_question", "")
    student_answer = data.get("student_answer", "").strip()
    attempts       = int(data.get("attempts", 1))

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
        message = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=300,
            system=TUTOR_SYSTEM,
            messages=[{"role": "user", "content": user_msg}],
        )
        return jsonify({"response": message.content[0].text})

    except OPENAI.APIError as e:
        return jsonify({"error": f"OPENAI API error: {str(e)}"}), 502
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
