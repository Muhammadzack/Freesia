// =====================================================================
// FREESIA — SHARED UTILITIES
// Dimuat sebelum config.js dan app.js.
// =====================================================================

// =====================================================================
// 1. KONFIGURASI & KONSTANTA
// =====================================================================

const DEBUG = false;
const LOG = (...args) => { if (DEBUG) console.log('[Freesia]', ...args); };

// Rate Limiting Queue
class RpcQueue {
    constructor(limit = 3, interval = 500) {
        this.queue = [];
        this.running = 0;
        this.limit = limit;
        this.interval = interval;
        this.timer = null;
    }
    
    add(fn) {
        return new Promise((resolve, reject) => {
            this.queue.push({ fn, resolve, reject });
            this.process();
        });
    }
    
    process() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.timer = setInterval(() => {
            if (this.running >= this.limit || this.queue.length === 0) {
                if (this.queue.length === 0) {
                    clearInterval(this.timer);
                    this.timer = null;
                }
                return;
            }
            const task = this.queue.shift();
            this.running++;
            task.fn()
                .then(task.resolve)
                .catch(task.reject)
                .finally(() => {
                    this.running--;
                });
        }, this.interval);
    }
}

const rpcQueue = new RpcQueue(3, 500);

// =====================================================================
// 2. XSS PROTECTION - SAFE CONTENT FUNCTIONS
// =====================================================================

function safeText(text) {
    return String(text).replace(/[&<>"']/g, c => 
        ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function setSafeContent(el, content) {
    if (!el) return;
    el.innerHTML = '';
    if (typeof content === 'string') {
        el.appendChild(document.createTextNode(content));
    } else if (content instanceof Node) {
        el.appendChild(content);
    } else if (Array.isArray(content)) {
        for (const item of content) {
            if (typeof item === 'string') {
                el.appendChild(document.createTextNode(item));
            } else if (item instanceof Node) {
                el.appendChild(item);
            }
        }
    }
}

function createSafeElement(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    for (const [key, val] of Object.entries(attrs)) {
        if (key === 'className') {
            el.className = val;
        } else if (key === 'style') {
            Object.assign(el.style, val);
        } else {
            el.setAttribute(key, val);
        }
    }
    for (const child of children) {
        if (typeof child === 'string') {
            el.appendChild(document.createTextNode(child));
        } else if (child instanceof Node) {
            el.appendChild(child);
        }
    }
    return el;
}

function isValidAddress(addr) {
    return /^0x[a-fA-F0-9]{40}$/.test(addr);
}

// =====================================================================
// 6. HELPER FUNCTIONS
// =====================================================================

const fmt = (n, max=2) => isFinite(n) ? n.toLocaleString('en-US', {maximumFractionDigits:max}) : '0';

const parseNum = (v) => {
    const n = parseFloat(String(v).replace(/,/g,''));
    return (isFinite(n) && n > 0 && n < 1e15) ? n : 0;
};

const TX_HASH_RE = /^0x[0-9a-fA-F]{64}$/;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
