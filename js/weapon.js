// 武器系统

import { angleBetween, randomInt, randomFloat, distance } from './utils.js';

class Weapon {
    constructor(type) {
        this.type = type;
        this.level = 1;
        this.lastAttackTime = 0;
        
        // 武器属性
        this.damage = 0;
        this.attackSpeed = 0;
        this.range = 0;
        this.projectileSpeed = 0;
        this.pierce = 0; // 穿透敌人数量
        this.bounce = 0; // 弹跳次数
        
        // 鞭子特有属性
        this.rotationSpeed = 0; // 旋转速度（弧度/秒）
        this.currentRotation = 0; // 当前旋转角度（弧度）
        this.whipCount = 0; // 鞭子数量
        
        // 初始化武器属性
        this.initStats();
    }
    
    initStats() {
        // 根据武器类型设置初始属性
        switch(this.type) {
            case 'knife':
                this.damage = 3; // 大幅削弱飞刀伤害
                this.attackSpeed = 500; // 攻击间隔（毫秒）
                this.range = 500;
                this.projectileSpeed = 500;
                this.pierce = 1;
                this.bounce = 0; // 初始弹跳次数
                break;
                
            case 'magicBall':
                this.damage = 30;
                this.attackSpeed = 2000; // 降低发射频率
                this.range = 400;
                this.projectileSpeed = 250;
                this.explosionRadius = 40; // 初始爆炸半径
                this.width = 16; // 大幅增加直径
                this.height = 16;
                break;
                
            case 'whip':
                this.damage = 15;
                this.attackSpeed = 100; // 攻击间隔（毫秒）
                this.range = 66; // 初始长度为原先的2/3（100 * 2/3 ≈ 66）
                this.projectileSpeed = 0; // 环刃是近战武器，不需要投射物速度
                this.pierce = 2;
                this.rotationSpeed = Math.PI * 1.5; // 每秒旋转270度（略微降低速度）
                this.whipCount = 1; // 初始1个环刃
                break;
                
            case 'laser':
                this.damage = 8; // 降低激光炮伤害
                this.attackSpeed = 1500; // 攻击间隔（毫秒）
                this.range = 600;
                this.laserWidth = 10; // 初始激光宽度
                this.pierce = 3; // 穿透敌人数量
                this.color = '#00ff00'; // 激光颜色
                this.laserDuration = 1000; // 激光持续时间（毫秒）
                this.damageInterval = 100; // 伤害计算间隔（毫秒）
                break;
        }
    }
    
    update(player, enemies, deltaTime, projectiles) {
        // 更新攻击计时器
        this.lastAttackTime += deltaTime * 1000;
        
        // 更新鞭子旋转角度
        if (this.type === 'whip') {
            this.currentRotation += this.rotationSpeed * deltaTime;
            // 确保角度在0-2π之间
            this.currentRotation %= Math.PI * 2;
        }
        
        // 检查是否可以攻击
        if (this.lastAttackTime >= this.attackSpeed) {
            this.attack(player, enemies, projectiles);
            this.lastAttackTime = 0;
        }
    }
    
    attack(player, enemies, projectiles) {
        switch(this.type) {
            case 'knife':
            case 'magicBall':
            case 'laser':
                // 查找最近的敌人
                let target = null;
                let closestDistance = Infinity;
                
                for (const enemy of enemies) {
                    const dist = distance(player.x, player.y, enemy.x, enemy.y);
                    if (dist < this.range && dist < closestDistance) {
                        closestDistance = dist;
                        target = enemy;
                    }
                }
                
                // 如果有目标，发起攻击
                if (target) {
                    if (this.type === 'knife') {
                        this.shootKnife(player, target, projectiles);
                    } else if (this.type === 'magicBall') {
                        this.shootMagicBall(player, target, projectiles);
                    } else if (this.type === 'laser') {
                        this.shootLaser(player, target, enemies, projectiles);
                    }
                }
                break;
                
            case 'whip':
                this.swingWhip(player, enemies, projectiles);
                break;
        }
    }
    
    shootLaser(player, target, enemies, projectiles) {
        // 计算朝向目标的角度
        const angle = angleBetween(player.x, player.y, target.x, target.y);
        
        // 计算激光起点和终点位置
        const centerX = player.x + player.width / 2;
        const centerY = player.y + player.height / 2;
        
        // 创建持续激光投射物
        const laserProjectile = new LaserEffect(
            centerX,
            centerY,
            angle,
            this.range,
            this.laserWidth,
            this.color,
            this.laserDuration, // 持续1秒
            this.damage,
            this.damageInterval,
            enemies
        );
        
        // 添加到投射物列表
        projectiles.push(laserProjectile);
    }
    
