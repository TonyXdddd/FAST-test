import { trace, simulateEnter } from './explain-impl.js';
import casesA from './explain-cases-a.js';
import casesB from './explain-cases-b.js';

const EMPTY_LOG = '<li class="empty">Кликните в поле и нажмите Enter — или нажмите «Симулировать».</li>';
const container = document.getElementById('cases');
let currentGroup = null;

for (const c of [...casesA, ...casesB]) {
  if (c.group !== currentGroup) {
    currentGroup = c.group;
    const h = document.createElement('h3');
    h.className = 'group-title';
    h.textContent = c.group;
    container.append(h);
  }

  const card = document.createElement('section');
  card.className = 'case';
  card.id = c.id;
  card.dataset.case = c.id;
  card.dataset.expect = c.expect;
  card.innerHTML = `
    <h3></h3>
    <div class="case-grid">
      <div>
        <p class="expect"><span class="tag ok">ожидание</span> ${c.expectText}</p>
        <p class="why">${c.why}</p>
        <div class="demo">${c.markup}</div>
        <div class="controls"></div>
      </div>
      <div>
        <ol class="log">${EMPTY_LOG}</ol>
      </div>
    </div>`;
  card.querySelector('h3').textContent = `${c.id.slice(1)}. ${c.title}`;

  if (c.expectFor) card._expectFor = (e) => c.expectFor(e, card);

  const controls = card.querySelector('.controls');
  for (const sim of c.sims ?? [{ label: '▶ Симулировать Enter', init: {} }]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = sim.label;
    b.addEventListener('click', () => simulateEnter(card, sim.init));
    controls.append(b);
  }
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.textContent = 'Сбросить';
  reset.addEventListener('click', () => {
    card.querySelector('.log').innerHTML = EMPTY_LOG;
    card.querySelectorAll('form').forEach((f) => f.reset());
    card.querySelectorAll('x-input, x-input-bad, x-picker').forEach((el) => { if (el.input) el.input.value = ''; });
    c.reset?.(card);
  });
  controls.append(reset);

  container.append(card);
  c.setup?.(card, { trace });
}

document.documentElement.dataset.ready = 'true';
