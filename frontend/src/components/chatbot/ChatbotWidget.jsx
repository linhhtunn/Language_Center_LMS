import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bot, X, Send, History, Plus, ChevronLeft, Trash2, ArrowUpRight, ShieldCheck, Sparkles, LoaderCircle, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTest } from '../../context/TestContext';
import { chatbotApi } from '../../api/chatbotService';
import './ChatbotWidget.css';

const ROLE_LABEL = { Admin: 'Trợ lý quản trị', Giao_Vien: 'Đồng hành cùng giáo viên', Hoc_Sinh: 'Bạn học tiếng Anh của bạn', Phu_Huynh: 'Đồng hành cùng phụ huynh' };
const WELCOME = { Admin: 'Tra cứu nhanh, làm việc nhẹ nhàng hơn.', Giao_Vien: 'Thêm một người bạn hỗ trợ công việc giảng dạy.', Hoc_Sinh: 'Mỗi câu hỏi là một bước tiến nhỏ. Cứ hỏi nhé!', Phu_Huynh: 'Cùng theo dõi và động viên con mỗi ngày.' };
const errorText = (response) => response?.message || 'Chưa kết nối được với trợ lý. Bạn thử lại sau nhé.';
const dateText = (value) => new Date(value.endsWith('Z') ? value : `${value}Z`).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });

// A tiny React-only formatter; no HTML, links, images or executable markdown.
function AnswerText({ content }) {
  return content.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g).map((part, index) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={index}>{part.slice(2, -2)}</strong> :
      part.startsWith('*') && part.endsWith('*') ? <em key={index}>{part.slice(1, -1)}</em> : part);
}

