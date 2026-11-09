// [n8n Code 노드] 상담 대장(CSV)을 읽어 상담실장이 보는 화면(HTML)을 만들어요
// 긴급은 맨 위 빨간 줄, 나머지는 최근 순. 이 화면은 병원 안 PC에서만 열어요.
const buf = await this.helpers.getBinaryDataBuffer(0, "data");
const text = buf.toString("utf8").replace(/^﻿/, "");

// CSV 읽기 (따옴표 안의 쉼표·따옴표 처리)
function parseCsv(s) {
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) { if (ch === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.length > 1);
}
const [head, ...body] = parseCsv(text);
const rows = body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] || ""])));
const U = { "긴급": 0, "보통": 1, "낮음": 2 };
rows.sort((a, b) => ((a["급한 정도"] === "긴급") === (b["급한 정도"] === "긴급") ? b["접수번호"].localeCompare(a["접수번호"], "ko", { numeric: true }) : a["급한 정도"] === "긴급" ? -1 : 1));

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const pill = (u) => `<span class="pill ${u === "긴급" ? "u" : u === "보통" ? "m" : "l"}">${esc(u)}</span>`;
const count = (k) => { const c = {}; rows.forEach((r) => (c[r[k]] = (c[r[k]] || 0) + 1)); return Object.entries(c).sort((a, b) => b[1] - a[1]); };
const bars = (k) => { const e = count(k); const max = Math.max(1, ...e.map((x) => x[1])); return e.map(([n, v]) => `<div class="bar"><span>${esc(n)}</span><i style="width:${(v / max) * 100}%"></i><b>${v}</b></div>`).join(""); };

const cards = rows.map((r) => `
<article class="${r["급한 정도"] === "긴급" ? "urgent" : ""} ${r["광고 주의"] ? "warn" : ""}">
  <header><b class="mono">${esc(r["접수번호"])}</b> <span class="ch">${esc(r["채널"])}</span> <span class="muted">${esc(r["접수시각"])} · ${esc(r["이름"] || "이름 없음")} ${esc(r["연락처"])}</span>
    ${pill(r["급한 정도"])} ${r["광고 주의"] ? `<span class="pill w">${esc(r["광고 주의"])}</span>` : ""}</header>
  <h3>${esc(r["요약"])}</h3>
  <p class="muted">${esc(r["시술"])} · ${esc(r["문의 종류"])} · 담당 <b>${esc(r["담당 부서"])}</b>${r["빠진 정보"] ? ` · <span class="miss">빠진 정보: ${esc(r["빠진 정보"])}</span>` : ""}</p>
  ${r["비고"] ? `<p class="note">${esc(r["비고"])}</p>` : ""}
  <div class="two"><div><small>AI로 보낸 글 (가린 상태)</small><div class="box">${esc(r["가린 문의 내용"])}</div></div>
  <div><small>답변 초안 · 검토 후 발송</small><div class="box draft">${esc(r["답변 초안"])}</div></div></div>
</article>`).join("");

const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>상담 문의함 · 샘플성형외과(예시)</title><style>
body{margin:0;background:#eef2f4;color:#18303a;font-family:"Malgun Gothic","Apple SD Gothic Neo",sans-serif;font-size:14.5px;line-height:1.6}
.wrap{max-width:1100px;margin:0 auto;padding:20px;display:grid;gap:14px}
h1{font-size:21px;margin:0}h3{margin:2px 0;font-size:15px}.muted{color:#5d7079}.mono{font-family:Consolas,monospace}
.top{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.tile{background:#fff;border:1px solid #d5dee2;border-radius:9px;padding:8px 12px}.tile b{font-size:22px;display:block}
.tile.u b{color:#c62828}.stats{display:grid;grid-template-columns:1fr 1fr;gap:10px}.stats>div{background:#fff;border:1px solid #d5dee2;border-radius:9px;padding:10px 12px}
.bar{display:grid;grid-template-columns:90px 1fr 24px;gap:8px;align-items:center;font-size:13px}.bar i{height:10px;background:#1f6f78;border-radius:3px}
article{background:#fff;border:1px solid #d5dee2;border-left:5px solid #d5dee2;border-radius:9px;padding:12px 14px}
article.urgent{border-left-color:#c62828;background:#fdecea}article.warn{border-left-color:#a15c00}
.pill{font-size:12px;font-weight:600;padding:0 8px;border-radius:99px}.pill.u{background:#c62828;color:#fff}.pill.m{background:#e1f0f1;color:#1f6f78}.pill.l{background:#eef2f4;color:#5d7079}.pill.w{background:#fff3df;color:#a15c00;border:1px solid #a15c00}
.ch{font-size:12px;border:1px solid #d5dee2;border-radius:4px;padding:0 5px}.miss{color:#a15c00;font-weight:600}.note{color:#a15c00;margin:2px 0}
.two{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:6px}.box{background:#eef2f4;border-radius:6px;padding:8px;white-space:pre-wrap}.draft{background:#f6faf7}
@media(max-width:760px){.top,.stats,.two{grid-template-columns:1fr}}
</style></head><body><div class="wrap">
<h1>샘플성형외과(예시) · 상담 문의함</h1>
<p class="muted">n8n이 모은 상담 대장(상담대장.csv)을 그대로 보여 줘요. 답변 초안은 상담실장이 검토한 뒤 보내요. AI는 의학적 판단을 하지 않고, 수술 후 증상은 간호팀에 알리는 데까지만 해요.</p>
<div class="top"><div class="tile"><small>전체 문의</small><b>${rows.length}</b></div>
<div class="tile u"><small>긴급 (간호팀)</small><b>${rows.filter((r) => r["급한 정도"] === "긴급").length}</b></div>
<div class="tile"><small>광고 주의</small><b>${rows.filter((r) => r["광고 주의"]).length}</b></div>
<div class="tile"><small>빠진 정보 있음</small><b>${rows.filter((r) => r["빠진 정보"]).length}</b></div></div>
<div class="stats"><div><b>시술별</b>${bars("시술")}</div><div><b>채널별</b>${bars("채널")}</div></div>
${cards || "<p>아직 들어온 문의가 없어요.</p>"}
</div></body></html>`;
return [{ json: { html } }];