    shootKnife(player, target, projectiles) {
        // 计算朝向目标的角度
        const angle = angleBetween(player.x, player.y, target.x, target.y);
        
        // 创建飞刀投射物，传递弹跳属性
        const projectile = new Projectile(
            player.x + player.width / 2,
            player.y + player.height / 2,
            angle,
            this.projectileSpeed,
            this.damage,
            this.pierce,
            '#ffffff',
            4, 8,
            { bounce: this.bounce } // 传递弹跳次数
        );
        
        projectiles.push(projectile);
    }
    
    shootMagicBall(player, target, projectiles) {
        // 计算朝向目标的角度
        const angle = angleBetween(player.x, player.y, target.x, target.y);
        
        // 爆炸范围增大到魔法弹直径的4倍
        const actualExplosionRadius = this.width * 4;
        
        // 创建魔法球投射物（圆形）
        const projectile = new Projectile(
            player.x + player.width / 2,
            player.y + player.height / 2,
            angle,
            this.projectileSpeed,
            this.damage,
            this.pierce,
            '#00ffff',
            this.width, this.height,
            { 
                type: 'explosive', 
                radius: actualExplosionRadius,
                shape: 'circle' // 添加形状属性，标记为圆形
            }
        );
        
        projectiles.push(projectile);
    }
    
    swingWhip(player, enemies, projectiles) {
        // 计算每根环刃的角度偏移
        const angleStep = (Math.PI * 2) / this.whipCount;
        
        // 检查每根环刃的攻击范围
        for (let i = 0; i < this.whipCount; i++) {
            // 计算当前环刃的角度
            const ringAngle = this.currentRotation + (i * angleStep);
            
            // 计算环刃的起点和终点
            const centerX = player.x + player.width / 2;
            const centerY = player.y + player.height / 2;
            const endX = centerX + Math.cos(ringAngle) * this.range;
            const endY = centerY + Math.sin(ringAngle) * this.range;
            
            // 检查每个敌人是否在环刃的攻击范围内
            for (const enemy of enemies) {
                // 计算敌人中心位置
                const enemyCenterX = enemy.x + enemy.width / 2;
                const enemyCenterY = enemy.y + enemy.height / 2;
                
                // 计算敌人到环刃线段的距离
                const dist = this.distanceToLine(centerX, centerY, endX, endY, enemyCenterX, enemyCenterY);
                
                // 如果敌人距离环刃线段足够近（整个环刃都能造成伤害）
                if (dist <= 15) {
                    // 对敌人造成伤害
                    enemy.takeDamage(this.damage);
                    
                    // 添加击中效果（可以在后续版本中实现粒子系统）
                    console.log('环刃击中敌人！');
                }
            }
        }
    }
    
    // 辅助方法：计算点到线段的最短距离
    distanceToLine(x1, y1, x2, y2, px, py) {
        // 计算线段长度的平方
        const lineLengthSquared = (x2 - x1) ** 2 + (y2 - y1) ** 2;
        
        // 如果线段长度为0，返回点到起点的距离
        if (lineLengthSquared === 0) {
            return distance(x1, y1, px, py);
        }
        
        // 计算点在线段上的投影参数t
        let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / lineLengthSquared;
        
        // 限制t在0到1之间（线段范围内）
        t = Math.max(0, Math.min(1, t));
        
        // 计算投影点坐标
        const projX = x1 + t * (x2 - x1);
        const projY = y1 + t * (y2 - y1);
        
        // 计算点到投影点的距离
        return distance(px, py, projX, projY);
    }
    
    levelUp() {
        // 升级武器，提升属性
        this.level++;
        
        // 根据武器类型提升不同属性
        switch(this.type) {
            case 'knife':
                this.attackSpeed = Math.max(100, this.attackSpeed - 50);
                this.projectileSpeed += 50;
                this.bounce += 1; // 升级只增加弹跳次数，不加伤害
                break;
                
            case 'magicBall':
                this.damage += 10;
                this.attackSpeed = Math.max(1000, this.attackSpeed - 150);
                this.projectileSpeed += 30;
                this.width += 4; // 增加魔法弹直径
                this.height += 4;
                this.explosionRadius += 10; // 增加爆炸范围
                break;
                
            case 'whip':
                this.whipCount += 1; // 升级后环刃数量+1
                this.damage += 5;
                // 环刃长度固定，升级时不会增加
                break;
                
            case 'laser':
                this.damage += 8;
                this.attackSpeed = Math.max(400, this.attackSpeed - 80);
                this.laserWidth += 4; // 激光变粗
                this.pierce += 1; // 增加穿透次数
                this.range += 50; // 增加激光射程
                break;
        }
    }
    
