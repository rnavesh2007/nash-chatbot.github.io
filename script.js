/**
 * Nash — Document Intelligence Chatbot
 * © 2025 Navesh R. All rights reserved.
 *
 * Powered by Claude API (Anthropic)
 * Supports: PDF, DOCX, TXT, PNG, JPG, JPEG, WEBP
 */

// ── CONFIG ──────────────────────────────────────────────────────────────────
const API_KEY = "sk-ant-api03-0a3b6gNB8m9cPWLiP m2BYZxuf9WtCwsWHrzX8EU79VRpMsv GzeOSbQLQOMYLnn1j60a-Wm5oJtDaw
D4QwXOFOw-jNJRIgAA";
const MODEL   = "claude-sonnet-4-6";

// ── STATE ────────────────────────────────────────────────────────────────────
let documentContent  = null;
let documentBase64   = null;
let documentMediaType = null;
let documentName     = "";
let isImage          = false;
let isPDF            = false;
let chatHistory      = [];
let isLoading        = false;

// ── DOM REFS ─────────────────────────────────────────────────────────────────
const fileInput     = document.getElementById("fileInput");
const uploadZone    = document.getElementById("uploadZone");
const docInfo       = document.getElementById("docInfo");
const docNameEl     = document.getElementById("docName");
const docStatusEl   = document.getElementById("docStatus");
const docRemove     = document.getElementById("docRemove");
const chatMessages  = document.getElementById("chatMessages");
const welcomeScreen = document.getElementById("welcomeScreen");
const userInput     = document.getElementById("userInput");
const sendBtn       = document.getElementById("sendBtn");
const statusDot     = document.getElementById("statusDot");
const headerSub     = document.getElementById("headerSub");

// ── UPLOAD HANDLING ──────────────────────────────────────────────────────────
uploadZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadZone.classList.add("drag-over");
});

uploadZone.addEventListener("dragleave", () => {
  uploadZone.classList.remove("drag-over");
});

uploadZone.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadZone.classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

fileInput.addEventListener("change", () => {
  if (fileInput.files[0]) handleFile(fileInput.files[0]);
});

docRemove.addEventListener("click", resetDocument);

// ── FILE HANDLER ─────────────────────────────────────────────────────────────
async function handleFile(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  documentName = file.name;

  docStatusEl.textContent = "Reading...";
  docStatusEl.style.color = "var(--accent-soft)";
  showDocInfo(file.name, "Reading...");

  try {
    if (["png", "jpg", "jpeg", "webp"].includes(ext)) {
      isImage = true;
      isPDF = false;
      documentMediaType = `image/${ext === "jpg" ? "jpeg" : ext}`;
      documentBase64 = await fileToBase64(file);
      documentContent = null;
      finishLoad("Image ready");

    } else if (ext === "pdf") {
      isPDF = true;
      isImage = false;
      documentBase64 = await fileToBase64(file);
      documentContent = null;
      finishLoad("PDF ready");

    } else if (ext === "txt") {
      isImage = false;
      isPDF = false;
      documentContent = await file.text();
      finishLoad("Text ready");

    } else if (["docx", "doc"].includes(ext)) {
      isImage = false;
      isPDF = false;
      const arrayBuffer = await file.arrayBuffer();
      const result = await extractDocx(arrayBuffer);
      documentContent = result;
      finishLoad("DOCX ready");

    } else {
      showError("Unsupported file type.");
      return;
    }
  } catch (err) {
    console.error(err);
    showError("Failed to read file.");
  }
}

function finishLoad(statusText) {
  docStatusEl.textContent = statusText;
  docStatusEl.style.color = "var(--success)";
  statusDot.classList.add("active");
  headerSub.textContent = `Chatting about: ${documentName}`;
  userInput.disabled = false;
  sendBtn.disabled = false;
  userInput.placeholder = "Ask Nash anything about your document...";
  userInput.focus();

  if (welcomeScreen) welcomeScreen.style.display = "none";

  addNashMessage(`I've read **${documentName}**. Ask me anything about it — I'll answer based on its content.`);
}

function showError(msg) {
  docStatusEl.textContent = msg;
  docStatusEl.style.color = "var(--error)";
}

function resetDocument() {
  documentContent = null;
  documentBase64 = null;
  documentMediaType = null;
  documentName = "";
  isImage = false;
  isPDF = false;
  chatHistory = [];
  fileInput.value = "";

  docInfo.style.display = "none";
  uploadZone.style.display = "flex";
  statusDot.classList.remove("active");
  headerSub.textContent = "Upload a document to begin";
  userInput.disabled = true;
  sendBtn.disabled = true;

  chatMessages.innerHTML = "";
  chatMessages.appendChild(welcomeScreen);
  welcomeScreen.style.display = "flex";
}

function showDocInfo(name, status) {
  uploadZone.style.display = "none";
  docInfo.style.display = "flex";
  docNameEl.textContent = name;
  docStatusEl.textContent = status;
}

// ── BASE64 UTIL ──────────────────────────────────────────────────────────────
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── DOCX EXTRACTION ──────────────────────────────────────────────────────────
async function extractDocx(arrayBuffer) {
  if (!window.mammoth) {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js");
  }
  const result = await window.mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// ── CHAT INPUT HANDLING ──────────────────────────────────────────────────────
userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});

