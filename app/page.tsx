'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  images?: string[];
};

type ChatSession = {
  id: string;
  messages: Message[];
  date: string;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'chat' | 'symptom' | 'history'>('chat');
  const [isListening, setIsListening] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('currentChat');
    if (saved) setMessages(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('currentChat', JSON.stringify(messages));
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string, images: string[] = []) => {
    if ((!text.trim() && images.length === 0) || loading) return;

    const userMsg: Message = { role: 'user', content: text, timestamp: Date.now(), images };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSelectedImages([]);
    setLoading(true);

    const assistantMsg: Message = { role: 'assistant', content: '', timestamp: Date.now() };
    setMessages(prev => [...prev, assistantMsg]);

    try {
      const messageContent = images.length > 0
        ? [
            { type: 'text', text },
            ...images.map(img => ({ type: 'image_url', image_url: { url: img } }))
          ]
        : text;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages.map(m => ({
            role: m.role,
            content: m.images && m.images.length > 0
              ? [
                  { type: 'text', text: m.content },
                  ...m.images.map(img => ({ type: 'image_url', image_url: { url: img } }))
                ]
              : m.content
          })), { role: 'user', content: messageContent }]
        }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].content = buffer;
            return newMessages;
          });
        }
      }
    } catch (error) {
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1].content = '抱歉，服务暂时不可用';
        return newMessages;
      });
    }
    setLoading(false);
  };

  const startVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('您的浏览器不支持语音输入');
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.continuous = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };

    recognition.start();
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setSelectedImages(prev => [...prev, base64]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const saveToHistory = () => {
    if (messages.length === 0) return;
    const sessions: ChatSession[] = JSON.parse(localStorage.getItem('chatHistory') || '[]');
    sessions.push({
      id: Date.now().toString(),
      messages,
      date: new Date().toLocaleDateString('zh-CN'),
    });
    localStorage.setItem('chatHistory', JSON.stringify(sessions));
    setMessages([]);
    localStorage.removeItem('currentChat');
  };

  const loadHistory = (session: ChatSession) => {
    setMessages(session.messages);
    setView('chat');
  };

  const symptomQuestions = [
    '您有哪些症状？',
    '症状持续多久了？',
    '是否有发热？',
    '是否影响听力？',
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-blue-600 text-white p-4 shadow-md">
        <div className="flex items-center justify-center gap-3">
          <img src="https://img1.dxycdn.com/2021/1228/997/0828727527046333253-126.png" alt="许庚医生" className="w-12 h-12 rounded-full object-cover" />
          <div>
            <h1 className="text-xl font-bold">许庚医生</h1>
            <p className="text-sm opacity-90">耳鼻喉科专家 · 从业30年</p>
          </div>
        </div>
      </header>

      <nav className="flex bg-white border-b">
        <button onClick={() => setView('chat')} className={`flex-1 py-3 ${view === 'chat' ? 'bg-blue-50 border-b-2 border-blue-600' : ''}`}>咨询</button>
        <button onClick={() => setView('symptom')} className={`flex-1 py-3 ${view === 'symptom' ? 'bg-blue-50 border-b-2 border-blue-600' : ''}`}>症状</button>
        <button onClick={() => setView('history')} className={`flex-1 py-3 ${view === 'history' ? 'bg-blue-50 border-b-2 border-blue-600' : ''}`}>历史</button>
      </nav>

      <main className="flex-1 overflow-y-auto p-4">
        {view === 'chat' && (
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white shadow'}`}>
                  {msg.images && msg.images.length > 0 && (
                    <div className="flex gap-2 mb-2 flex-wrap">
                      {msg.images.map((img, idx) => (
                        <img key={idx} src={img} alt="患者图片" className="w-20 h-20 object-cover rounded" />
                      ))}
                    </div>
                  )}
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
            {loading && <div className="flex justify-start"><div className="bg-white shadow p-3 rounded-lg">正在回复...</div></div>}
            <div ref={messagesEndRef} />
          </div>
        )}

        {view === 'symptom' && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold mb-4">症状自查</h2>
            {symptomQuestions.map((q, i) => (
              <button key={i} onClick={() => { setView('chat'); sendMessage(q); }} className="w-full p-4 bg-white rounded-lg shadow text-left hover:bg-gray-50">
                {q}
              </button>
            ))}
          </div>
        )}

        {view === 'history' && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold mb-4">就诊历史</h2>
            {JSON.parse(localStorage.getItem('chatHistory') || '[]').map((session: ChatSession) => (
              <div key={session.id} onClick={() => loadHistory(session)} className="p-4 bg-white rounded-lg shadow cursor-pointer hover:bg-gray-50">
                <div className="font-semibold">{session.date}</div>
                <div className="text-sm text-gray-600">{session.messages.length} 条消息</div>
              </div>
            ))}
          </div>
        )}
      </main>

      {view === 'chat' && (
        <footer className="bg-white border-t p-4">
          {selectedImages.length > 0 && (
            <div className="flex gap-2 mb-2 flex-wrap">
              {selectedImages.map((img, idx) => (
                <div key={idx} className="relative">
                  <img src={img} alt="预览" className="w-16 h-16 object-cover rounded" />
                  <button onClick={() => removeImage(idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs">×</button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={startVoiceInput} className={`px-4 py-2 rounded-lg ${isListening ? 'bg-red-500 text-white' : 'bg-gray-200'}`}>
              🎤
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-gray-200 rounded-lg">
              📷
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              className="hidden"
            />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage(input, selectedImages)}
              placeholder="输入您的问题..."
              className="flex-1 px-4 py-2 border rounded-lg"
            />
            <button onClick={() => sendMessage(input, selectedImages)} disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-400">
              发送
            </button>
          </div>
          {messages.length > 0 && (
            <button onClick={saveToHistory} className="mt-2 text-sm text-blue-600">保存到历史</button>
          )}
        </footer>
      )}
    </div>
  );
}
