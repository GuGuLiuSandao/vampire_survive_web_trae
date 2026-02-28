// 敌人系统

import { ResourceManager, randomInt, distance, angleBetween, randomFloat } from './utils.js';

class Enemy {
    constructor(x, y, type = 'basic') {
        this.x = x;
        this.y = y;
        this.width = 36; 
        this.height = 36;
        this.collisionSize = 20; 
        
        this.type = type;
        this.initType();
        
        // [修复] 保存基础速度
        this.baseSpeed = this.speed; 
        
        this.direction = { x: 0, y: 0 };
        this.facing = 'right';
        this.animationFrame = 0;
        this.isWalkingFrame = false;
        
        // 月火术灼烧效果
        this.isMoonfireBurning = false;
        this.moonfireBurnStartTime = 0;
        this.moonfireBurnDuration = 0;

        // 使用资源管理器加载图片
        const isTank = type === 'tank' || type === 'strong';
        const prefix = isTank ? 'resources/enemy_tank_interno_' : 'resources/enemy_evil_dog_';
        
        this.images = {
            stand: {
                left: ResourceManager.getImage(prefix + (isTank ? 'stand_left.png' : 'left.png')),
                right: ResourceManager.getImage(prefix + (isTank ? 'stand_right.png' : 'stand_right.png'))
            },
            walk: {
                left: ResourceManager.getImage(prefix + (isTank ? 'walk_left.png' : 'walk_left.png')),
                right: ResourceManager.getImage(prefix + (isTank ? 'walk_right.png' : 'walk_right.png'))
            }
        };
        
        this.currentImage = this.images.stand.right;
    }
    
    initType() {
        this.health = 15;
        this.maxHealth = 15;
        this.speed = 40;
        this.damage = 5;
        this.expReward = 10;
        this.scoreReward = 10;
        
        if (this.type === 'fast') { 
            this.speed = 70; 
            this.health = 8; 
            this.maxHealth = 8; // [修复] 同步更新最大生命值
        }
        if (this.type === 'tank') { 
            this.health = 50; 
            this.speed = 20; 
            this.width = 48; 
            this.height = 48; 
            this.maxHealth = 50; // [修复] 同步更新最大生命值
        }
    }
    
    update(player, deltaTime) {
        // AI: 追踪玩家
        const dx = (player.x + player.width/2) - (this.x + this.width/2);
        const dy = (player.y + player.height/2) - (this.y + this.height/2);
        const angle = Math.atan2(dy, dx);
        
        this.x += Math.cos(angle) * this.speed * deltaTime;
        this.y += Math.sin(angle) * this.speed * deltaTime;
        
        // 面向
        if (Math.cos(angle) > 0) this.facing = 'right';
        else this.facing = 'left';
        
        // 动画
        this.animationFrame += deltaTime;
        if (this.animationFrame > 0.2) {
            this.animationFrame = 0;
            this.isWalkingFrame = !this.isWalkingFrame;
        }

        // [修复] 每一帧结束时，将速度重置为基础速度
        // 下一帧的减速效果由 game.js 中的蘑菇逻辑重新计算
        this.speed = this.baseSpeed;
        
        // 更新月火灼烧效果
        if (this.isMoonfireBurning) {
            const currentTime = Date.now();
            if (currentTime - this.moonfireBurnStartTime > this.moonfireBurnDuration) {
                this.isMoonfireBurning = false;
            }
        }
    }
    
    // 设置月火灼烧效果
    setMoonfireBurn(duration) {
        this.isMoonfireBurning = true;
        this.moonfireBurnStartTime = Date.now();
        this.moonfireBurnDuration = duration;
    }
    
    render(ctx, debugMode) { 
        const state = this.isWalkingFrame ? 'walk' : 'stand';
        const img = this.images[state][this.facing];
        
        // 月火灼烧效果 - 蓝光特效
        if (this.isMoonfireBurning) {
            const burnProgress = (Date.now() - this.moonfireBurnStartTime) / this.moonfireBurnDuration;
            const pulse = Math.sin(burnProgress * Math.PI * 8) * 0.3 + 0.7; // 脉动效果
            const alpha = 0.3 + 0.2 * pulse; // 透明度脉动
            
            // 蓝色光晕
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = `rgba(100, 150, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y + this.height/2, this.width/2 + 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        
        if (img && img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, this.x, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = 'red';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
        
        // 血条 - 使用固定宽度，所有怪物保持一致
        const hpPct = this.health / this.maxHealth;
        const barWidth = 30; // 固定血条宽度为20，所有怪物保持一致
        const barX = this.x + (this.width - barWidth) / 2; // 居中显示
        ctx.fillStyle = '#333';
        ctx.fillRect(barX, this.y - 6, barWidth, 4);
        ctx.fillStyle = '#f00';
        ctx.fillRect(barX, this.y - 6, barWidth * hpPct, 4);
        
        if (debugMode) {
            ctx.strokeStyle = 'red';
            const cx = this.x + this.width/2;
            const cy = this.y + this.height/2;
            ctx.strokeRect(cx - this.collisionSize/2, cy - this.collisionSize/2, this.collisionSize, this.collisionSize);
        }
    }
    
    takeDamage(amount) {
        this.health -= amount;
    }
}

function spawnEnemy(canvas, player) {
    const types = ['basic', 'fast', 'tank'];
    const type = types[randomInt(0, types.length)];
    
    let x, y;
    
    // 生成在屏幕边缘但可见的区域内，避免从完全看不见的地方生成
    const margin = 100; // 距离屏幕边缘的距离
    
    if (Math.random() < 0.5) {
        // 水平方向生成
        if (Math.random() < 0.5) {
            // 左侧生成
            x = Math.random() * margin;
        } else {
            // 右侧生成
            x = canvas.width - margin + Math.random() * margin;
        }
        y = Math.random() * canvas.height;
    } else {
        // 垂直方向生成
        x = Math.random() * canvas.width;
        if (Math.random() < 0.5) {
            // 上方生成
            y = Math.random() * margin;
        } else {
            // 下方生成
            y = canvas.height - margin + Math.random() * margin;
        }
    }
    
    // 确保生成的坐标在屏幕范围内
    x = Math.max(0, Math.min(x, canvas.width));
    y = Math.max(0, Math.min(y, canvas.height));
    
    return new Enemy(x, y, type);
}

export { Enemy, spawnEnemy };