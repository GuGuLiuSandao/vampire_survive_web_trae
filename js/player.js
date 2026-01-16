// 玩家系统

import { clamp } from './utils.js';
import { Weapon } from './weapon.js';

class Player {
    constructor(x, y) {
        // 位置和尺寸
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        
        // 移动相关
        this.speed = 140; // 降低移动速度
        this.direction = { x: 0, y: 0 };
        
        // 状态
        this.health = 80;
        this.maxHealth = 80; // 降低初始最大生命值
        this.exp = 0;
        this.level = 1;
        this.expRequired = 120; // 增加升级所需经验值
        this.expFactor = 1.6; // 增加每级所需经验值增长因子
        
        // 武器系统
        this.weapons = [];
        
        // 渲染相关
        this.color = '#00ff00';
        this.rotation = 0;
        
        // 为玩家添加初始武器（鞭子）
        this.addWeapon('whip');
    }
    
    update(keys, deltaTime, canvas) {
        // 更新移动方向
        this.updateDirection(keys);
        
        // 移动玩家
        this.move(deltaTime, canvas);
    }
    
    updateDirection(keys) {
        // 重置方向
        this.direction.x = 0;
        this.direction.y = 0;
        
        // 检查键盘输入
        if (keys['KeyW'] || keys['ArrowUp']) {
            this.direction.y = -1;
        }
        if (keys['KeyS'] || keys['ArrowDown']) {
            this.direction.y = 1;
        }
        if (keys['KeyA'] || keys['ArrowLeft']) {
            this.direction.x = -1;
        }
        if (keys['KeyD'] || keys['ArrowRight']) {
            this.direction.x = 1;
        }
        
        // 归一化方向向量（斜向移动速度相同）
        const magnitude = Math.sqrt(this.direction.x * this.direction.x + this.direction.y * this.direction.y);
        if (magnitude > 0) {
            this.direction.x /= magnitude;
            this.direction.y /= magnitude;
        }
    }
    
    move(deltaTime, canvas) {
        // 计算移动距离
        const moveX = this.direction.x * this.speed * deltaTime;
        const moveY = this.direction.y * this.speed * deltaTime;
        
        // 更新位置
        this.x += moveX;
        this.y += moveY;
        
        // 限制在画布范围内
        this.x = clamp(this.x, 0, canvas.width - this.width);
        this.y = clamp(this.y, 0, canvas.height - this.height);
    }
    
    render(ctx) {
        // 保存当前上下文状态
        ctx.save();
        
        // 绘制玩家
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // 绘制玩家中心标记
        ctx.fillStyle = '#000';
        ctx.fillRect(this.x + this.width / 2 - 2, this.y + this.height / 2 - 2, 4, 4);
        
        // 恢复上下文状态
        ctx.restore();
        
        // 渲染武器
        this.weapons.forEach(weapon => {
            weapon.render(ctx, this);
        });
    }
    
    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);
    }
    
    gainExp(amount) {
        this.exp += amount;
    }
    
    shouldLevelUp() {
        return this.exp >= this.expRequired;
    }
    
    levelUp() {
        // 升级
        this.level++;
        
        // 扣除升级所需经验值
        this.exp -= this.expRequired;
        
        // 计算下一级所需经验值
        this.expRequired = Math.floor(this.expRequired * this.expFactor);
        
        // 增加最大生命值
        this.maxHealth += 10;
        this.health = this.maxHealth; // 升级时恢复满血
    }
    
    addWeapon(weaponType) {
        // 检查是否已经拥有该武器
        let weapon = this.weapons.find(w => w.type === weaponType);
        
        if (weapon) {
            // 升级现有武器
            weapon.levelUp();
        } else {
            // 添加新武器
            weapon = new Weapon(weaponType);
            this.weapons.push(weapon);
        }
    }
}

export { Player };