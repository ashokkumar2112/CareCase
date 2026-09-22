const STORAGE_KEY = "carecase_patients_v1";
let patients = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

const $ = id => document.getElementById(id);
const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(patients));

function showPage(page){
  document.querySelectorAll(".page").forEach(p=>p.classList.add("hidden"));
  $(page).classList.remove("hidden");
  document.querySelectorAll(".nav[data-page]").forEach(b=>b.classList.toggle("active", b.dataset.page===page));
  const titles={dashboard:"Dashboard",register:"Register Patient",patients:"Patients",records:"Case Records",triage:"Triage Assistant",voice:"Voice Case Taking",about:"About"};
  $("pageTitle").textContent=titles[page]||"Dashboard";
  renderAll();
}
function today(){return new Date().toISOString().slice(0,10)}
function priorityFromSymptoms(s){
  const t=(s||"").toLowerCase();
  const high=["difficulty breathing","cannot breathe","unresponsive","not responding","severe bleeding","heavy bleeding","severe chest pain","stroke","seizure"].some(x=>t.includes(x));
  if(high)return "High";
  const med=["fever","vomiting","persistent pain","dizziness","fainting"].some(x=>t.includes(x));
  return med?"Medium":"Low";
}
function renderDashboard(){
  $("statPatients").textContent=patients.length;
  $("statRecords").textContent=patients.length;
  $("statHigh").textContent=patients.filter(p=>p.priority==="High").length;
  $("statToday").textContent=patients.filter(p=>p.date===today()).length;
  const recent=patients.slice(-5).reverse();
  $("recentPatients").innerHTML=recent.length?recent.map(p=>`
    <div class="record"><b>${escapeHtml(p.name)}</b><br><span class="muted">${p.age} years · ${escapeHtml(p.gender)} · ${p.priority} priority</span></div>
  `).join(""):`<div class="empty">No patients registered yet.</div>`;
}
function renderPatients(){
  const q=($("patientSearch")?.value||"").toLowerCase();
  const list=patients.filter(p=>p.name.toLowerCase().includes(q)||p.phone.toLowerCase().includes(q));
  $("patientTable").innerHTML=list.length?`<div class="table-wrap"><table><thead><tr><th>ID</th><th>Name</th><th>Age</th><th>Phone</th><th>Priority</th><th>Date</th></tr></thead><tbody>
  ${list.map(p=>`<tr><td>${p.id}</td><td><b>${escapeHtml(p.name)}</b></td><td>${p.age}</td><td>${escapeHtml(p.phone||"-")}</td><td><span class="badge ${p.priority.toLowerCase()}">${p.priority}</span></td><td>${p.date}</td></tr>`).join("")}
  </tbody></table></div>`:`<div class="empty">No matching patients.</div>`;
}
function renderRecords(){
  $("recordsList").innerHTML=patients.length?patients.slice().reverse().map(p=>`
    <div class="record">
      <h4>${escapeHtml(p.name)} <span class="badge ${p.priority.toLowerCase()}">${p.priority}</span></h4>
      <div><b>Patient ID:</b> ${p.id} &nbsp; <b>Date:</b> ${p.date}</div>
      <p><b>Symptoms:</b> ${escapeHtml(p.symptoms)}</p>
      <p><b>History:</b> ${escapeHtml(p.history||"Not provided")}</p>
      <p><b>Medications:</b> ${escapeHtml(p.meds||"Not provided")}</p>
      <p><b>Allergies:</b> ${escapeHtml(p.allergy||"Not provided")}</p>
    </div>`).join(""):`<div class="empty">No case records available.</div>`;
}
function renderAll(){renderDashboard(); if($("patientTable"))renderPatients(); if($("recordsList"))renderRecords();}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}

$("loginForm").addEventListener("submit",e=>{
  e.preventDefault();
  if($("loginEmail").value==="doctor@carecase.demo" && $("loginPassword").value==="1234"){
    $("loginView").classList.add("hidden"); $("appView").classList.remove("hidden"); showPage("dashboard");
  } else alert("Demo login: doctor@carecase.demo / 1234");
});
$("logoutBtn").onclick=()=>{ $("appView").classList.add("hidden"); $("loginView").classList.remove("hidden"); };
document.querySelectorAll(".nav[data-page]").forEach(b=>b.onclick=()=>showPage(b.dataset.page));
document.querySelectorAll("[data-page-link]").forEach(b=>b.onclick=()=>showPage(b.dataset.pageLink));

$("patientForm").addEventListener("submit",e=>{
  e.preventDefault();
  const symptoms=$("pSymptoms").value.trim();
  const p={id:"P"+Date.now().toString().slice(-6),name:$("pName").value.trim(),age:$("pAge").value,gender:$("pGender").value,phone:$("pPhone").value.trim(),blood:$("pBlood").value,allergy:$("pAllergy").value.trim(),symptoms,history:$("pHistory").value.trim(),meds:$("pMeds").value.trim(),priority:priorityFromSymptoms(symptoms),date:today()};
  patients.push(p);save();e.target.reset();alert("Patient registered successfully.");showPage("patients");
});
$("patientSearch").addEventListener("input",renderPatients);

$("triageForm").addEventListener("submit",e=>{
  e.preventDefault();
  const flags=[$("tBreathing").value,$("tUnresponsive").value,$("tBleeding").value,$("tChest").value,$("tNeuro").value].filter(x=>x==="Yes").length;
  const symptoms=$("tSymptoms").value;
  let high=flags>0 || priorityFromSymptoms(symptoms)==="High";
  $("triageResult").innerHTML=high?
  `<div class="result high"><h3>High-priority warning</h3><p>One or more emergency warning signs were selected. Seek immediate professional medical assessment and follow local emergency procedures.</p><p><b>Prototype note:</b> This result is a safety prompt, not a diagnosis.</p></div>`:
  `<div class="result normal"><h3>No listed emergency warning sign</h3><p>The selected checklist did not identify the prototype's listed warning signs. Continue appropriate clinical assessment; this does not rule out an emergency.</p></div>`;
});

let recognition=null;
$("startVoice").onclick=()=>{
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){$("voiceStatus").textContent="Speech recognition is not supported in this browser.";return;}
  recognition=new SR(); recognition.lang="en-IN"; recognition.continuous=true; recognition.interimResults=true;
  recognition.onstart=()=>$("voiceStatus").textContent="Listening...";
  recognition.onresult=e=>{let out="";for(let i=0;i<e.results.length;i++)out+=e.results[i][0].transcript+" ";$("voiceText").value=out.trim();};
  recognition.onerror=e=>$("voiceStatus").textContent="Voice error: "+e.error;
  recognition.onend=()=>$("voiceStatus").textContent="Stopped";
  recognition.start();
};
$("stopVoice").onclick=()=>{if(recognition)recognition.stop()};
$("useVoice").onclick=()=>{$("pSymptoms").value=$("voiceText").value;showPage("register")};

$("exportBtn").onclick=()=>{
  const blob=new Blob([JSON.stringify(patients,null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="carecase-patient-records.json";a.click();URL.revokeObjectURL(a.href);
};

renderAll();
