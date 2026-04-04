export function calculateOfflineTime(lastSeenStr) {
    if (!lastSeenStr) return 0;
    
    // 1. 将数据库的时间字符串 (可能是 UTC) 转为本地时间对象
    // append 'Z' if it's missing to force UTC interpretation (common fix)
    const lastSeenDate = new Date(lastSeenStr.endsWith('Z') ? lastSeenStr : lastSeenStr + 'Z');
    
    // 2. 获取当前本地时间
    const now = new Date();
    
    // 3. 计算差值 (毫秒)
    const diffMs = now - lastSeenDate;
    
    // 4. 转为小时，保留1位小数
    const diffHours = (diffMs / (1000 * 60 * 60)).toFixed(1);
    
    return Math.max(0, diffHours); // 不允许负数
}