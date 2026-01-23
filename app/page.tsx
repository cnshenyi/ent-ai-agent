'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import VoiceWaveform from '@/components/VoiceWaveform';

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
  const [isProcessingSpeech, setIsProcessingSpeech] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [darkMode, setDarkMode] = useState(false);
  const [showDoctorProfile, setShowDoctorProfile] = useState(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('currentChat');
    if (saved) setMessages(JSON.parse(saved));

    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode) setDarkMode(JSON.parse(savedDarkMode));

    // Force clear old cache and update service worker
    const APP_VERSION = '3.2.0'; // Update this to force cache clear
    const currentVersion = localStorage.getItem('appVersion');

    if (currentVersion !== APP_VERSION) {
      console.log('New version detected, clearing caches...');

      // Clear all caches
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            console.log('Deleting cache:', name);
            caches.delete(name);
          });
        });
      }

      // Unregister all service workers
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(registration => {
            console.log('Unregistering service worker');
            registration.unregister();
          });
        });
      }

      // Save new version and reload
      localStorage.setItem('appVersion', APP_VERSION);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      return;
    }

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration);

          // Check for updates every time the page loads
          registration.update();

          // Listen for new service worker
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New service worker available, reload to activate
                  console.log('New version available! Reloading...');
                  window.location.reload();
                }
              });
            }
          });
        })
        .catch((error) => {
          console.log('Service Worker registration failed:', error);
        });
    }
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

  const startVoiceInput = async () => {
    if (isListening) {
      // Stop recording
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      mediaRecorderRef.current?.stop();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);

      // Setup audio analysis for voice activity detection
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);

      recorder.onstop = async () => {
        setIsListening(false);
        setAudioStream(null);
        stream.getTracks().forEach(t => t.stop());
        audioContext.close();

        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }

        // Show processing state
        setIsProcessingSpeech(true);

        const blob = new Blob(chunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', blob, 'audio.webm');

        try {
          const res = await fetch('/api/speech', { method: 'POST', body: formData });
          const data = await res.json();
          console.log('Speech response:', res.status, data);
          if (data.text) setInput(data.text);
          else alert(data.error || '语音识别失败');
        } catch (err) {
          console.error('Speech error:', err);
          alert('语音识别服务暂时不可用');
        } finally {
          setIsProcessingSpeech(false);
        }
      };

      // Voice activity detection
      const checkVoiceActivity = () => {
        if (!analyser || !isListening) return;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        // Calculate average volume
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;

        // If voice detected (volume above threshold), reset silence timer
        if (average > 10) {
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }
          silenceTimerRef.current = setTimeout(() => {
            // Auto-stop after 5 seconds of silence
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              mediaRecorderRef.current.stop();
            }
          }, 5000);
        }

        // Continue checking
        if (isListening) {
          setTimeout(checkVoiceActivity, 100);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsListening(true);

      // Start voice activity detection
      setTimeout(checkVoiceActivity, 100);
    } catch {
      alert('无法访问麦克风');
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      // 限制图片大小为 5MB
      if (file.size > 5 * 1024 * 1024) {
        alert('图片太大，请选择小于 5MB 的图片');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;

        // 压缩图片
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // 限制最大尺寸为 1024px
          const maxSize = 1024;
          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = (height / width) * maxSize;
              width = maxSize;
            } else {
              width = (width / height) * maxSize;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          // 白色背景（处理透明图片）
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // 转换为 JPEG，质量 0.7
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          setSelectedImages(prev => [...prev, compressedBase64]);
        };
        img.src = base64;
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

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', JSON.stringify(newMode));
  };

  const symptomQuestions = [
    '您有哪些症状？',
    '症状持续多久了？',
    '是否有发热？',
    '是否影响听力？',
  ];

  return (
    <div className={`flex flex-col h-screen ${darkMode ? 'dark' : ''}`}>
      <div className="flex flex-col h-screen bg-gradient-to-b from-blue-50 to-gray-50 dark:from-gray-900 dark:to-gray-800">
      <header className="fixed top-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-800 dark:to-blue-900 text-white p-3 sm:p-4 shadow-lg z-10">
        <div className="flex items-center justify-between gap-2 sm:gap-3 max-w-4xl mx-auto">
          <button onClick={() => setShowDoctorProfile(true)} className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity">
            <img src="https://img1.dxycdn.com/2021/1228/997/0828727527046333253-126.png" alt="许庚医生" className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-white/30" />
            <div className="text-left">
              <h1 className="text-lg sm:text-xl font-bold">许庚教授</h1>
              <p className="text-xs sm:text-sm opacity-90">中国鼻内镜外科学创始人</p>
            </div>
          </button>
          <div className="flex items-center gap-2">
            <button onClick={toggleDarkMode} className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors" title={darkMode ? "切换到浅色模式" : "切换到深色模式"}>
              {darkMode ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            {view === 'chat' && (
              <button
                onClick={saveToHistory}
                disabled={messages.length === 0}
                className={`p-2 rounded-lg transition-colors ${messages.length > 0 ? 'bg-white/20 hover:bg-white/30' : 'bg-white/10 opacity-50 cursor-not-allowed'}`}
                title={messages.length > 0 ? "保存到历史" : "暂无消息可保存"}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </header>

      <nav className="fixed top-[68px] sm:top-[80px] left-0 right-0 flex bg-white dark:bg-gray-800 border-b dark:border-gray-700 shadow-sm z-10">
        <button onClick={() => setView('chat')} className={`flex-1 py-3 text-sm sm:text-base font-medium transition-colors ${view === 'chat' ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-gray-700 border-b-2 border-blue-600 dark:border-blue-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>咨询</button>
        <button onClick={() => setView('symptom')} className={`flex-1 py-3 text-sm sm:text-base font-medium transition-colors ${view === 'symptom' ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-gray-700 border-b-2 border-blue-600 dark:border-blue-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>症状</button>
        <button onClick={() => setView('history')} className={`flex-1 py-3 text-sm sm:text-base font-medium transition-colors ${view === 'history' ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-gray-700 border-b-2 border-blue-600 dark:border-blue-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>历史</button>
      </nav>

      <main className="flex-1 overflow-y-auto px-3 sm:px-4 pb-3 sm:pb-4 pt-[164px] sm:pt-[148px] mb-[60px]">
        {view === 'chat' && (
          <div className="space-y-3 sm:space-y-4 max-w-4xl mx-auto pt-6">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] sm:max-w-[75%] p-3 rounded-2xl ${msg.role === 'user' ? 'bg-blue-600 dark:bg-blue-700 text-white shadow-md' : 'bg-white dark:bg-gray-700 shadow-md'}`}>
                  {msg.images && msg.images.length > 0 && (
                    <div className="flex gap-2 mb-2 flex-wrap">
                      {msg.images.map((img, idx) => (
                        <img key={idx} src={img} alt="患者图片" className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg" />
                      ))}
                    </div>
                  )}
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none text-gray-800 dark:text-gray-200 dark:prose-invert">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="text-sm sm:text-base">{msg.content}</div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-700 shadow-md p-3 rounded-2xl flex items-center gap-2">
                  <span className="text-gray-700 dark:text-gray-200 text-sm font-medium">正在回复</span>
                  <div className="flex gap-1.5 items-center">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce shadow-lg shadow-indigo-500/50" style={{ animationDelay: '0ms', animationDuration: '1s' }}></span>
                    <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce shadow-lg shadow-purple-500/50" style={{ animationDelay: '150ms', animationDuration: '1s' }}></span>
                    <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce shadow-lg shadow-cyan-500/50" style={{ animationDelay: '300ms', animationDuration: '1s' }}></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {view === 'symptom' && (
          <div className="space-y-3 max-w-2xl mx-auto">
            <h2 className="text-lg sm:text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">症状自查</h2>
            {symptomQuestions.map((q, i) => (
              <button key={i} onClick={() => { setView('chat'); sendMessage(q); }} className="w-full p-4 bg-white dark:bg-gray-700 rounded-xl shadow-sm text-left hover:shadow-md transition-shadow text-sm sm:text-base text-gray-700 dark:text-gray-200">
                {q}
              </button>
            ))}
          </div>
        )}

        {view === 'history' && (
          <div className="space-y-3 max-w-2xl mx-auto">
            <h2 className="text-lg sm:text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">就诊历史</h2>
            {JSON.parse(localStorage.getItem('chatHistory') || '[]').map((session: ChatSession) => (
              <div key={session.id} onClick={() => loadHistory(session)} className="p-4 bg-white dark:bg-gray-700 rounded-xl shadow-sm cursor-pointer hover:shadow-md transition-shadow">
                <div className="font-semibold text-gray-800 dark:text-gray-200 text-sm sm:text-base">{session.date}</div>
                <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">{session.messages.length} 条消息</div>
              </div>
            ))}
          </div>
        )}
      </main>

      {view === 'chat' && (
        <footer className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t dark:border-gray-700 shadow-lg z-10" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          <div className="max-w-4xl mx-auto px-3 pt-2 sm:px-4 sm:pt-3">
            {selectedImages.length > 0 && (
              <div className="flex gap-2 mb-2 flex-wrap">
                {selectedImages.map((img, idx) => (
                  <div key={idx} className="relative">
                    <img src={img} alt="预览" className="w-14 h-14 sm:w-20 sm:h-20 object-cover rounded-lg shadow-sm" />
                    <button onClick={() => removeImage(idx)} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-md hover:bg-red-600 transition-colors">×</button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-1.5 sm:gap-2 items-center pb-2">
              <button
                onClick={startVoiceInput}
                className={`p-2.5 sm:p-3 rounded-xl transition-all flex-shrink-0 ${isListening ? 'bg-red-500 text-white' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50'}`}
                title="语音输入"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />

              {isListening ? (
                <VoiceWaveform isActive={isListening} audioStream={audioStream} />
              ) : isProcessingSpeech ? (
                <div className="flex-1 flex items-center justify-center gap-2 bg-blue-50 dark:bg-gray-700 rounded-xl px-4 py-3 border border-blue-200 dark:border-gray-600">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                  <span className="text-sm text-blue-600 dark:text-blue-400">识别中...</span>
                </div>
              ) : (
                <div className="flex-1 flex items-center gap-1 sm:gap-2 bg-gray-50 dark:bg-gray-700 rounded-xl px-3 sm:px-4 py-2 border border-gray-200 dark:border-gray-600 focus-within:border-blue-500 dark:focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-200 dark:focus-within:ring-blue-800 transition-all min-w-0">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !loading && sendMessage(input, selectedImages)}
                    placeholder="输入您的问题..."
                    className="flex-1 bg-transparent outline-none text-sm sm:text-base text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 min-w-0"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1 sm:p-1.5 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors flex-shrink-0"
                    title="添加图片"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              )}

              <button
                onClick={() => sendMessage(input, selectedImages)}
                disabled={loading || (!input.trim() && selectedImages.length === 0)}
                className="p-2.5 sm:p-3 bg-blue-600 dark:bg-blue-700 text-white rounded-xl disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:text-gray-500 dark:disabled:text-gray-400 hover:bg-blue-700 dark:hover:bg-blue-600 transition-all flex-shrink-0"
                title="发送"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </footer>
      )}

      {/* Doctor Profile Modal */}
      {showDoctorProfile && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowDoctorProfile(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-800 dark:to-blue-900 text-white p-4 sm:p-6 rounded-t-2xl">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <img src="https://img1.dxycdn.com/2021/1228/997/0828727527046333253-126.png" alt="许庚医生" className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-3 border-white/30" />
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold mb-1">许庚</h2>
                    <p className="text-sm sm:text-base opacity-90">主任医师 · 教授 · 博士生导师</p>
                  </div>
                </div>
                <button onClick={() => setShowDoctorProfile(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-6">
              {/* Basic Info */}
              <section>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  基本信息
                </h3>
                <div className="ml-7 space-y-2 text-gray-700 dark:text-gray-300">
                  <p><span className="font-semibold">学历：</span>白求恩医科大学 医学博士</p>
                  <p><span className="font-semibold">职称：</span>中山大学教授、博士生导师</p>
                  <p><span className="font-semibold">现任：</span>中山大学附属第一医院耳鼻咽喉科医院院长、耳鼻咽喉科学研究所所长</p>
                  <p className="text-blue-600 dark:text-blue-400 font-semibold">中国鼻内镜外科学创始人</p>
                </div>
              </section>

              {/* Career Milestones */}
              <section>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                  重要成就与里程碑
                </h3>
                <ul className="space-y-2 ml-7 text-gray-700 dark:text-gray-300 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1 font-bold">1979</span>
                    <span>师从卜国铉教授从事鼻变态反应研究，首次建立变应性鼻炎致渗出性中耳炎动物模型</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1 font-bold">1986</span>
                    <span>国内首次完成人鼻黏膜纤毛系统研究，发生学与分布研究为国际首次报告</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1 font-bold">1990</span>
                    <span>率先在国内开展经鼻内镜鼻窦手术</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1 font-bold">1994</span>
                    <span>出版国内首部《内窥镜鼻窦外科学》</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1 font-bold">1995-2002</span>
                    <span>举办国际性和全国性鼻内镜手术培训班28期，培养专业人员超过3000人次</span>
                  </li>
                </ul>
              </section>

              {/* Research Achievements */}
              <section>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  科研成果
                </h3>
                <div className="ml-7 space-y-2 text-gray-700 dark:text-gray-300 text-sm">
                  <p>• 发表学术论文90余篇</p>
                  <p>• 主持国家杰出青年基金等科研项目11项</p>
                  <p>• 获国家教委、广东省等科技进步奖9项</p>
                </div>
              </section>

              {/* Social Positions */}
              <section>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  社会职务
                </h3>
                <ul className="space-y-2 ml-7 text-gray-700 dark:text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>中华医学会广东省耳鼻喉科分会主任委员</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>国际鼻科学会主席</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>中华耳鼻咽喉科学会全国鼻内窥镜外科学组组长</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>《中华耳鼻咽喉科杂志》等8本医学专业杂志编委</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>国家自然科学基金委员会评审专家</span>
                  </li>
                </ul>
              </section>

              {/* Honors */}
              <section>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  荣誉称号
                </h3>
                <div className="ml-7 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm">1996年全国中青年医学科技之星</span>
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm">1998年突出贡献中青年专家</span>
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm">深圳·鼻炎·全国专病名医榜</span>
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm">2022年度专科好医生榜</span>
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm">广州·五官科·同行点赞Top10</span>
                  </div>
                </div>
              </section>

              {/* Specialties */}
              <section>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  擅长领域
                </h3>
                <div className="ml-7 space-y-3">
                  <div>
                    <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">疾病诊治</h4>
                    <div className="flex flex-wrap gap-2">
                      {['鼻窦炎', '鼻中隔偏曲', '鼻息肉', '鼻甲肥大', '鼻炎', '鼻肿瘤', '过敏性鼻炎'].map(disease => (
                        <span key={disease} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm">{disease}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">手术项目</h4>
                    <ul className="space-y-1 text-gray-700 dark:text-gray-300 text-sm">
                      <li>• 鼻窦炎鼻内镜手术</li>
                      <li>• 鼻中隔偏曲矫正手术</li>
                      <li>• 鼻息肉微创手术</li>
                      <li>• 脑脊液耳鼻漏修补术</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">专业方向</h4>
                    <p className="text-gray-700 dark:text-gray-300 text-sm">鼻内镜微创外科（包括内窥镜鼻窦外科、鼻眼相关外科、鼻颅底外科）</p>
                  </div>
                </div>
              </section>

              {/* Practice Locations */}
              <section>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  出诊信息
                </h3>
                <div className="ml-7 space-y-3">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                    <p className="font-semibold text-blue-700 dark:text-blue-300 mb-1">中山大学附属第一医院</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">出诊时间：每周四上午</p>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <p className="font-semibold mb-1">其他执业地点：</p>
                    <ul className="space-y-1">
                      <li>• 仁树眼耳鼻喉（全国连锁·深圳）</li>
                      <li>• 仁树眼耳鼻喉（全国连锁·广州）</li>
                      <li>• 深圳市龙岗区耳鼻咽喉医院</li>
                    </ul>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
