/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, FileText, Loader2, Copy, Download, Monitor, BookOpen, CheckCircle2, Settings, Key, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateStudyNote, ExamMode } from './services/geminiService';

export default function App() {
  const [images, setImages] = useState<string[]>([]);
  const [mimeTypes, setMimeTypes] = useState<string[]>([]);
  const [mode, setMode] = useState<ExamMode>('Internal');
  const [loading, setLoading] = useState(false);
  const [resultHtml, setResultHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean>(true);
  const [customApiKey, setCustomApiKey] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
      setCustomApiKey(savedKey);
    }
  }, []);

  const saveApiKey = (key: string) => {
    setCustomApiKey(key);
    localStorage.setItem('gemini_api_key', key);
    setShowSettings(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(processFile);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드 가능합니다.');
      return;
    }
    setError(null);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImages(prev => [...prev, result]);
      setMimeTypes(prev => [...prev, file.type]);
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) processFile(blob);
      }
    }
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files) {
      Array.from(files).forEach(processFile);
    }
  };

  useEffect(() => {
    const checkApiKey = async () => {
      if (window.aistudio && window.aistudio.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      }
    };
    checkApiKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio && window.aistudio.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const handleGenerate = async () => {
    if (images.length === 0) return;
    
    // Check for API key before generating
    if (window.aistudio && window.aistudio.hasSelectedApiKey) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey && !customApiKey) {
        await handleSelectKey();
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      const html = await generateStudyNote(images, mimeTypes, mode, customApiKey);
      // Clean up the response if it contains markdown code blocks
      const cleanedHtml = html.replace(/```html|```/g, '').trim();
      setResultHtml(cleanedHtml);
    } catch (err: any) {
      console.error(err);
      setError('필기 노트 생성 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (resultHtml) {
      navigator.clipboard.writeText(resultHtml);
      alert('HTML 코드가 클립보드에 복사되었습니다.');
    }
  };

  const downloadHtml = () => {
    if (resultHtml) {
      const blob = new Blob([resultHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `study-note-${mode}-${new Date().getTime()}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div 
      className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans selection:bg-emerald-100"
      onPaste={handlePaste}
    >
      {/* Header */}
      <header className="border-b border-black/5 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <BookOpen className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">영어 필기</h1>
            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">by Zoops</span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowSettings(true)}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
              title="설정"
            >
              <Settings className="w-5 h-5" />
            </button>
            {!hasApiKey && !customApiKey && (
              <button 
                onClick={handleSelectKey}
                className="text-xs bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg border border-amber-200 font-medium hover:bg-amber-100 transition-colors"
              >
                API 키 설정 필요
              </button>
            )}
            <div className="flex bg-[#F1F3F5] p-1 rounded-xl">
              <button 
                onClick={() => setMode('Internal')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${mode === 'Internal' ? 'bg-white shadow-sm text-emerald-700' : 'text-gray-500 hover:text-gray-700'}`}
              >
                내신 대비
              </button>
              <button 
                onClick={() => setMode('Mock')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${mode === 'Mock' ? 'bg-white shadow-sm text-emerald-700' : 'text-gray-500 hover:text-gray-700'}`}
              >
                모의고사
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid lg:grid-cols-2 gap-8 h-[calc(100vh-4rem)] overflow-hidden">
        {/* Left Column: Input */}
        <div className="flex flex-col gap-6 h-full min-h-0">
          <div className="flex-1 flex flex-col gap-4 min-h-0">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">지문 이미지 업로드</h2>
              <span className="text-xs text-gray-400">Ctrl+V로 붙여넣기 가능</span>
            </div>
            
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className={`flex-1 border-2 border-dashed rounded-2xl transition-all flex flex-col items-center justify-center p-4 text-center relative overflow-hidden ${images.length > 0 ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/10'}`}
            >
              {images.length > 0 ? (
                <div className="w-full h-full flex flex-col gap-4">
                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <div className="grid grid-cols-2 gap-4">
                      {images.map((img, idx) => (
                        <div key={idx} className="relative aspect-[3/4] group border border-emerald-100 rounded-lg overflow-hidden bg-white">
                          <img src={img} alt={`Uploaded ${idx}`} className="w-full h-full object-contain" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button 
                              onClick={() => {
                                setImages(prev => prev.filter((_, i) => i !== idx));
                                setMimeTypes(prev => prev.filter((_, i) => i !== idx));
                              }}
                              className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 shadow-lg"
                              title="삭제"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                          <div className="absolute top-2 left-2 bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                            {idx + 1}
                          </div>
                        </div>
                      ))}
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-[3/4] border-2 border-dashed border-emerald-200 rounded-lg flex flex-col items-center justify-center gap-2 hover:bg-emerald-50 transition-colors text-emerald-600"
                      >
                        <Upload className="w-6 h-6" />
                        <span className="text-xs font-medium">추가하기</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                    <Upload className="text-emerald-600 w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-lg font-medium">이미지를 드래그하거나 클릭하세요</p>
                    <p className="text-sm text-gray-500 mt-1">시험지나 지문 스크린샷 (PNG, JPG)</p>
                  </div>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
                  >
                    파일 선택
                  </button>
                </div>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*"
                multiple
              />
            </div>
          </div>

          <button 
            onClick={handleGenerate}
            disabled={images.length === 0 || loading}
            className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-xl flex-shrink-0 ${images.length === 0 || loading ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200 active:scale-[0.98]'}`}
          >
            {loading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                AI가 필기 노트를 생성 중입니다...
              </>
            ) : (
              <>
                <FileText className="w-6 h-6" />
                필기 노트 생성하기
              </>
            )}
          </button>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex items-center gap-2">
              <span className="font-bold">!</span> {error}
            </div>
          )}
        </div>

        {/* Right Column: Preview */}
        <div className="flex flex-col gap-6 overflow-hidden">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">필기 노트 미리보기</h2>
            <div className="flex items-center gap-2">
              {resultHtml && (
                <>
                  <button 
                    onClick={copyToClipboard}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                    title="코드 복사"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={downloadHtml}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                    title="HTML 다운로드"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex-1 bg-white border border-black/5 rounded-2xl shadow-inner overflow-hidden relative">
            <AnimatePresence mode="wait">
              {resultHtml ? (
                <motion.iframe
                  key="preview"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  srcDoc={resultHtml}
                  className="w-full h-full border-none"
                  title="Study Note Preview"
                />
              ) : (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-full h-full flex flex-col items-center justify-center p-12 text-center text-gray-400"
                >
                  <Monitor className="w-12 h-12 mb-4 opacity-20" />
                  <p>생성된 결과가 여기에 표시됩니다.</p>
                  <p className="text-sm mt-2">왼쪽에서 이미지를 업로드하고 버튼을 눌러주세요.</p>
                </motion.div>
              )}
            </AnimatePresence>
            
            {loading && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-4">
                <div className="relative">
                  <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2 h-2 bg-emerald-600 rounded-full" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-emerald-900">지문을 분석하고 있습니다</p>
                  <p className="text-xs text-emerald-600/60 mt-1">잠시만 기다려 주세요...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer / Features */}
      <footer className="max-w-7xl mx-auto px-6 py-8 border-t border-black/5">
        <div className="flex items-center justify-center text-gray-500 text-sm gap-2">
          <span>© 2026</span>
          <span className="font-bold text-gray-900">Zoops</span>
          <span className="text-gray-300">|</span>
          <span>Created by</span>
          <span className="font-bold text-emerald-600">Zoops</span>
        </div>
      </footer>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-lg">API 설정</h3>
                </div>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gemini API Key</label>
                  <input 
                    type="password"
                    value={customApiKey}
                    onChange={(e) => setCustomApiKey(e.target.value)}
                    placeholder="API 키를 입력하세요"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  />
                  <p className="text-[11px] text-gray-400 mt-2">
                    입력하신 API 키는 브라우저의 로컬 스토리지에 안전하게 저장됩니다.
                  </p>
                </div>
                <button 
                  onClick={() => saveApiKey(customApiKey)}
                  className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                >
                  저장하기
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
