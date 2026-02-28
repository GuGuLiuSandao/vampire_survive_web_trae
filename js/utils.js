// 工具函数模块

/**
 * 资源管理器 - 解决重复创建 Image 导致的卡顿问题
 */
export const ResourceManager = {
    cache: {},
    
    getImage(src) {
        if (!this.cache[src]) {
            const img = new Image();
            img.src = src;
            this.cache[src] = img;
        }
        return this.cache[src];
    },

    // 预加载关键图片
    preload() {
        const paths = [
            'resources/enemy_evil_dog_left.png', 'resources/enemy_evil_dog_stand_right.png',
            'resources/enemy_evil_dog_walk_left.png', 'resources/enemy_evil_dog_walk_right.png',
            'resources/enemy_tank_interno_stand_left.png', 'resources/enemy_tank_interno_stand_right.png',
            'resources/enemy_tank_interno_walk_left.png', 'resources/enemy_tank_interno_walk_right.png',
            'resources/player_druid_stand_left.png', 'resources/player_druid_stand_right.png',
            'resources/player_druid_walk_left.png', 'resources/player_druid_walk_right.png',
            'resources/skill_anger_frame_1.png', 'resources/skill_anger_frame_2.png',
            'resources/skill_moonfire_frame_1.png', 'resources/skill_moonfire_frame_2.png',
            'resources/skill_starfire_frame_1.png', 'resources/skill_starfire_frame_2.png',
            'resources/skill_starfire_frame_3.png',
            'resources/skill_starsurge_frame_1.png', 'resources/skill_starsurge_frame_2.png'
        ];
        paths.forEach(p => this.getImage(p));
    }
};

/**
 * 计算两点之间的距离
 */
export function distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 计算两点之间的角度（弧度）
 */
export function angleBetween(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1);
}

/**
 * 检查两个矩形是否碰撞（优化版：基于中心点和collisionSize）
 */
export function checkCollision(rect1, rect2) {
    // 计算中心点
    const r1cx = rect1.x + rect1.width / 2;
    const r1cy = rect1.y + rect1.height / 2;
    const r2cx = rect2.x + rect2.width / 2;
    const r2cy = rect2.y + rect2.height / 2;

    // 获取碰撞体积大小（如果没有定义 collisionSize 则使用 width/2 作为半径）
    const r1w = (rect1.collisionSize || rect1.width) / 2; // 转换为半径
    const r1h = (rect1.collisionSize || rect1.height) / 2; // 转换为半径
    const r2w = (rect2.collisionSize || rect2.width) / 2; // 转换为半径
    const r2h = (rect2.collisionSize || rect2.height) / 2; // 转换为半径

    // AABB 碰撞检测 - 正确的逻辑：中心点距离 < 半径之和
    return Math.abs(r1cx - r2cx) < (r1w + r2w) &&
           Math.abs(r1cy - r2cy) < (r1h + r2h);
}

/**
 * 随机生成指定范围内的整数
 */
export function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

/**
 * 随机生成指定范围内的浮点数
 */
export function randomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * 限制数值在指定范围内
 */
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * 线性插值
 */
export function lerp(a, b, t) {
    return a + (b - a) * t;
}

/**
 * 将角度转换为弧度
 */
export function degreesToRadians(degrees) {
    return degrees * Math.PI / 180;
}

/**
 * 将弧度转换为角度
 */
export function radiansToDegrees(radians) {
    return radians * 180 / Math.PI;
}

/**
 * 获取随机颜色
 */
export function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

/**
 * 格式化时间（秒）为 MM:SS 格式
 */
export function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 深拷贝对象
 */
export function deepCopy(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    if (obj instanceof Date) {
        return new Date(obj.getTime());
    }
    if (obj instanceof Array) {
        return obj.map(item => deepCopy(item));
    }
    if (typeof obj === 'object') {
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepCopy(obj[key]);
            }
        }
        return clonedObj;
    }
}

/**
 * 防抖函数
 */
export function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * 节流函数
 */
export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}