sendBtn.addEventListener("click", handleSend);

userInput.addEventListener("input", () => {
  userInput.style.height = "auto";
  userInput.style.height = Math.min(userInput.scrollHeight, 120) + "px";
});

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    userInput.value = chip.textContent;
    userInput.dispatchEvent(new Event("input"));
    handleSend();
  });
});

// ── SEND MESSAGE ─────────────────────────────────────────────────────────────
async function handleSend() {
  const text = userInput.value.trim();
  if (!text || isLoading) return;

  addUserMessage(text);
  userInput.value = "";
  userInput.style.height = "auto";

  chatHistory.push({ role: "user", content: text });

  const typingId = showTyping();
  isLoading = true;
  sendBtn.disabled = true;

  try {
    const reply = await askClaude(text);
    removeTyping(typingId);
    addNashMessage(reply);
    chatHistory.push({ role: "assistant", content: reply });
  } catch (err) {
    removeTyping(typingId);
    addNashMessage("Sorry, something went wrong. Please check your API key and try again.");
    console.error(err);
  } finally {
    isLoading = false;
    sendBtn.disabled = false;
    userInput.focus();
  }
}

// ── CLAUDE API ───────────────────────────────────────────────────────────────
async function askClaude(userQuestion) {
  const systemPrompt = `You are Nash, a highly intelligent document assistant created by Navesh R.
You have been given a document by the user. Your ONLY job is to answer questions based on the content of that document.
- Be clear, helpful, and concise.
- If the answer is not found in the document, say so honestly.
- Do not make up information.
- Format responses with line breaks for readability when needed.
- You are Nash — not Claude, not any other AI.`;

  let messages;

  if (chatHistory.length <= 1) {
    const firstContent = buildFirstMessageContent(userQuestion);
    messages = [{ role: "user", content: firstContent }];
  } else {
    const firstContent = buildFirstMessageContent(chatHistory[0].content);
    messages = [
      { role: "user", content: firstContent },
      ...chatHistory.slice(1).map(m => ({ role: m.role, content: m.content }))
    ];
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || "API error");
  }

  const data = await response.json();
  return data.content[0].text;
}

function buildFirstMessageContent(questionText) {
  if (isImage) {
    return [
      {
        type: "image",
        source: {
          type: "base64",
          media_type: documentMediaType,
          data: documentBase64
        }
      },
      {
        type: "text",
        text: `The document uploaded is an image named "${documentName}". Please answer this question based on the image content:\n\n${questionText}`
      }
    ];
  } else if (isPDF) {
    return [
      {
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: documentBase64
        }
      },
      {
        type: "text",
        text: `The document uploaded is a PDF named "${documentName}". Please answer this question based on its content:\n\n${questionText}`
      }
    ];
  } else {
    return `I have uploaded a document named "${documentName}". Here is the full text content:\n\n${documentContent}\n\n---\n\nBased only on the above document, please answer:\n${questionText}`;
  }
}

// ── UI HELPERS ───────────────────────────────────────────────────────────────
function addUserMessage(text) {
  const msg = document.createElement("div");
  msg.className = "message user";
  msg.innerHTML = `
    <div class="msg-avatar">N</div>
    <div class="msg-bubble">${escapeHtml(text)}</div>
  `;
  chatMessages.appendChild(msg);
  scrollToBottom();
}

function addNashMessage(text) {
  const msg = document.createElement("div");
  msg.className = "message nash";
  msg.innerHTML = `
    <div class="msg-avatar">
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="14" fill="#1a1a2e"/>
        <circle cx="16" cy="16" r="6" fill="#7C6FFF" opacity="0.3"/>
        <path d="M16 5 L16 11 M16 21 L16 27 M5 16 L11 16 M21 16 L27 16" stroke="#7C6FFF" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="16" cy="16" r="2.5" fill="#7C6FFF"/>
        <path d="M11.5 11.5 L14 14 M18 18 L20.5 20.5 M20.5 11.5 L18 14 M14 18 L11.5 20.5" stroke="#A89BFF" stroke-width="1.2" stroke-linecap="round"/>
      </svg>
    </div>
    <div class="msg-bubble">${formatMarkdown(text)}</div>
  `;
  chatMessages.appendChild(msg);
  scrollToBottom();
}

function showTyping() {
  const id = "typing-" + Date.now();
  const msg = document.createElement("div");
  msg.className = "message nash";
  msg.id = id;
  msg.innerHTML = `
    <div class="msg-avatar">
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="14" fill="#1a1a2e"/>
        <circle cx="16" cy="16" r="6" fill="#7C6FFF" opacity="0.3"/>
        <path d="M16 5 L16 11 M16 21 L16 27 M5 16 L11 16 M21 16 L27 16" stroke="#7C6FFF" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="16" cy="16" r="2.5" fill="#7C6FFF"/>
      </svg>
    </div>
    <div class="msg-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>
  `;
  chatMessages.appendChild(msg);
  scrollToBottom();
  return id;
}

function removeTyping(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, "<br>");
}

function formatMarkdown(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br>");
      }
