// 敌人系统

import { distance, angleBetween, randomInt, randomFloat } from './utils.js';

class Enemy {
    constructor(x, y, type = 'basic') {
        // 位置和尺寸 - 将敌人放大到原来的两倍（14*2=28）
        this.x = x;
        this.y = y;
        this.width = 28; // 放大敌人尺寸到原来的两倍
        this.height = 28;
        
        // 固定碰撞体积，与图片大小无关
        this.collisionSize = 12; // 碰撞尺寸也放大到原来的两倍
        
        // 移动相关
        this.speed = 25; // 大幅降低移动速度
        this.direction = { x: 0, y: 0 };
        this.isMoving = false;
        this.facing = 'right'; // 面向方向：left 或 right
        
        // 状态
        this.health = 10;
        this.maxHealth = 10;
        this.damage = 5;
        this.expReward = 10;
        this.scoreReward = 10;
        
        // 类型
        this.type = type;
        
        // 渲染相关
        this.color = '#ff0000';
        this.rotation = 0;
        this.shape = 'square'; // 形状：square, circle, triangle
        
        // 图像资源 - 区分左右方向的图片
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
        
        // 加载不同类型敌人的图像资源
        this.loadEnemyImages();
        
        // 当前使用的图像
        this.currentImage = this.images.stand.right;
        
        // 动画相关
        this.animationFrame = 0;
        this.animationSpeed = 0.02; // 低频率切换
        this.isWalkingFrame = false;
        
        // 远程攻击相关
        this.isRanged = false;
        this.attackRange = 0;
        this.attackSpeed = 0;
        this.lastAttackTime = 0;
        this.projectileSpeed = 0;
        
        // 初始化敌人属性
        this.initType();
    }
    
    // 根据敌人类型加载图像资源
    loadEnemyImages() {
        // 根据敌人类型选择不同的图像集
        switch(this.type) {
            case 'basic':
            case 'fast':
            case 'ranged':
            case 'flying':
                // 使用恶狗敌人图像
                this.images.stand.left.src = './resources/enemy_evil_dog_left.jpg';
                this.images.stand.right.src = './resources/enemy_evil_dog_stand_right.jpg';
                this.images.walk.left.src = './resources/enemy_evil_dog_walk_left.png';
                this.images.walk.right.src = './resources/enemy_evil_dog_walk_right.jpg';
                break;
                
            case 'tank':
            case 'strong':
                // 使用坦克敌人图像
                this.images.stand.left.src = './resources/enemy_tank_interno_stand_left.jpg';
                this.images.stand.right.src = './resources/enemy_tank_interno_stand_right.jpg';
                this.images.walk.left.src = './resources/enemy_tank_interno_walk_left.jpg';
                this.images.walk.right.src = './resources/enemy_tank_interno_walk_right.jpg';
                break;
                
            default:
                // 默认使用恶狗敌人图像
                this.images.stand.left.src = './resources/enemy_evil_dog_left.jpg';
                this.images.stand.right.src = './resources/enemy_evil_dog_stand_right.jpg';
                this.images.walk.left.src = './resources/enemy_evil_dog_walk_left.png';
                this.images.walk.right.src = './resources/enemy_evil_dog_walk_right.jpg';
                break;
        }
    }
    
    initType() {
        // 根据敌人类型设置不同属性
        // 注意：视觉尺寸（width, height）用于渲染图片，保持较大值
        // 碰撞尺寸（collisionSize）用于物理碰撞，保持较小值
        switch(this.type) {
            case 'basic':
                this.health = 15;
                this.maxHealth = 15;
                this.speed = 30; // 降低基础敌人速度
                this.damage = 8;
                this.expReward = 10;
                this.scoreReward = 10;
                this.color = '#ff0000';
                // 视觉尺寸保持不变（72x72），用于渲染图片
                // 碰撞尺寸设置为较小值，用于物理碰撞
                this.collisionSize = 10;
                this.shape = 'square';
                break;
            
            case 'fast':
                this.health = 8;
                this.maxHealth = 8;
                this.speed = 60; // 降低快速敌人速度
                this.damage = 5;
                this.expReward = 15;
                this.scoreReward = 15;
                this.color = '#ffff00';
                // 视觉尺寸保持不变（72x72），用于渲染图片
                this.collisionSize = 8;
                this.shape = 'circle';
                break;
            
            case 'strong':
                this.health = 35;
                this.maxHealth = 35;
                this.speed = 20; // 降低强壮敌人速度
                this.damage = 15;
                this.expReward = 30;
                this.scoreReward = 30;
                this.color = '#ff6600';
                // 视觉尺寸保持不变（72x72），用于渲染图片
                this.collisionSize = 14;
                this.shape = 'square';
                break;
            
            case 'ranged':
                this.health = 12;
                this.maxHealth = 12;
                this.speed = 25; // 降低远程敌人速度
                this.damage = 6;
                this.expReward = 20;
                this.scoreReward = 20;
                this.color = '#00ffff';
                // 视觉尺寸保持不变（72x72），用于渲染图片
                this.collisionSize = 10;
                this.shape = 'triangle';
                this.isRanged = true;
                this.attackRange = 250;
                this.attackSpeed = 1200; // 缩短攻击间隔（毫秒）
                this.projectileSpeed = 250;
                break;
            
            case 'flying':
                this.health = 10;
                this.maxHealth = 10;
                this.speed = 45; // 降低飞行敌人速度
                this.damage = 6;
                this.expReward = 18;
                this.scoreReward = 18;
                this.color = '#ff00ff';
                // 视觉尺寸保持不变（72x72），用于渲染图片
                this.collisionSize = 8;
                this.shape = 'circle';
                break;
            
            case 'tank':
                this.health = 55;
                this.maxHealth = 55;
                this.speed = 12; // 降低坦克敌人速度
                this.damage = 20;
                this.expReward = 40;
                this.scoreReward = 40;
                this.color = '#884400';
                // 视觉尺寸保持不变（72x72），用于渲染图片
                this.collisionSize = 18;
                this.shape = 'square';
                break;
        }
    }
    
