import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Smile, ChevronLeft, ChevronRight, Search, Feather, Loader2 } from 'lucide-react';
import { API_HOST } from '../config';

export default function WallGallery({ isStudy, userId }) {
    const [memories, setMemories] = useState([]);
    const [activePhoto, setActivePhoto] = useState(null);
    const [isFlipped, setIsFlipped] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [loading, setLoading] = useState(true);

    if (!isStudy) return null;

    useEffect(() => {
        // 动态获取后端地址 (带容错)
        const isPlus = window.plus || navigator.userAgent.indexOf("Html5Plus") > -1 || window.location.protocol === 'file:';
        const RAW_HOST = API_HOST.replace(/^https?:\/\//, '');
        const API_BASE = isPlus ? `http://${RAW_HOST}` : "";

        // 携带 userId 参数，实现用户隔离
        const url = `${API_BASE}/api/diary?user_id=${encodeURIComponent(userId || 'default')}`;
        console.log("🖼️ [Gallery] Loading:", url);

        fetch(url)
            .then(res => res.json())
            .then(data => {
                if (!Array.isArray(data)) {
                    console.warn("⚠️ [Gallery] 数据格式错误:", data);
                    setLoading(false);
                    return;
                }

                const formatted = data.map(item => {
                    // 🔥 2. 图片路径绝对化修复
                    let imgUrl = item.img;
                    // 如果有图片且不是 http 开头，并且我们在 App 环境 (或需要拼绝对路径)
                    if (imgUrl && !imgUrl.startsWith('http')) {
                        // 补全 /static 前面的 slash
                        if (!imgUrl.startsWith('/')) imgUrl = '/' + imgUrl;
                        // App 环境拼全路径，Web 环境如果 API_BASE 为空则保持相对路径
                        if (API_BASE) imgUrl = `${API_BASE}${imgUrl}`;
                    }

                    // 🔥 3. 日期格式化修复 (强力容错版)
                    let displayDate = "Unknown";
                    let dateObj = new Date(); // 默认为今天

                    if (item.date) {
                        try {
                            // 尝试直接解析
                            dateObj = new Date(item.date);

                            // 如果解析失败 (Invalid Date)，尝试手动拆解 YYYY-MM-DD
                            if (isNaN(dateObj.getTime())) {
                                const parts = item.date.split(/[- :]/); // 支持 - 或 : 或 空格分割
                                if (parts.length >= 3) {
                                    // 注意月份是从 0 开始的
                                    dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
                                }
                            }

                            // 如果解析成功，生成显示字符串
                            if (!isNaN(dateObj.getTime())) {
                                displayDate = `${String(dateObj.getMonth() + 1).padStart(2, '0')}.${String(dateObj.getDate()).padStart(2, '0')}`;
                            }
                        } catch (e) {
                            console.error("Date parse error:", e);
                        }
                    }

                    // 生成标准 YYYY-MM-DD 用于日历匹配
                    const isoDate = !isNaN(dateObj.getTime())
                        ? `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`
                        : item.date; // 兜底

                    return {
                        ...item,
                        img: imgUrl,
                        date: isoDate, // 更新为标准格式以便日历查找
                        displayDate: displayDate,
                        // 随机位置 (如果后端没给的话)
                        x_offset: item.x_offset || (Math.random() * 10 - 5),
                        y_offset: item.y_offset || (Math.random() * 10 - 5),
                        rotation: item.rotation || (Math.random() * 6 - 3)
                    };
                });

                console.log(`✅ [Gallery] Loaded ${formatted.length} photos`);
                setMemories(formatted);
                setLoading(false);
            })
            .catch(err => {
                console.error("❌ [Gallery] Error:", err);
                setLoading(false);
            });
    }, []);

    const latestMemory = memories.length > 0 ? memories[memories.length - 1] : null;

    // 空白日记逻辑
    const blankMemory = (dateStr) => ({
        id: 999, date: dateStr, displayDate: dateStr.slice(5).replace('-', '.'),
        img: null,
        summary: "这一页是空白的...\n生活不一定要填得满满当当，留白也是一种艺术。\n(Waiting for your story...)",
        mood: "neutral"
    });

    const frameStyle = { top: '38.5%', left: '73%', width: '9.5%', aspectRatio: '1 / 0.8' };

    const handleOpen = (memory) => { setActivePhoto(memory); setIsFlipped(false); setShowDatePicker(false); };
    const handleClose = () => { setActivePhoto(null); setIsFlipped(false); setShowDatePicker(false); };

    // 日历辅助函数
    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();
    const changeMonth = (delta) => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));

    const handleDateClick = (day) => {
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const found = memories.find(m => m.date === dateStr);
        handleOpen(found || blankMemory(dateStr));
    };

    const renderCalendarGrid = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);
        const days = [];

        for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="h-8 w-8" />);

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const hasMemory = memories.find(m => m.date === dateStr);

            days.push(
                <button
                    key={d}
                    onClick={() => handleDateClick(d)}
                    className={`aspect-square rounded-full flex items-center justify-center text-[10px] font-serif relative transition-colors
                    ${hasMemory ? 'bg-[#8d6e63] text-white font-bold' : 'hover:bg-[#8d6e63]/20 text-[#5d4037]'}`}>
                    {d}
                    {hasMemory && <span className="absolute bottom-0.5 w-0.5 h-0.5 bg-white rounded-full" />}
                </button>
            );
        }
        return days;
    };

    return (
        <>
            {/* === 墙面画框容器 === */}
            <div className="absolute z-40 group"
                style={{
                    top: frameStyle.top,
                    left: frameStyle.left,
                    width: frameStyle.width,
                    aspectRatio: frameStyle.aspectRatio,
                    transform: 'translate(-50%, -50%)'
                }}>

                {loading && <div className="absolute inset-0 flex items-center justify-center z-50"><Loader2 className="animate-spin text-[#8d6e63] w-4 h-4" /></div>}

                {/* 点击区域 */}
                <div className="w-full h-full relative cursor-pointer" onClick={() => latestMemory && handleOpen(latestMemory)}>

                    {/* 相框图层 */}
                    <img src="./assets/wall_frame.png" className="w-full h-full absolute inset-0 z-50 pointer-events-none" alt="frame" onError={(e) => e.target.style.display = 'none'} />

                    {/* 照片容器 */}
                    <div className="absolute inset-0 z-10 overflow-hidden" style={{ margin: '12%' }}>
                        {memories.slice(-3).map((mem) => (
                            <motion.div key={mem.id} layoutId={`photo-container-${mem.id}`}
                                className="absolute w-[92%] h-[88%] bg-[#fdfbf7] shadow-sm transition-transform duration-300 group-hover:scale-105 origin-center"
                                style={{
                                    top: '50%', left: '50%',
                                    transform: `translate(calc(-50% + ${mem.x_offset}%), calc(-50% + ${mem.y_offset}%)) rotate(${mem.rotation}deg)`,
                                    zIndex: mem.id, padding: '4%', paddingBottom: '10%'
                                }}>
                                <img src={mem.img} className="w-full h-full object-cover sepia-[.3]"
                                    onError={(e) => e.target.style.display = 'none'} />
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* 隐形点击区域 (打开日历) */}
                <div
                    className="absolute bottom-0 right-0 w-[35%] h-[35%] z-[60] cursor-pointer bg-transparent hover:bg-black/5 rounded-br-sm"
                    onClick={(e) => { e.stopPropagation(); setShowDatePicker(true); }}
                />
            </div>

            {/* === 弹窗 === */}
            <AnimatePresence>
                {(activePhoto || showDatePicker) && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6" onClick={handleClose}>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

                        {/* 日记卡片 (保持原样) */}
                        {activePhoto && !showDatePicker && (
                            <div className="relative z-10" style={{ width: '260px', height: '365px', perspective: '1000px' }}>
                                <motion.div
                                    layoutId={activePhoto.id !== 999 ? `photo-container-${activePhoto.id}` : undefined}
                                    initial={activePhoto.id === 999 ? { scale: 0.8, opacity: 0 } : false}
                                    animate={{ rotateY: isFlipped ? 180 : 0, scale: 1, opacity: 1 }}
                                    onClick={(e) => { e.stopPropagation(); setIsFlipped(!isFlipped); }}
                                    className="w-full h-full relative cursor-pointer"
                                    transition={{ duration: 0.6, type: "spring", stiffness: 200, damping: 20 }}
                                    style={{ transformStyle: 'preserve-3d' }}
                                >
                                    <div className="absolute inset-0 bg-[#fdfbf7] p-3 flex flex-col shadow-2xl rounded-sm backface-hidden" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
                                        <div className="flex-1 bg-gray-100 relative overflow-hidden border border-black/5 flex items-center justify-center">
                                            {activePhoto.img ?
                                                <img src={activePhoto.img} className="w-full h-full object-cover sepia-[.2]" /> :
                                                <div className="text-gray-300 flex flex-col items-center"><Search size={28} /><span className="text-[10px] mt-2 font-serif">无影像记录</span></div>}
                                        </div>
                                        <div className="h-[50px] flex justify-between items-end pb-1 px-1">
                                            <span className="text-xl text-[#5d4037]" style={{ fontFamily: 'serif' }}>{activePhoto.displayDate}</span>
                                            <span className="text-[9px] text-gray-400 font-serif opacity-60">⟳ Flip</span>
                                        </div>
                                    </div>
                                    {/* 背面文字 */}
                                    <div className="absolute inset-0 bg-[#fdfbf7] p-4 flex flex-col shadow-2xl rounded-sm backface-hidden" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)', backgroundImage: 'radial-gradient(#d7ccc8 1px, transparent 1px)', backgroundSize: '16px 16px' }}>
                                        <div className="h-[36px] flex justify-between items-center border-b border-[#8d6e63]/20 mb-2 pb-1">
                                            <span className="text-base font-bold text-[#5d4037]" style={{ fontFamily: 'serif' }}>{activePhoto.img ? "Dear Diary..." : "Ops..."}</span>
                                            {activePhoto.img ? <Sparkles size={16} className="text-yellow-500/80" /> : <Feather size={16} className="text-gray-400" />}
                                        </div>
                                        <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                                            <p className="text-[12px] text-[#4e342e] leading-6 tracking-wide whitespace-pre-wrap font-medium" style={{ fontFamily: 'serif' }}>{activePhoto.summary}</p>
                                        </div>
                                        <div className="h-[24px] mt-2 flex justify-end items-center gap-2 opacity-80">
                                            <span className="text-[9px] font-serif text-gray-500 italic">From Una</span>
                                            <Smile className="text-orange-400" size={16} />
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        )}

                        {/* 日历组件 */}
                        {showDatePicker && !activePhoto && (
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()}
                                className="relative w-full max-w-[260px] bg-[#fdfbf7] rounded-lg shadow-2xl p-4" style={{ backgroundImage: 'radial-gradient(#d7ccc8 1px, transparent 1px)', backgroundSize: '14px 14px' }}>
                                <div className="flex justify-between items-center mb-4">
                                    <button onClick={() => changeMonth(-1)} className="p-1 text-[#8d6e63] hover:bg-[#8d6e63]/10 rounded"><ChevronLeft size={18} /></button>
                                    <h3 className="text-base font-serif text-[#5d4037] font-bold">{currentDate.getFullYear()}年 {currentDate.getMonth() + 1}月</h3>
                                    <button onClick={() => changeMonth(1)} className="p-1 text-[#8d6e63] hover:bg-[#8d6e63]/10 rounded"><ChevronRight size={18} /></button>
                                </div>
                                <div className="grid grid-cols-7 gap-1 text-center mb-2">{['日', '一', '二', '三', '四', '五', '六'].map(d => <span key={d} className="text-[10px] font-serif text-gray-400">{d}</span>)}</div>
                                <div className="grid grid-cols-7 gap-1 place-items-center">{renderCalendarGrid()}</div>
                            </motion.div>
                        )}
                        <button onClick={handleClose} className="absolute top-6 right-6 text-white/70 hover:text-white p-2 z-20"><X size={28} /></button>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}