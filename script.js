import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getDatabase, ref, set, update, onValue, get, remove } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";
import { firebaseConfig } from "./firebase.js";

const $ = (id) => document.getElementById(id);
const home = $("home"), game = $("game"), hand = $("hand");
const IMG = { emperor:"images/emperor.png", citizen:"images/citizen.png", slave:"images/slave.png" };
const LABEL = { emperor:"EMPEREUR", citizen:"CITOYEN", slave:"ESCLAVE" };

let db, roomCode, playerId, meKey, oppKey, unsub = null;

function firebaseReady(){ return firebaseConfig.apiKey && !firebaseConfig.apiKey.includes("REMPLACE"); }
function code(){ return Math.random().toString(36).slice(2,8).toUpperCase(); }
function uid(){ return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function baseHand(side){ return side === "emperor" ? ["emperor","citizen","citizen","citizen","citizen"] : ["slave","citizen","citizen","citizen","citizen"]; }
function cardHTML(type, extra=""){ return `<div class="card ${extra}"><img src="${IMG[type]}" alt="${LABEL[type]}"></div>`; }
function beats(a,b){
  if(a===b) return 0;
  if(a==="emperor" && b==="citizen") return 1;
  if(a==="citizen" && b==="slave") return 1;
  if(a==="slave" && b==="emperor") return 1;
  return -1;
}
function needFirebase(){
  if(firebaseReady()) return true;
  alert("Tu dois remplir firebase.js avec ta config Firebase pour jouer sur 2 écrans différents.");
  return false;
}
function initFirebase(){ if(!db){ db = getDatabase(initializeApp(firebaseConfig)); } }

$("createBtn").onclick = async () => {
  if(!needFirebase()) return; initFirebase();
  roomCode = code(); playerId = uid(); meKey = "p1"; oppKey = "p2";
  await set(ref(db, `rooms/${roomCode}`), {
    createdAt: Date.now(), phase:"waiting", round:1,
    players:{ p1:{ id:playerId, name:"Joueur 1", side:"emperor", score:0, ready:true } },
    hands:{ p1:baseHand("emperor"), p2:baseHand("slave") },
    choices:{}, reveal:false, resultText:"En attente du joueur 2..."
  });
  enterRoom();
};

$("joinBtn").onclick = async () => {
  if(!needFirebase()) return; initFirebase();
  roomCode = $("roomInput").value.trim().toUpperCase();
  if(!roomCode) return alert("Mets le code de la partie.");
  const snap = await get(ref(db, `rooms/${roomCode}`));
  if(!snap.exists()) return alert("Partie introuvable.");
  playerId = uid(); meKey = "p2"; oppKey = "p1";
  await update(ref(db, `rooms/${roomCode}`), {
    phase:"playing",
    "players/p2":{ id:playerId, name:"Joueur 2", side:"slave", score:0, ready:true },
    resultText:"Choisissez une carte."
  });
  enterRoom();
};

function enterRoom(){
  home.classList.add("hidden"); game.classList.remove("hidden"); $("roomCode").textContent = roomCode;
  if(unsub) unsub();
  unsub = onValue(ref(db, `rooms/${roomCode}`), snap => {
    const state = snap.val();
    if(!state){ alert("La partie a été supprimée."); location.reload(); return; }
    render(state);
  });
}

function render(s){
  const me = s.players?.[meKey]; const opp = s.players?.[oppKey];
  $("status").textContent = s.phase === "waiting" ? "Envoie le code à ton pote." : `${me?.side === "emperor" ? "Camp Empereur" : "Camp Esclave"}`;
  $("youName").textContent = meKey === "p1" ? "Toi J1" : "Toi J2";
  $("oppName").textContent = oppKey === "p1" ? "Adversaire J1" : "Adversaire J2";
  $("youScore").textContent = me?.score ?? 0; $("oppScore").textContent = opp?.score ?? 0; $("roundNumber").textContent = s.round ?? 1;
  $("result").textContent = s.resultText || "Choisis une carte.";

  const myChoice = s.choices?.[meKey]; const oppChoice = s.choices?.[oppKey];
  $("yourPlayed").outerHTML = myChoice ? cardHTML(myChoice) : `<div id="yourPlayed" class="card empty">?</div>`;
  $("oppPlayed").outerHTML = oppChoice && s.reveal ? cardHTML(oppChoice) : `<div id="oppPlayed" class="card back">?</div>`;

  hand.innerHTML = "";
  const cards = s.hands?.[meKey] || [];
  const locked = !!s.choices?.[meKey] || s.phase !== "playing" || s.reveal;
  cards.forEach((type, i) => {
    const el = document.createElement("div"); el.className = "card" + (locked ? " used" : "");
    el.innerHTML = `<img src="${IMG[type]}" alt="${LABEL[type]}">`;
    el.onclick = () => chooseCard(i, type, s);
    hand.appendChild(el);
  });
  $("nextBtn").classList.toggle("hidden", !s.reveal);
}

async function chooseCard(index, type, s){
  if(s.choices?.[meKey]) return;
  const newHand = [...(s.hands?.[meKey] || [])]; newHand.splice(index,1);
  await update(ref(db, `rooms/${roomCode}`), { [`choices/${meKey}`]: type, [`hands/${meKey}`]: newHand, resultText:"Carte choisie. Attente de l'autre joueur..." });
  const snap = await get(ref(db, `rooms/${roomCode}`));
  const latest = snap.val();
  if(latest.choices?.p1 && latest.choices?.p2) await resolveRound(latest);
}

async function resolveRound(s){
  const a = s.choices.p1, b = s.choices.p2;
  const r = beats(a,b);
  let text = `${LABEL[a]} vs ${LABEL[b]} : `;
  const updates = { reveal:true };
  if(r === 0){ text += "égalité, manche nulle."; }
  else if(r === 1){ text += "Joueur 1 gagne la manche."; updates["players/p1/score"] = (s.players.p1.score||0)+1; }
  else { text += "Joueur 2 gagne la manche."; updates["players/p2/score"] = (s.players.p2.score||0)+1; }
  updates.resultText = text;
  await update(ref(db, `rooms/${roomCode}`), updates);
}

$("nextBtn").onclick = async () => {
  const snap = await get(ref(db, `rooms/${roomCode}`)); const s = snap.val();
  const p1Side = s.players.p1.side === "emperor" ? "slave" : "emperor";
  const p2Side = p1Side === "emperor" ? "slave" : "emperor";
  await update(ref(db, `rooms/${roomCode}`), {
    round:(s.round||1)+1, reveal:false, choices:{}, resultText:"Choisissez une carte.",
    "players/p1/side":p1Side, "players/p2/side":p2Side,
    "hands/p1":baseHand(p1Side), "hands/p2":baseHand(p2Side)
  });
};
$("resetBtn").onclick = async () => { if(confirm("Reset la partie ?")) await remove(ref(db, `rooms/${roomCode}`)); };
$("copyBtn").onclick = async () => { await navigator.clipboard.writeText(roomCode); $("copyBtn").textContent="Copié"; setTimeout(()=>$("copyBtn").textContent="Copier le code",1000); };