export default function ChatbotWidget() {
  const { user } = useAuth();
  const { isTestActive } = useTest();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [available, setAvailable] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [notice, setNotice] = useState('');
  const [messages, setMessages] = useState([]);
  const [thread, setThread] = useState(null);
  const [threads, setThreads] = useState([]);
  const [history, setHistory] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [links, setLinks] = useState([]);
  const inputRef = useRef(null);
  const bottomRef = useRef(null);
  const launcherRef = useRef(null);
  const requestRef = useRef(null);
  const pendingRef = useRef(null);
  const epochRef = useRef(0);
  const canUse = Boolean(user?.id && ROLE_LABEL[user?.role]);

  const refreshStatus = useCallback(async (signal, epoch) => {
    if (!canUse) return;
    try {
      const response = await chatbotApi.status(signal);
      if (signal?.aborted || epoch !== epochRef.current) return;
      const allowed = response?.success && response.data?.available;
      setAvailable(Boolean(allowed));
      if (response?.success) {
        setSuggestions(response.data.suggestions || []);
        setNotice(response.data.notice || '');
      }
      if (!allowed) {
        requestRef.current?.abort();
        setOpen(false);
        setMessages([]);
        setLinks([]);
      }
    } catch (err) {
      if (err.name !== 'AbortError' && epoch === epochRef.current) setAvailable(false);
    }
  }, [canUse, user?.id, user?.role]);

  useEffect(() => {
    const epoch = ++epochRef.current;
    const controller = new AbortController();
    requestRef.current?.abort();
    pendingRef.current = null;
    setOpen(false); setAvailable(false); setMessages([]); setThread(null); setThreads([]);
    setDraft(''); setError(''); setLinks([]); setHistory(false); setBusy(false);
    refreshStatus(controller.signal, epoch);
    const check = () => refreshStatus(controller.signal, epoch);
    const onStorage = (event) => { if (event.key === 'chatbot:exam-change') check(); };
    window.addEventListener('focus', check);
    window.addEventListener('chatbot:exam-change', check);
    window.addEventListener('storage', onStorage);
    // Students may begin a test in another browser/tab; server state is authoritative.
    const timer = user?.role === 'Hoc_Sinh' ? setInterval(check, 10000) : null;
    return () => {
      controller.abort(); requestRef.current?.abort();
      window.removeEventListener('focus', check);
      window.removeEventListener('chatbot:exam-change', check);
      window.removeEventListener('storage', onStorage);
      if (timer) clearInterval(timer);
    };
  }, [refreshStatus, user?.id, user?.role]);

  useEffect(() => {
    if (isTestActive) { requestRef.current?.abort(); setOpen(false); setMessages([]); setLinks([]); }
  }, [isTestActive]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (event) => { if (event.key === 'Escape') { setOpen(false); launcherRef.current?.focus(); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [messages, busy, open]);

  const run = async (action) => {
    if (busy) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setBusy(true); setError('');
    try { await action(controller.signal); }
    catch (err) { if (err.name !== 'AbortError') setError('Không thể kết nối. Câu hỏi chưa bị mất, bạn thử gửi lại nhé.'); }
    finally { if (requestRef.current === controller) { setBusy(false); requestRef.current = null; } }
  };

  const accept = (response) => {
    if (response?.success) return true;
    if (response?.code === 'CHATBOT_EXAM_ACTIVE' || response?.raw?.code === 'CHATBOT_EXAM_ACTIVE') {
      setAvailable(false); setOpen(false); setMessages([]); setLinks([]);
    }
    setError(errorText(response));
    return false;
  };

  const send = (value) => {
    const question = (value ?? draft).trim();
    if (!question || question.length > 1200 || busy) return;
    run(async (signal) => {
      let activeThread = thread;
      if (!activeThread) {
        const created = await chatbotApi.create(signal);
        if (!accept(created) || signal.aborted) return;
        activeThread = created.data; setThread(activeThread);
      }
      // Retrying after a lost network response reuses the id; the server won't bill/save twice.
      if (pendingRef.current?.question !== question || pendingRef.current?.threadId !== activeThread.id)
        pendingRef.current = { question, threadId: activeThread.id, requestId: crypto.randomUUID() };
      const response = await chatbotApi.send(activeThread.id, question, pendingRef.current.requestId, signal);
      if (!accept(response) || signal.aborted) { setDraft(question); return; }
      setMessages((old) => [...old, ...response.data.messages.filter(m => !old.some(x => x.id === m.id))]);
      setLinks(response.data.links || []);
      setThread((old) => ({ ...old, title: old?.title === 'Cuộc trò chuyện mới' ? question : old?.title }));
      setDraft(''); pendingRef.current = null;
      setHistory(false); inputRef.current?.focus();
    });
  };

  const showHistory = () => run(async (signal) => {
    const response = await chatbotApi.threads(0, signal);
    if (!accept(response) || signal.aborted) return;
    setThreads(response.data); setHasMore(response.data.length === 30); setHistory(true); setConfirmDelete(null);
  });

  const loadThread = (item) => run(async (signal) => {
    const response = await chatbotApi.messages(item.id, signal);
    if (!accept(response) || signal.aborted) return;
    setThread(item); setMessages(response.data); setHistory(false); setLinks([]); setDraft(''); pendingRef.current = null;
  });

  const newThread = () => {
    if (busy) return;
    setThread(null); setMessages([]); setHistory(false); setError(''); setLinks([]); setDraft(''); pendingRef.current = null;
    inputRef.current?.focus();
  };

  const removeThread = (id) => run(async (signal) => {
    const response = await chatbotApi.remove(id, signal);
    if (!accept(response) || signal.aborted) return;
    setThreads(old => old.filter(x => x.id !== id)); setConfirmDelete(null);
    if (thread?.id === id) { setThread(null); setMessages([]); setLinks([]); pendingRef.current = null; }
  });

  if (!canUse || !available || isTestActive) return null;

  return <div className="edu-chatbot">
    {open && <section className="edu-chat-panel" role="dialog" aria-modal="false" aria-labelledby="edu-chat-title">
      <header className="edu-chat-header">
        <span className="edu-chat-avatar"><Bot size={25} aria-hidden="true" /><i /></span>
        <div className="edu-chat-heading"><h2 id="edu-chat-title">Trợ lý AI</h2><span>{ROLE_LABEL[user.role]}</span></div>
        <button type="button" className="edu-chat-icon" aria-label="Cuộc trò chuyện mới" title="Cuộc trò chuyện mới" disabled={busy} onClick={newThread}><Plus size={20} /></button>
        <button type="button" className="edu-chat-icon" aria-label="Lịch sử trò chuyện" title="Lịch sử trò chuyện" disabled={busy} onClick={showHistory}><History size={19} /></button>
        <button type="button" className="edu-chat-icon" aria-label="Đóng chatbot" onClick={() => { setOpen(false); launcherRef.current?.focus(); }}><X size={21} /></button>
      </header>

      <div className="edu-chat-trust"><ShieldCheck size={14} /> Lịch sử riêng tư · Hỗ trợ theo vai trò</div>
      {history ? <div className="edu-chat-history">
        <div className="edu-chat-history-heading"><button type="button" onClick={() => setHistory(false)} aria-label="Quay lại trò chuyện"><ChevronLeft size={18} /></button><h3>Lịch sử của bạn</h3></div>
        {threads.length === 0 && <div className="edu-chat-empty"><MessageCircle size={32} /><p>Chưa có cuộc trò chuyện nào.</p><span>Câu hỏi đầu tiên của bạn sẽ được lưu tại đây.</span></div>}
        {threads.map(item => <div key={item.id} className={`edu-chat-thread ${thread?.id === item.id ? 'is-selected' : ''}`}>
          <button type="button" className="edu-chat-thread-open" disabled={busy} onClick={() => loadThread(item)}><span>{item.title}</span><small>{dateText(item.updatedAtUtc)}</small></button>
          <button type="button" className="edu-chat-delete" disabled={busy} aria-label={`Xóa hội thoại ${item.title}`} onClick={() => setConfirmDelete(item.id)}><Trash2 size={16} /></button>
          {confirmDelete === item.id && <div className="edu-chat-delete-confirm"><span>Xóa vĩnh viễn cuộc trò chuyện này?</span><button type="button" disabled={busy} onClick={() => removeThread(item.id)}>Xóa</button><button type="button" onClick={() => setConfirmDelete(null)}>Hủy</button></div>}
        </div>)}
        {hasMore && <button type="button" className="edu-chat-more" disabled={busy} onClick={() => run(async (signal) => {
          const response = await chatbotApi.threads(threads.length, signal);
          if (accept(response) && !signal.aborted) { setThreads(old => [...old, ...response.data]); setHasMore(response.data.length === 30); }
        })}>Xem hội thoại cũ hơn</button>}
      </div> : <>
        <div className="edu-chat-body" role="log" aria-live="polite" aria-relevant="additions" aria-label="Nội dung trò chuyện">
          {messages.length === 0 && <div className="edu-chat-welcome">
            <div className="edu-chat-welcome-icon"><Sparkles size={25} /></div>
            <h3>Chào bạn, mình ở đây 👋</h3><p>{WELCOME[user.role]}</p><span>Bạn muốn bắt đầu từ đâu?</span>
            <div className="edu-chat-suggestions">{suggestions.map(item => <button key={item.id} type="button" disabled={busy} onClick={() => send(item.question)}>{item.question}<ArrowUpRight size={15} /></button>)}</div>
          </div>}
          {messages.map(message => <article key={message.id} className={`edu-chat-message ${message.role === 'user' ? 'is-user' : 'is-bot'}`}>
            {message.role !== 'user' && <span className="edu-chat-message-icon"><Bot size={17} /></span>}
            <div><div className="edu-chat-bubble">{message.role === 'user' ? message.content : <AnswerText content={message.content} />}</div><small>{message.role === 'user' ? 'Bạn' : 'Trợ lý'} · {dateText(message.createdAtUtc)}</small></div>
          </article>)}
          {links.length > 0 && <div className="edu-chat-links">{links.filter(link => /^\/(admin|teacher|student|parent)(\/|$)/.test(link.path)).map(link => <button type="button" key={link.path} onClick={() => navigate(link.path)}>{link.label}<ArrowUpRight size={14} /></button>)}</div>}
          {busy && <div className="edu-chat-typing" role="status"><Bot size={17} /><span /><span /><span /><small>Mình đang xem câu hỏi…</small></div>}
          <div ref={bottomRef} />
        </div>
        <form className="edu-chat-composer" onSubmit={event => { event.preventDefault(); send(); }}>
          {error && <div className="edu-chat-error" role="alert">{error}</div>}
          <div className="edu-chat-input-row"><textarea ref={inputRef} rows={2} maxLength={1200} value={draft} disabled={busy} aria-label="Câu hỏi cho trợ lý" placeholder="Nhập câu hỏi của bạn…" onChange={event => setDraft(event.target.value)} onKeyDown={event => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); send(); }
          }} /><button type="submit" disabled={busy || !draft.trim()} aria-label="Gửi câu hỏi">{busy ? <LoaderCircle className="edu-chat-spin" size={19} /> : <Send size={19} />}</button></div>
          <div className="edu-chat-compose-hint"><span>Enter để gửi · Shift + Enter xuống dòng</span><span>{draft.length}/1200</span></div>
        </form>
      </>}
      {history && error && <div className="edu-chat-error" role="alert">{error}</div>}
      <footer className="edu-chat-footer" title={notice}>AI có thể nhầm. Không chia sẻ thông tin nhạy cảm.<details><summary>Về dữ liệu trò chuyện</summary><p>{notice}</p></details></footer>
    </section>}
    <button ref={launcherRef} type="button" className={`edu-chat-launcher ${open ? 'is-open' : ''}`} aria-label={open ? 'Đóng trợ lý AI' : 'Mở trợ lý AI'} aria-expanded={open} onClick={() => {
      if (!open) { refreshStatus(undefined, epochRef.current); if (thread) loadThread(thread); }
      setOpen(old => !old);
    }}>{open ? <X size={25} /> : <><Bot size={29} /><span className="edu-chat-launcher-dot" /></>}</button>
    {!open && <span className="edu-chat-launcher-label">Hỏi trợ lý AI</span>}
  </div>;
}