    render(ctx, player) {
        // 渲染武器效果（如果需要）
        switch(this.type) {
            case 'whip':
                this.renderRingBlade(ctx, player);
                break;
        }
    }
    
    renderRingBlade(ctx, player) {
        // 渲染环刃效果
        ctx.save();
        
        // 计算玩家中心位置
        const centerX = player.x + player.width / 2;
        const centerY = player.y + player.height / 2;
        
        // 计算每个环刃的角度间隔
        const angleStep = (Math.PI * 2) / this.whipCount;
        
        // 渲染每个环刃
        for (let i = 0; i < this.whipCount; i++) {
            // 计算当前环刃的角度
            const ringAngle = this.currentRotation + (i * angleStep);
            
            // 计算环刃的终点位置
            const endX = centerX + Math.cos(ringAngle) * this.range;
            const endY = centerY + Math.sin(ringAngle) * this.range;
            
            // 绘制环刃主体（更粗的线条，更像环刃）
            ctx.strokeStyle = '#ff6600';
            ctx.lineWidth = 8;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            
            // 添加环刃发光效果
            ctx.strokeStyle = '#ffaa00';
            ctx.lineWidth = 4;
            ctx.stroke();
            
            // 绘制环刃末端的锋利效果
            ctx.fillStyle = '#ff6600';
            ctx.beginPath();
            ctx.moveTo(endX, endY);
            ctx.lineTo(endX + Math.cos(ringAngle + Math.PI / 6) * 8, endY + Math.sin(ringAngle + Math.PI / 6) * 8);
            ctx.lineTo(endX + Math.cos(ringAngle - Math.PI / 6) * 8, endY + Math.sin(ringAngle - Math.PI / 6) * 8);
            ctx.closePath();
            ctx.fill();
            
            // 添加环刃的金属光泽效果
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(centerX + Math.cos(ringAngle) * 10, centerY + Math.sin(ringAngle) * 10);
            ctx.lineTo(endX - Math.cos(ringAngle) * 10, endY - Math.sin(ringAngle) * 10);
            ctx.stroke();
        }
        
        ctx.restore();
    }
}

class Projectile {
    constructor(x, y, angle, speed, damage, pierce, color, width, height, special = null) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = speed;
        this.damage = damage;
        this.pierce = pierce;
        this.color = color;
        this.width = width;
        this.height = height;
        this.special = special;
        this.bounces = special?.bounce || 0;
        this.maxBounces = this.bounces;
        this.hitEnemies = [];
        this.bounced = 0;
        
