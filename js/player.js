// 玩家系统

import { clamp } from './utils.js';

class Player {
    constructor(x, y) {
        // 位置和尺寸 - 将角色放大到原来的200%（20*2=40）
        this.x = x;
        this.y = y;
        this.width = 40; // 放大角色尺寸到原来的200%
        this.height = 40;
        
        // 固定碰撞体积，与图片大小无关
        this.collisionSize = 24; // 碰撞尺寸也放大到原来的200%
        
        // 移动相关
        this.speed = 70; // 大幅降低移动速度
        this.direction = { x: 0, y: 0 };
        this.isMoving = false;
        this.facing = 'right'; // 面向方向：left 或 right
        
        // 状态
        this.health = 80;
        this.maxHealth = 80; // 降低初始最大生命值
        this.exp = 0;
        this.level = 1;
        this.expRequired = 50; // 降低升级所需经验值（约降低60%）
        this.expFactor = 1.3; // 降低每级所需经验值增长因子（约降低60%）
        this.level15ExpRequired = null; // 存储15级所需经验值
        
        // 技能系统
        this.skills = [];
        
        // 渲染相关 - 区分左右方向的图片
        this.images = {
            stand: {
                left: new Image(),
                right: new Image()
            },
            walk: {
                left: new Image(),
                right: new Image()
            }
        };
        
        // 动画相关
        this.animationFrame = 0;
        this.animationSpeed = 0.02; // 更低的切换频率
        this.currentImage = this.images.stand.right;
        this.isWalkingFrame = false; // 控制walk/stand切换
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
            this.isMoving = true;
            
            // 根据移动方向设置面向方向
            if (this.direction.x < 0) {
                this.facing = 'left';
            } else if (this.direction.x > 0) {
                this.facing = 'right';
            }
            // 如果只上下移动，保持当前面向方向
        } else {
            this.isMoving = false;
        }
    }
    
    move(deltaTime, canvas) {
        // 计算移动距离
        const moveX = this.direction.x * this.speed * deltaTime;
        const moveY = this.direction.y * this.speed * deltaTime;
        
        // 更新位置
        this.x += moveX;
        this.y += moveY;
        
        // 限制在画布范围内 - 使用视觉尺寸而非碰撞体积
        // 确保整个图片都在画布内
        this.x = clamp(this.x, 0, canvas.width - this.width);
        this.y = clamp(this.y, 0, canvas.height - this.height);
        
        // 更新动画
        if (this.isMoving) {
            // 更新动画帧 - 低频率切换
            this.animationFrame += this.animationSpeed;
            if (this.animationFrame >= 1) {
                this.animationFrame = 0;
                // 切换行走/站立图像
                this.isWalkingFrame = !this.isWalkingFrame;
            }
            
            // 根据当前帧状态选择图像
            if (this.isWalkingFrame) {
                this.currentImage = this.images.walk[this.facing];
            } else {
                this.currentImage = this.images.stand[this.facing];
            }
        } else {
            // 站立状态，使用站立图像
            this.currentImage = this.images.stand[this.facing];
            this.animationFrame = 0;
            this.isWalkingFrame = false;
        }
    }
    
    render(ctx) {
        // 保存当前上下文状态
        ctx.save();
        
        // 直接绘制玩家精灵，简化渲染代码
        ctx.drawImage(this.currentImage, this.x, this.y, this.width, this.height);
        
        // 恢复上下文状态
        ctx.restore();
        
        // 渲染技能
        this.skills.forEach(skill => {
            skill.render(ctx, this);
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
        // 15级后每级所需经验固定为15级的数值
        if (this.level === 15) {
            // 保存15级所需经验值
            this.level15ExpRequired = this.expRequired;
            // 计算16级所需经验值为15级的数值
            this.expRequired = this.level15ExpRequired;
        } else if (this.level > 15) {
            // 15级之后每级所需经验固定为15级的数值
            this.expRequired = this.level15ExpRequired;
        } else {
            // 15级之前，正常计算下一级所需经验值
            this.expRequired = Math.floor(this.expRequired * this.expFactor);
        }
        
        // 增加最大生命值
        this.maxHealth += 10;
        this.health = this.maxHealth; // 升级时恢复满血
    }
    
    addSkill(skill) {
        // 检查是否已经拥有该技能
        const existingSkill = this.skills.find(s => s.id === skill.id);
        
        if (existingSkill) {
            // 升级现有技能
            existingSkill.levelUp();
        } else {
            // 添加新技能
            this.skills.push(skill);
        }
    }
}

export { Player };