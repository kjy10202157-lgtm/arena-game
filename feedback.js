(()=>{
  const $=selector=>document.querySelector(selector);
  const screen=$("#test-center-screen"),start=$("#start-screen"),checks=[...document.querySelectorAll("[data-test]")];
  const CHECK_KEY="neon-clash-test-v1",REPORT_KEY="neon-clash-bug-reports-v1";
  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
  const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}};
  const reports=()=>read(REPORT_KEY,[]);
  function updateProgress(){const saved=read(CHECK_KEY,{});checks.forEach(c=>c.checked=!!saved[c.dataset.test]);const done=checks.filter(c=>c.checked).length;$("#test-progress-text").textContent=`${done} / ${checks.length}`;$("#test-progress-fill").style.width=`${done/checks.length*100}%`}
  function reportText(){const description=$("#bug-description").value.trim(),steps=$("#bug-steps").value.trim();return `[NEON CLASH 버그 신고]\n버전: v34\n발생 위치: ${$("#bug-location").value}\n심각도: ${$("#bug-severity").value}\n기기: ${navigator.userAgent}\n\n문제 설명:\n${description||"입력 안 함"}\n\n재현 방법:\n${steps||"입력 안 함"}`}
  function renderReports(){const list=$("#bug-report-list"),items=reports();list.innerHTML=items.length?items.map(r=>`<article class="report-card"><div><span>${escapeHtml(r.location)} · ${escapeHtml(r.severity)}</span><time>${escapeHtml(r.date)}</time></div><strong>${escapeHtml(r.description)}</strong><p>${escapeHtml(r.steps||"재현 방법 없음")}</p></article>`).join(""):`<div class="empty-reports">아직 저장된 신고가 없습니다.</div>`}
  function escapeHtml(value){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
  function message(text,error=false){const el=$("#bug-message");el.textContent=text;el.style.color=error?"#ff91aa":"#62edc0"}
  function open(){start.classList.remove("visible");screen.classList.add("visible");updateProgress();renderReports()}
  function close(){screen.classList.remove("visible");start.classList.add("visible")}
  checks.forEach(check=>check.addEventListener("change",()=>{const saved=read(CHECK_KEY,{});saved[check.dataset.test]=check.checked;write(CHECK_KEY,saved);updateProgress()}));
  $("#test-center-button").addEventListener("click",open);$("#test-center-back-button").addEventListener("click",close);
  $("#bug-save-button").addEventListener("click",()=>{const description=$("#bug-description").value.trim();if(!description){message("문제 설명을 먼저 입력해 주세요.",true);return}const items=reports();items.unshift({location:$("#bug-location").value,severity:$("#bug-severity").value,description,steps:$("#bug-steps").value.trim(),date:new Date().toLocaleString("ko-KR")});if(write(REPORT_KEY,items.slice(0,20))){renderReports();message("버그 신고를 이 기기에 저장했습니다.")}else message("저장 공간을 사용할 수 없습니다.",true)});
  $("#bug-copy-button").addEventListener("click",async()=>{try{await navigator.clipboard.writeText(reportText());message("신고 내용을 복사했습니다.")}catch{message("복사할 수 없습니다. 내용을 길게 눌러 복사해 주세요.",true)}});
  $("#bug-github-button").addEventListener("click",event=>{const description=$("#bug-description").value.trim();if(!description){event.preventDefault();message("문제 설명을 먼저 입력해 주세요.",true);return}const title=`[버그] ${$("#bug-location").value} - ${description.slice(0,45)}`;event.currentTarget.href=`https://github.com/kjy10202157-lgtm/arena-game/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(reportText())}`});
  $("#bug-clear-button").addEventListener("click",()=>{if(!reports().length)return;if(confirm("저장된 버그 신고를 모두 삭제할까요?")){write(REPORT_KEY,[]);renderReports();message("저장된 신고를 삭제했습니다.")}});
})();
