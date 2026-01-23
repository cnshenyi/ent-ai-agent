/**
 * 优化后的医疗咨询输入组件
 * 应用了 frontend-design 和 web-design-guidelines 的最佳实践
 */

import { useState, useRef } from 'react';

export default function OptimizedChatInput() {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (!input.trim() && selectedImages.length === 0) return;
    console.log('发送消息:', input, selectedImages);
    setInput('');
    setSelectedImages([]);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-3 z-10">
      <div className="max-w-4xl mx-auto">
        {/* 图片预览 - 优化：添加了更好的视觉反馈 */}
        {selectedImages.length > 0 ? (
          <div className="flex gap-2 mb-2 flex-wrap" role="list" aria-label="已选择的图片">
            {selectedImages.map((img, idx) => (
              <div key={idx} className="relative" role="listitem">
                <img
                  src={img}
                  alt={`预览图片 ${idx + 1}`}
                  width={48}
                  height={48}
                  className="w-12 h-12 object-cover rounded-lg"
                />
                <button
                  onClick={() => setSelectedImages(prev => prev.filter((_, i) => i !== idx))}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-md hover:bg-red-600 transition-colors"
                  aria-label={`删除图片 ${idx + 1}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex gap-2 items-center">
          {/* 语音输入按钮 - 优化：添加了 aria-label */}
          <button
            onClick={() => setIsListening(!isListening)}
            className={`p-2 rounded-lg transition-all ${
              isListening ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            aria-label={isListening ? '停止语音输入' : '开始语音输入'}
            title={isListening ? '停止语音输入' : '开始语音输入'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>

          {/* 图片上传按钮 - 优化：添加了 aria-label */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
            aria-label="上传图片"
            title="上传图片"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>

          {/* 隐藏的文件输入 - 优化：添加了 label 关联 */}
          <label htmlFor="image-upload" className="sr-only">
            选择要上传的图片
          </label>
          <input
            id="image-upload"
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              const files = e.target.files;
              if (!files) return;
              Array.from(files).forEach(file => {
                const reader = new FileReader();
                reader.onload = (e) => {
                  const result = e.target?.result;
                  if (result && typeof result === 'string') {
                    setSelectedImages(prev => [...prev, result]);
                  }
                };
                reader.readAsDataURL(file);
              });
            }}
            className="hidden"
            aria-label="选择要上传的图片文件"
          />

          {/* 文本输入框 - 优化：添加了显式 label */}
          <div className="flex-1 relative">
            <label htmlFor="chat-input" className="sr-only">
              输入您的问题
            </label>
            <input
              id="chat-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="输入您的问题…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              aria-label="输入您的问题"
            />
          </div>

          {/* 发送按钮 - 优化：添加了禁用状态 */}
          <button
            onClick={handleSend}
            disabled={!input.trim() && selectedImages.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-400 hover:bg-blue-700 transition-colors font-medium text-sm shadow-md disabled:cursor-not-allowed"
            aria-label="发送消息"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * 优化说明：
 *
 * 1. ✅ 可访问性改进
 *    - 所有图标按钮添加了 aria-label
 *    - 输入框添加了显式 label（使用 sr-only 隐藏）
 *    - 图片列表添加了 role 和 aria-label
 *    - SVG 图标添加了 aria-hidden="true"
 *
 * 2. ✅ 性能优化
 *    - 使用三元运算符替代 && 进行条件渲染
 *    - 缓存了 e.target?.result 避免重复访问
 *
 * 3. ✅ 用户体验
 *    - 添加了 title 提示
 *    - 发送按钮在无内容时禁用
 *    - 改进了视觉反馈和过渡效果
 *
 * 4. ✅ 代码质量
 *    - 添加了详细的注释
 *    - 遵循了 React 最佳实践
 *    - 符合 Web Interface Guidelines
 */
