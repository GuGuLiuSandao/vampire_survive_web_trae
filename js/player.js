// 玩家系统

import { ResourceManager, clamp } from './utils.js';

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 40;
        this.collisionSize = 20;
        this.speed = 150;
        this.health = 100;
        this.maxHealth = 100;
        this.exp = 0;
        this.level = 1;
        this.expRequired = 20;
        this.skills = [];
        this.classType = 'basic';
        
        // 默认图片 (占位)
        this.images = {
            stand: { left: null, right: null },
            walk: { left: null, right: null }
        };
        
        this.facing = 'right';
        this.isMoving = false;
        this.animTimer = 0;
        this.walkFrame = false;
    }
    
    update(keys, dt, canvas) {
        let dx = 0;
        let dy = 0;
        if(keys['KeyW'] || keys['ArrowUp']) dy = -1;
        if(keys['KeyS'] || keys['ArrowDown']) dy = 1;
        if(keys['KeyA'] || keys['ArrowLeft']) dx = -1;
        if(keys['KeyD'] || keys['ArrowRight']) dx = 1;
        
        if(dx !== 0 || dy !== 0) {
            const len = Math.sqrt(dx*dx + dy*dy);
            dx /= len; dy /= len;
            this.x += dx * this.speed * dt;
            this.y += dy * this.speed * dt;
            this.isMoving = true;
            if(dx > 0) this.facing = 'right';
            if(dx < 0) this.facing = 'left';
        } else {
            this.isMoving = false;
        }
        
        // 边界限制
        this.x = clamp(this.x, 0, canvas.width - this.width);
        this.y = clamp(this.y, 0, canvas.height - this.height);
        
        // 动画
        if(this.isMoving) {
            this.animTimer += dt;
            if(this.animTimer > 0.2) {
                this.animTimer = 0;
                this.walkFrame = !this.walkFrame;
            }
        } else {
            this.walkFrame = false;
        }
    }
    
    render(ctx, debug) {
        const state = this.isMoving && this.walkFrame ? 'walk' : 'stand';
        const img = this.images[state][this.facing];
        
        if(img && img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, this.x, this.y, this.width, this.height);
        } else { 
            ctx.fillStyle = 'green'; 
            ctx.fillRect(this.x, this.y, this.width, this.height); 
        }
        
        if(debug) {
             ctx.strokeStyle = 'red';
             ctx.strokeRect(this.x + (this.width-this.collisionSize)/2, this.y + (this.height-this.collisionSize)/2, this.collisionSize, this.collisionSize);
        }
    }
    
    takeDamage(amount) {
        // 树皮术减伤
        const reduction = this.damageReduction || 0;
        this.health -= amount * (1 - reduction);
    }
    
    gainExp(amount) {
        this.exp += amount;
    }
    
    shouldLevelUp() {
        return this.exp >= this.expRequired;
    }
    
    levelUp() {
        this.level++;
        this.exp -= this.expRequired;
        
        // [修复] 10级之后的每级经验需要改成线性增加而不是指数型
        if (this.level < 10) {
            // 10级之前保持指数增长
            this.expRequired = Math.ceil(this.expRequired * (this._expGrowthFactor || 1.5));
        } else {
            // 10级及之后改为线性增长，每级固定增加50点经验
            this.expRequired += 50;
        }
        
        this.maxHealth += 10;
        // [修复] 移除升级时恢复血量的逻辑
    }
    
    addSkill(newSkill) {
        const existing = this.skills.find(s => s.id === newSkill.id);
        if(existing) existing.levelUp();
        else this.skills.push(newSkill);
        
        // 应用被动
        if(newSkill.isPassive && newSkill.applyEffect) {
            newSkill.applyEffect(this);
        }
    }
}

export { Player };