        // 爆炸相关属性
        this.isExploding = false;
        this.explosionRadius = special?.radius || 0;
        this.maxExplosionRadius = this.explosionRadius;
        this.explosionAlpha = 1;
        this.explosionDuration = 300; // 爆炸持续时间（毫秒）
        this.explosionTime = 0;
    }
    
    update(deltaTime, enemies = []) {
        if (this.isExploding) {
            // 更新爆炸效果
            this.updateExplosion(deltaTime);
            return;
        }
        
        // 计算移动距离
        const moveX = Math.cos(this.angle) * this.speed * deltaTime;
        const moveY = Math.sin(this.angle) * this.speed * deltaTime;
        
        // 更新位置
        this.x += moveX;
        this.y += moveY;
    }
    
    // 处理击中敌人的逻辑，返回是否应该销毁投射物
    handleHit(enemy, enemies) {
        // 如果已经击中过这个敌人，跳过
        if (this.hitEnemies.includes(enemy)) {
            return false;
        }
        
        // 标记为已击中
        this.hitEnemies.push(enemy);
        
        // 减少穿透次数
        this.pierce--;
        
        // 如果还有弹跳次数，并且还有其他敌人
        if (this.bounced < this.maxBounces && enemies.length > 1) {
            // 查找除了当前敌人以外的最近敌人
            let target = null;
            let closestDistance = Infinity;
            
            for (const e of enemies) {
                if (e !== enemy) {
                    const dist = distance(this.x, this.y, e.x, e.y);
                    if (dist < closestDistance) {
                        closestDistance = dist;
                        target = e;
                    }
                }
            }
            
            if (target) {
                // 计算朝向新目标的角度
                this.angle = angleBetween(this.x, this.y, target.x, target.y);
                this.bounced++;
                this.hitEnemies = [enemy]; // 重置击中敌人列表，只保留当前敌人
                return false; // 继续存在
            }
        }
        
        // 如果是魔法球，触发爆炸
        if (this.special?.type === 'explosive') {
            this.triggerExplosion();
            return false; // 继续存在以播放爆炸动画
        }
        
        // 如果穿透次数用完，销毁投射物
        return this.pierce <= 0;
    }
    
    // 触发爆炸
    triggerExplosion() {
        this.isExploding = true;
        this.explosionTime = 0;
        this.explosionRadius = 0;
    }
    
    // 更新爆炸效果
    updateExplosion(deltaTime) {
        this.explosionTime += deltaTime * 1000;
        
        // 计算爆炸进度（0-1）
        const progress = Math.min(this.explosionTime / this.explosionDuration, 1);
        
        // 爆炸半径随时间增长
        this.explosionRadius = this.maxExplosionRadius * progress;
        
        // 爆炸透明度随时间降低
        this.explosionAlpha = 1 - progress;
    }
    
    // 检查爆炸是否结束
    isExplosionFinished() {
        return this.isExploding && this.explosionTime >= this.explosionDuration;
    }
    
    render(ctx) {
        // 保存当前上下文状态
        ctx.save();
        
        if (this.isExploding) {
            // 渲染爆炸效果
            this.renderExplosion(ctx);
        } else {
            // 旋转投射物朝向移动方向
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            
            ctx.fillStyle = this.color;
            
            // 根据形状绘制投射物
            if (this.special?.shape === 'circle') {
                // 绘制圆形魔法球
                ctx.beginPath();
                ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
                ctx.fill();
                
                // 添加魔法球发光效果
                ctx.shadowColor = this.color;
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            } else {
                // 绘制默认矩形投射物
                ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
            }
        }
        
        // 恢复上下文状态
        ctx.restore();
    }
    
    // 渲染爆炸效果
    renderExplosion(ctx) {
        // 绘制爆炸最外层光晕
        ctx.globalAlpha = this.explosionAlpha * 0.3;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.explosionRadius * 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        // 绘制爆炸外圈（半透明）
        ctx.globalAlpha = this.explosionAlpha * 0.6;
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.explosionRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // 绘制爆炸内圈（更亮）
        ctx.globalAlpha = this.explosionAlpha * 0.8;
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.explosionRadius * 0.6, 0, Math.PI * 2);
        ctx.fill();
        
        // 绘制爆炸中心（最亮）
        ctx.globalAlpha = this.explosionAlpha;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.explosionRadius * 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        // 重置透明度
        ctx.globalAlpha = 1;
    }
}

// 激光效果类
class LaserEffect {
    constructor(x, y, angle, length, width, color, duration, damage, damageInterval, enemies) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.length = length;
        this.originalWidth = width;
        this.width = width;
        this.color = color;
        this.duration = duration;
        this.totalTime = duration;
        this.timeLeft = duration;
        this.isFinished = false;
        
        // 伤害相关
        this.damage = damage;
        this.damageInterval = damageInterval;
        this.lastDamageTime = 0;
        this.enemies = enemies;
        this.hitEnemies = new Set();
        
