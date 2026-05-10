// ============================================================================
// js/alignment-tutor.js
// Post-level tutor modal (Professor Meadow) and advancing to the next level.
// ============================================================================

import { setFeedback, spawnConfetti, clearConfetti } from './ui.js';
import { askTutor } from './tutor.js';
import { state } from './alignment-state.js';
import { setText } from './alignment-dom.js';
import { renderStars } from './alignment-scoring.js';
import { loadLevel } from './alignment-level.js';

export function showTutorModal() {
  const lv = state.levels[state.lvl];
  setText('tm-mon', '🎓');
  const q = state.lastRoundQuality;
  const starsEl = document.getElementById('tm-stars');
  if (starsEl) {
    if (q) {
      starsEl.innerHTML = `
        <div class="quality-grid">
          <div><span class="qlab">Speed</span><span class="qstars">${renderStars(q.speedStars)}</span></div>
          <div><span class="qlab">Tries</span><span class="qstars">${renderStars(q.attStars)}</span></div>
          <div><span class="qlab">Streak</span><span class="qstars">${renderStars(q.streakStars)}</span></div>
        </div>`;
    } else {
      starsEl.innerHTML = '';
    }
  }
  setText('tm-pts', `+${state.lastPointsEarned} pts (speed tapers gently after ~45s on the clock)`);
  const qEl = document.getElementById('tm-question');
  if (qEl) qEl.textContent = lv.tutorQ;
  const aEl = document.getElementById('tm-answer');
  if (aEl) aEl.value = '';
  const resp = document.getElementById('tm-response');
  if (resp) { resp.textContent = ''; resp.className = 'tutor-response'; }
  const submitBtn = document.getElementById('tm-submit');
  if (submitBtn) { submitBtn.style.display = ''; submitBtn.disabled = false; }
  const nextBtn = document.getElementById('tm-next');
  if (nextBtn) nextBtn.style.display = 'none';
  document.getElementById('tutor-modal')?.classList.add('on');
  window.dispatchEvent(new CustomEvent('mma:embed-layout-maybe-changed'));
  spawnConfetti();
}

export async function submitToTutor() {
  const answer = document.getElementById('tm-answer')?.value.trim();
  if (!answer) { document.getElementById('tm-answer')?.focus(); return; }

  const lv = state.levels[state.lvl];
  const resp = document.getElementById('tm-response');
  if (resp) { resp.className = 'tutor-response thinking show'; resp.textContent = 'Professor Meadow is thinking…'; }
  const submitBtn = document.getElementById('tm-submit');
  if (submitBtn) submitBtn.disabled = true;

  try {
    const reply = await askTutor({
      level_title: lv.title,
      level_concept: lv.formulaRef,
      tutor_question: lv.tutorQ,
      student_answer: answer,
    });
    if (resp) {
      resp.className = 'tutor-response show';
      resp.textContent = reply;
    }
  } catch {
    if (resp) {
      resp.className = 'tutor-response show';
      resp.textContent = 'The tutor is unavailable right now. Keep exploring!';
    }
  }

  if (submitBtn) { submitBtn.disabled = false; submitBtn.style.display = 'none'; }
  const nextBtn = document.getElementById('tm-next');
  if (nextBtn) nextBtn.style.display = '';
}

export function nextLevel() {
  document.getElementById('tutor-modal')?.classList.remove('on');
  window.dispatchEvent(new CustomEvent('mma:embed-layout-maybe-changed'));
  clearConfetti();
  const n = state.lvl + 1;
  if (n < state.levels.length) {
    loadLevel(n);
  } else {
    setFeedback('afb', 'ok', '🏆', `All ${state.levels.length} levels complete! You're a Matrix Master!`);
  }
}
