import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Volume2 } from 'lucide-react';

export default function DiaryBook({ messages, onClose, playAudio }) {
  const scrollRef = useRef(null);
  
  useEffect(() => {
    if(scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative max-w-[1200px] shadow-[0_15px_45px_rgba(0,0,0,0.8)] rounded-sm flex overflow-hidden"
      style={{
         // 🔥 你专属的完美比例已经焊死
         width: '43%',
         aspectRatio: '0.9 / 1',
         
         backgroundColor: '#f2eae0', 
         backgroundImage: `
            linear-gradient(to right, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.05) 4%, transparent 8%),
            repeating-linear-gradient(transparent, transparent 23px, rgba(141, 110, 99, 0.2) 23px, rgba(141, 110, 99, 0.2) 24px)
         `,
         backgroundSize: '100% 100%, 100% 24px',
         backgroundPosition: '0 0, 0 8px',
         fontFamily: '"LXGW WenKai", "Caveat", "STKaiti", "KaiTi", "楷体", "Biaodian Pro Sans", cursive',
         color: '#2a1f1a' 
      }}
    >
      <div className="absolute left-10 top-0 bottom-0 w-[1px] bg-red-800/30 z-0"></div>

      <button onClick={onClose} className="absolute top-2 right-3 z-20 text-[#5d4037]/50 hover:text-[#5d4037] transition-all hover:rotate-90">
        <X size={18} strokeWidth={1.5} />
      </button>

      <div ref={scrollRef} className="flex-1 overflow-y-auto pl-[55px] pr-8 py-6 custom-scrollbar relative z-10 scroll-smooth">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center opacity-40 text-sm tracking-widest">
            空白的纸页...
          </div>
        ) : (
          <div className="space-y-4 pb-8">
            {messages.map((msg, idx) => (
              <div key={idx} className="relative group">
                <div className="absolute -left-12 top-0.5 flex flex-col items-center gap-1.5 opacity-50 transition-opacity duration-300 group-hover:opacity-100">
                  <span className="text-[9px] text-[#705042] -rotate-3 select-none tracking-widest">
                    {msg.date?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                  {msg.isAI && msg.audio_url && (
                      <button onClick={() => playAudio(msg.audio_url)} className="bg-[#d7ccc8]/40 hover:bg-[#8d6e63]/30 text-[#4e342e] p-1.5 rounded-full border border-[#8d6e63]/30 shadow-sm transition-all active:scale-90" title="播放这段语音">
                          <Volume2 size={10} />
                      </button>
                  )}
                </div>
                <p className="text-[13px] leading-[24px] tracking-wide" style={{ textIndent: msg.isAI ? '0' : '2em', opacity: msg.isAI ? 0.95 : 0.7 }}>
                  {msg.isAI ? '' : '「'}{msg.text}{msg.isAI ? '' : '」'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}