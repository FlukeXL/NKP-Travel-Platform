// State
let messageHistory = [];
let isFabDragging = false;
let hasFabMoved = false;

document.addEventListener('click', (e) => {
  // Toggle chat window from FAB
  const fab = e.target.closest('#ai-guide-fab');
  if (fab) {
    e.preventDefault();
    e.stopPropagation();

    // Prevent opening chat if it was a drag action
    if (hasFabMoved) return;

    if (!window.MNX_AUTH?.isLoggedIn()) {
      if (typeof window.mnxOpenAuthModal === 'function') {
        window.mnxOpenAuthModal('login');
      }
      return;
    }

    const chatWindow = document.getElementById('ai-guide-chat');
    const inputEl = document.getElementById('ai-guide-chat-input');
    if (chatWindow) {
      const isOpening = chatWindow.style.display === 'none';
      chatWindow.style.display = isOpening ? 'flex' : 'none';
      
      if (isOpening) {
        document.body.classList.add('ai-chat-open');
        // preventScroll: true prevents the browser from scrolling the page to bring the input into view
        if (inputEl) inputEl.focus({ preventScroll: true });
      } else {
        document.body.classList.remove('ai-chat-open');
      }
    }
    return;
  }

  // Close chat window
  const closeBtn = e.target.closest('#ai-guide-chat-close');
  if (closeBtn) {
    e.preventDefault();
    e.stopPropagation();
    const chatWindow = document.getElementById('ai-guide-chat');
    if (chatWindow) {
      chatWindow.style.display = 'none';
      document.body.classList.remove('ai-chat-open');
    }
    return;
  }

  // Send message button
  const sendBtn = e.target.closest('#ai-guide-chat-send');
  if (sendBtn) {
    e.preventDefault();
    e.stopPropagation();
    sendMessage();
    return;
  }
});

// --- Draggable FAB Logic ---
function initDraggableFab() {
  const fab = document.getElementById('ai-guide-fab');
  if (!fab) return;

  let startX, startY, initialLeft, initialTop;

  const startDrag = (e) => {
    // Only left click or touch
    if (e.type === 'mousedown' && e.button !== 0) return;
    
    isFabDragging = true;
    hasFabMoved = false;
    
    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
    
    startX = clientX;
    startY = clientY;
    
    const rect = fab.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;

    // Reset constraint CSS to allow arbitrary positioning
    fab.style.bottom = 'auto';
    fab.style.right = 'auto';
    fab.style.left = initialLeft + 'px';
    fab.style.top = initialTop + 'px';
    fab.style.transition = 'none';

    document.addEventListener('mousemove', drag, { passive: false });
    document.addEventListener('touchmove', drag, { passive: false });
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);
  };

  const drag = (e) => {
    if (!isFabDragging) return;

    const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

    const dx = clientX - startX;
    const dy = clientY - startY;

    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      hasFabMoved = true;
      e.preventDefault(); // prevent page scroll while dragging
    }

    if (hasFabMoved) {
      let newLeft = initialLeft + dx;
      let newTop = initialTop + dy;

      const maxX = window.innerWidth - fab.offsetWidth;
      const maxY = window.innerHeight - fab.offsetHeight;

      newLeft = Math.max(0, Math.min(newLeft, maxX));
      newTop = Math.max(0, Math.min(newTop, maxY));

      fab.style.left = newLeft + 'px';
      fab.style.top = newTop + 'px';
    }
  };

  const endDrag = (e) => {
    if (!isFabDragging) return;
    isFabDragging = false;
    
    fab.style.transition = '';

    document.removeEventListener('mousemove', drag);
    document.removeEventListener('touchmove', drag);
    document.removeEventListener('mouseup', endDrag);
    document.removeEventListener('touchend', endDrag);
    
    // Reset hasFabMoved after a short delay so the click event can evaluate it
    setTimeout(() => {
      if (!isFabDragging) hasFabMoved = false;
    }, 100);
  };

  fab.addEventListener('mousedown', startDrag);
  fab.addEventListener('touchstart', startDrag, { passive: true });
}

// Ensure draggable init after includes are loaded
document.addEventListener('includes:loaded', initDraggableFab);
// Fallback if already loaded
if (document.readyState === 'complete') {
  setTimeout(initDraggableFab, 500);
}

// Handle Enter key for input
document.addEventListener('keypress', (e) => {
  if (e.target && e.target.id === 'ai-guide-chat-input') {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }
});

// Basic markdown parser for bold, italics, and line breaks
function parseMarkdown(text) {
  let parsed = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
  return parsed;
}