        // 阶段控制
        this.chargingDuration = 200; // 蓄力阶段时长（毫秒）
        this.fadingDuration = 200; // 消失阶段时长（毫秒）
        this.isCharging = true;
        this.isFading = false;
    }
    
    update(deltaTime, enemies = []) {
        // 更新敌人列表
        this.enemies = enemies;
        
        // 更新剩余时间
        this.timeLeft -= deltaTime * 1000;
        this.lastDamageTime += deltaTime * 1000;
        
        // 阶段控制
        const elapsedTime = this.totalTime - this.timeLeft;
        
        if (this.isCharging && elapsedTime >= this.chargingDuration) {
            this.isCharging = false;
        }
        
        if (!this.isFading && this.timeLeft <= this.fadingDuration) {
            this.isFading = true;
        }
        
        // 计算当前阶段
        let phase = 'active';
        if (this.isCharging) {
            phase = 'charging';
        } else if (this.isFading) {
            phase = 'fading';
        }
        
        // 根据阶段调整激光属性
        this.updatePhaseProperties(phase, elapsedTime);
        
        // 每0.1秒计算一次伤害
        if (this.lastDamageTime >= this.damageInterval) {
            this.calculateDamage();
            this.lastDamageTime = 0;
        }
        
        // 检查是否结束
        if (this.timeLeft <= 0) {
            this.isFinished = true;
            this.timeLeft = 0;
        }
    }
    
    // 根据阶段更新激光属性
    updatePhaseProperties(phase, elapsedTime) {
        switch(phase) {
            case 'charging':
                // 蓄力阶段：宽度和透明度逐渐增加
                const chargeProgress = Math.min(elapsedTime / this.chargingDuration, 1);
                this.width = this.originalWidth * chargeProgress;
                break;
                
            case 'fading':
                // 消失阶段：宽度和透明度逐渐减少
                const fadeProgress = 1 - Math.max(this.timeLeft / this.fadingDuration, 0);
                this.width = this.originalWidth * (1 - fadeProgress);
                break;
                
            case 'active':
                // 活跃阶段：保持最大宽度
                this.width = this.originalWidth;
                break;
        }
    }
    
    // 计算激光伤害
    calculateDamage() {
        // 计算激光终点位置
        const endX = this.x + Math.cos(this.angle) * this.length;
        const endY = this.y + Math.sin(this.angle) * this.length;
        
        // 检查激光路径上的敌人
        for (const enemy of this.enemies) {
            // 计算敌人到激光线段的距离
            const enemyCenterX = enemy.x + enemy.width / 2;
            const enemyCenterY = enemy.y + enemy.height / 2;
            const dist = this.distanceToLine(this.x, this.y, endX, endY, enemyCenterX, enemyCenterY);
            
            // 如果敌人在激光路径上，并且在攻击范围内
            if (dist <= this.width / 2) {
                // 对敌人造成伤害
                enemy.takeDamage(this.damage);
            }
        }
    }
    
    render(ctx) {
        // 保存当前上下文状态
        ctx.save();
        
        // 计算激光终点位置
        const endX = this.x + Math.cos(this.angle) * this.length;
        const endY = this.y + Math.sin(this.angle) * this.length;
        
        // 计算透明度
        let alpha = 1;
        const elapsedTime = this.totalTime - this.timeLeft;
        
        if (this.isCharging) {
            // 蓄力阶段：透明度逐渐增加
            alpha = Math.min(elapsedTime / this.chargingDuration, 1);
        } else if (this.isFading) {
            // 消失阶段：透明度逐渐减少
            alpha = Math.max(this.timeLeft / this.fadingDuration, 0);
        }
        
        // 绘制激光发光效果（最外层）
        const glowRadius = this.width * 3;
        const gradient = ctx.createLinearGradient(this.x, this.y, endX, endY);
        gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.2})`);
        gradient.addColorStop(0.5, `rgba(255, 255, 255, ${alpha * 0.4})`);
        gradient.addColorStop(1, `rgba(255, 255, 255, ${alpha * 0.2})`);
        
        ctx.strokeStyle = gradient;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = glowRadius;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        // 绘制激光主体发光层
        const mainGlowRadius = this.width * 1.5;
        const mainGradient = ctx.createLinearGradient(this.x, this.y, endX, endY);
        mainGradient.addColorStop(0, `${this.color}${Math.floor(alpha * 128).toString(16).padStart(2, '0')}`);
        mainGradient.addColorStop(0.5, `${this.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`);
        mainGradient.addColorStop(1, `${this.color}${Math.floor(alpha * 128).toString(16).padStart(2, '0')}`);
        
        ctx.strokeStyle = mainGradient;
        ctx.lineWidth = mainGlowRadius;
        ctx.stroke();
        
        // 绘制激光核心
        ctx.strokeStyle = this.color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = this.width;
        ctx.stroke();
        
        // 添加激光闪烁效果
        if (Math.random() > 0.7) {
            ctx.strokeStyle = '#ffffff';
            ctx.globalAlpha = alpha * 0.6;
            ctx.lineWidth = this.width * 0.3;
            ctx.stroke();
        }
        
        // 恢复上下文状态
        ctx.restore();
    }
    
    isExplosionFinished() {
        return this.isFinished;
    }
    
    // 激光效果不需要处理击中逻辑
    handleHit() {
        return false;
    }
    
    // 辅助方法：计算点到线段的最短距离
    distanceToLine(x1, y1, x2, y2, px, py) {
        // 计算线段长度的平方
        const lineLengthSquared = (x2 - x1) ** 2 + (y2 - y1) ** 2;
        
        // 如果线段长度为0，返回点到起点的距离
        if (lineLengthSquared === 0) {
            return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
        }
        
        // 计算点在线段上的投影参数t
        let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / lineLengthSquared;
        
        // 限制t在0到1之间（线段范围内）
        t = Math.max(0, Math.min(1, t));
        
        // 计算投影点坐标
        const projX = x1 + t * (x2 - x1);
        const projY = y1 + t * (y2 - y1);
        
        // 计算点到投影点的距离
        return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
    }
}

export { Weapon, Projectile, LaserEffect };