    update(player, deltaTime, projectiles = []) {
        // 更新朝向玩家的方向
        this.updateDirection(player);
        
        // 移动敌人
        this.move(deltaTime);
        
        // 远程敌人攻击逻辑
        if (this.isRanged) {
            this.lastAttackTime += deltaTime * 1000;
            
            // 检查是否可以攻击（使用中心位置计算距离）
            const enemyCenterX = this.x + this.width / 2;
            const enemyCenterY = this.y + this.height / 2;
            const playerCenterX = player.x + player.width / 2;
            const playerCenterY = player.y + player.height / 2;
            const distToPlayer = distance(enemyCenterX, enemyCenterY, playerCenterX, playerCenterY);
            
            if (this.lastAttackTime >= this.attackSpeed && distToPlayer <= this.attackRange) {
                this.attack(player, projectiles);
                this.lastAttackTime = 0;
            }
        }
    }
    
    updateDirection(player) {
        // 计算朝向玩家的角度 - 使用中心点计算
        const enemyCenterX = this.x + this.width / 2;
        const enemyCenterY = this.y + this.height / 2;
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;
        const angle = angleBetween(enemyCenterX, enemyCenterY, playerCenterX, playerCenterY);
        
        // 设置方向向量
        this.direction.x = Math.cos(angle);
        this.direction.y = Math.sin(angle);
        
        // 设置面向方向
        if (this.direction.x < 0) {
            this.facing = 'left';
        } else if (this.direction.x > 0) {
            this.facing = 'right';
        }
    }
    
    move(deltaTime) {
        // 计算移动距离
        const moveX = this.direction.x * this.speed * deltaTime;
        const moveY = this.direction.y * this.speed * deltaTime;
        
        // 更新位置
        this.x += moveX;
        this.y += moveY;
        
        // 更新移动状态
        this.isMoving = Math.abs(moveX) > 0 || Math.abs(moveY) > 0;
        
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
    
    // 远程敌人攻击方法
    attack(player, projectiles) {
        // 计算朝向玩家的角度 - 使用中心点计算
        const enemyCenterX = this.x + this.width / 2;
        const enemyCenterY = this.y + this.height / 2;
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;
        const angle = angleBetween(enemyCenterX, enemyCenterY, playerCenterX, playerCenterY);
        
        // 创建投射物
        const projectile = {
            x: enemyCenterX,
            y: enemyCenterY,
            angle: angle,
            speed: this.projectileSpeed,
            damage: this.damage,
            pierce: 1,
            color: this.color,
            width: 6,
            height: 6,
            type: 'enemy',
            // 固定碰撞体积
            collisionSize: 4
        };
        
        projectiles.push(projectile);
    }
    
    render(ctx) {
        // 保存当前上下文状态
        ctx.save();
        
        // 确保图像加载完成后再渲染
        if (this.currentImage && this.currentImage.complete) {
            // 直接绘制敌人精灵，使用当前面向方向和动画状态
            ctx.drawImage(this.currentImage, this.x, this.y, this.width, this.height);
        } else {
            // 图像未加载完成时，绘制一个临时矩形作为占位符
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
        
        // 绘制敌人生命值条
        this.renderHealthBar(ctx);
        
        // 恢复上下文状态
        ctx.restore();
    }
    
    renderHealthBar(ctx) {
        // 计算生命值条宽度
        const healthPercent = this.health / this.maxHealth;
        const barWidth = this.width;
        const barHeight = 2;
        const barX = this.x;
        const barY = this.y - 5;
        
        // 绘制背景
        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // 绘制生命值
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
    }
    
    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);
    }
}

// 敌人生成函数
function spawnEnemy(canvas, player) {
    // 随机选择敌人类型
    const enemyTypes = ['basic', 'fast', 'strong', 'ranged', 'flying', 'tank'];
    // 基础敌人60%，快速敌人15%，强壮敌人10%，远程敌人8%，飞行敌人5%，坦克敌人2%
    const typeWeights = [0.6, 0.15, 0.1, 0.08, 0.05, 0.02]; 
    let type;
    
    // 根据权重选择敌人类型
    const random = Math.random();
    let weightSum = 0;
    for (let i = 0; i < enemyTypes.length; i++) {
        weightSum += typeWeights[i];
        if (random < weightSum) {
            type = enemyTypes[i];
            break;
        }
    }
    
    // 随机生成敌人位置（在屏幕外）
    let x, y;
    
    // 随机选择一个边生成敌人
    const side = randomInt(0, 4);
    switch(side) {
        case 0: // 顶部
            x = randomInt(0, canvas.width);
            y = -50;
            break;
        case 1: // 右侧
            x = canvas.width + 50;
            y = randomInt(0, canvas.height);
            break;
        case 2: // 底部
            x = randomInt(0, canvas.width);
            y = canvas.height + 50;
            break;
        case 3: // 左侧
            x = -50;
            y = randomInt(0, canvas.height);
            break;
    }
    
    // 创建并返回敌人
    return new Enemy(x, y, type);
}

export { Enemy, spawnEnemy };