function appendMessage(content, role) {
  const messagesContainer = document.getElementById('ai-guide-chat-messages');
  if (!messagesContainer) return;

  const msgDiv = document.createElement('div');
  msgDiv.className = `ai-guide-chat__message ai-guide-chat__message--${role}`;
  
  const bubble = document.createElement('div');
  bubble.className = 'ai-guide-chat__bubble';
  bubble.innerHTML = role === 'bot' ? parseMarkdown(content) : content;
  
  msgDiv.appendChild(bubble);
  messagesContainer.appendChild(msgDiv);
  
  // Auto scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showLoading() {
  const messagesContainer = document.getElementById('ai-guide-chat-messages');
  if (!messagesContainer) return;

  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'ai-guide-chat__message ai-guide-chat__message--bot';
  loadingDiv.id = 'ai-guide-loading';
  
  const bubble = document.createElement('div');
  bubble.className = 'ai-guide-chat__bubble ai-guide-loading';
  bubble.innerHTML = '<span></span><span></span><span></span>';
  
  loadingDiv.appendChild(bubble);
  messagesContainer.appendChild(loadingDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function removeLoading() {
  const loadingDiv = document.getElementById('ai-guide-loading');
  if (loadingDiv) {
    loadingDiv.remove();
  }
}

async function sendMessage() {
  const inputEl = document.getElementById('ai-guide-chat-input');
  const sendBtn = document.getElementById('ai-guide-chat-send');
  if (!inputEl) return;

  const text = inputEl.value.trim();
  if (!text) return;

  // Check anonymous chat limit
  const isLoggedIn = window.MNX_AUTH && window.MNX_AUTH.isLoggedIn();
  if (!isLoggedIn) {
    let chatCount = parseInt(localStorage.getItem('mnx_ai_chat_count') || '0', 10);
    if (chatCount >= 3) {
      if (typeof window.mnxOpenAuthModal === 'function') {
        window.mnxOpenAuthModal('register');
      }
      appendMessage('คุณใช้งานครบ 3 ครั้งแล้ว กรุณาสมัครสมาชิกเพื่อคุยกับ AI ไกด์ต่อนะครับ', 'bot');
      return;
    }
    localStorage.setItem('mnx_ai_chat_count', chatCount + 1);
  }
  
  // UI Update - User message
  inputEl.value = '';
  inputEl.style.height = 'auto'; // Reset height after send
  appendMessage(text, 'user');
  
  messageHistory.push({ role: 'user', content: text });
  
  showLoading();
  if (sendBtn) sendBtn.disabled = true;
  inputEl.disabled = true;

  try {
    const data = await window.MNX_API.post('/ai/tour-guide/chat', { messageHistory });
    removeLoading();
    
    if (data && data.reply) {
      appendMessage(data.reply, 'bot');
      messageHistory.push({ role: 'bot', content: data.reply });
    } else {
      appendMessage('ขออภัยด้วยครับ เกิดข้อผิดพลาดในการรับข้อมูล กรุณาลองใหม่อีกครั้งครับ ', 'bot');
    }
  } catch (error) {
    console.error(error);
    removeLoading();
    appendMessage('ขออภัยด้วยครับ เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้งครับ ', 'bot');
  } finally {
    if (sendBtn) sendBtn.disabled = false;
    inputEl.disabled = false;
    inputEl.focus({ preventScroll: true });
  }
}

// Global API helper
window.MapNexusAI = window.PlanvisAI = {
  toggle: () => {
    const chatWindow = document.getElementById('ai-guide-chat');
    const inputEl = document.getElementById('ai-guide-chat-input');
    if (chatWindow) {
      const isOpening = chatWindow.style.display === 'none';
      chatWindow.style.display = isOpening ? 'flex' : 'none';
      
      if (isOpening) {
        document.body.classList.add('ai-chat-open');
        // preventScroll: true prevents the browser from scrolling the page to bring the input into view
        if (inputEl) inputEl.focus({ preventScroll: true });
      } else {
        document.body.classList.remove('ai-chat-open');
      }
    }
  }
};

// Auto-resize input area
document.addEventListener('input', (e) => {
  if (e.target.id === 'ai-guide-chat-input') {
    e.target.style.height = 'auto'; // Reset height to calculate scrollHeight
    e.target.style.height = (e.target.scrollHeight) + 'px';
  }
});

// Send on Enter (Shift+Enter for newline)
document.addEventListener('keydown', (e) => {
  if (e.target.id === 'ai-guide-chat-input' && e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});
