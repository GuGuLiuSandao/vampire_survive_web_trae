// 技能系统

import { angleBetween, distance } from './utils.js';

// 技能稀有度枚举
export const RARITY = {
    COMMON: 'common',      // 普通
    RARE: 'rare',          // 稀有
    EPIC: 'epic',          // 史诗
    LEGENDARY: 'legendary'  // 传说
};

// 稀有度对应的等级限制
export const RARITY_LEVEL_REQUIREMENT = {
    common: 1,       // 1级可学
    rare: 5,         // 5级可学
    epic: 10,        // 10级可学
    legendary: 15    // 15级可学
};

// 技能基础类
export class Skill {
    constructor(skillData) {
        this.id = skillData.id;
        this.name = skillData.name;
        this.description = skillData.description;
        this.rarity = skillData.rarity;
        this.class = skillData.class || 'druid'; // 技能所属职业，默认为druid
        this.levelRequirement = skillData.levelRequirement || RARITY_LEVEL_REQUIREMENT[this.rarity];
        this.level = 1;
        this.maxLevel = 5;
        this.damage = skillData.damage;
        this.range = skillData.range;
        this.attackSpeed = skillData.attackSpeed; // 攻击间隔（毫秒）
        this.lastAttackTime = 0;
        this.isActive = true;
    }
    
    update(player, enemies, deltaTime, projectiles) {
        // 更新攻击计时器
        this.lastAttackTime += deltaTime * 1000;
        
        // 检查是否可以攻击
        if (this.lastAttackTime >= this.attackSpeed) {
            this.cast(player, enemies, projectiles);
            this.lastAttackTime = 0;
        }
    }
    
    cast(player, enemies, projectiles) {
        // 基础攻击逻辑，子类重写
        console.log(`${this.name} 被释放！`);
    }
    
    levelUp() {
        if (this.level < this.maxLevel) {
            this.level++;
            this.onLevelUp();
        }
    }
    
    onLevelUp() {
        // 技能升级效果，子类重写
    }
    
    render(ctx, player) {
        // 渲染技能效果，子类重写
    }
    
    // 获取技能稀有度的颜色
    getRarityColor() {
        switch(this.rarity) {
            case RARITY.COMMON:
                return '#ffffff'; // 白色
            case RARITY.RARE:
                return '#0070dd'; // 蓝色
            case RARITY.EPIC:
                return '#a335ee'; // 紫色
            case RARITY.LEGENDARY:
                return '#ff8000'; // 橙色
            default:
                return '#ffffff';
        }
    }
}

// 德鲁伊技能 - 愤怒（普通技能）
export class Anger extends Skill {
    constructor() {
        super({
            id: 'anger',
            name: '愤怒',
            description: '单体弹道型技能，黄色，不能穿透',
            rarity: RARITY.COMMON,
            damage: 15,
            range: 500,
            attackSpeed: 1500
        });
        this.projectileSpeed = 300; // 降低到原来的50%（600*0.5=300）
        this.color = '#ffff00';
        
        // 技能动画帧 - 愤怒技能有12帧动画
        this.animationFrames = Array.from({ length: 12 }, () => new Image());
        // 加载动画帧（这里假设资源文件有12帧，实际可能需要调整）
        for (let i = 0; i < this.animationFrames.length; i++) {
            this.animationFrames[i].src = `./resources/skill_anger_frame_${i % 2 + 1}.png`; // 目前只有2帧，循环使用
        }
    }
    
    cast(player, enemies, projectiles) {
        console.log(`[${new Date().toISOString()}] 释放技能: ${this.name}`);
        
        // 查找最近的敌人
        let target = null;
        let closestDistance = Infinity;
        
        for (const enemy of enemies) {
            const playerCenterX = player.x + player.width / 2;
            const playerCenterY = player.y + player.height / 2;
            const enemyCenterX = enemy.x + enemy.width / 2;
            const enemyCenterY = enemy.y + enemy.height / 2;
            const dist = distance(playerCenterX, playerCenterY, enemyCenterX, enemyCenterY);
            
            if (dist < this.range && dist < closestDistance) {
                closestDistance = dist;
                target = enemy;
            }
        }
        
        if (target) {
            console.log(`[${new Date().toISOString()}] 技能目标: 距离 ${closestDistance.toFixed(2)}px 的敌人`);
            
            // 计算朝向目标的角度，直接加上Math.PI修复方向反向问题
            const playerCenterX = player.x + player.width / 2;
            const playerCenterY = player.y + player.height / 2;
            const enemyCenterX = target.x + target.width / 2;
            const enemyCenterY = target.y + target.height / 2;
            const angle = angleBetween(playerCenterX, playerCenterY, enemyCenterX, enemyCenterY) + Math.PI;
            
            // 创建投射物，使用12帧动画
            const projectile = {
                x: playerCenterX,
                y: playerCenterY,
                angle: angle,
                speed: this.projectileSpeed,
                damage: this.damage,
                pierce: 1,
                color: this.color,
                width: 16, // 放大技能特效尺寸到原来的两倍
                height: 24,
                type: 'player',
                collisionSize: 12, // 放大碰撞体积
                skillId: this.id,
                skillName: this.name,
                animationFrames: this.animationFrames,
                currentFrame: 0,
                frameDirection: 1, // 1表示正向播放，-1表示反向播放
                frameRate: 0.2, // 帧切换速度
                frameTimer: 0,
                rotationOffset: Math.PI, // [修复] 添加旋转偏移量，使图片旋转180度
                // 添加日志记录属性
                startTime: Date.now(),
                hits: 0,
                totalDamage: 0
            };
            
            projectiles.push(projectile);
        } else {
            console.log(`[${new Date().toISOString()}] 技能${this.name}：没有找到目标`);
        }
    }
    
    onLevelUp() {
        // 升级效果：伤害+8，冷却时间-0.1秒（最低0.5秒）
        this.damage += 8;
        this.attackSpeed = Math.max(500, this.attackSpeed - 100);
        this.projectileSpeed += 50;
    }
}

// 德鲁伊技能 - 月火（普通技能）
export class Moonfire extends Skill {
    constructor() {
        super({
            id: 'moonfire',
            name: '月火',
            description: '单体追踪型，从天而降的月光，低伤害，命中后有后续持续伤害',
            rarity: RARITY.COMMON,
            damage: 8,
            range: 600,
            attackSpeed: 2000
        });
        this.projectileSpeed = Infinity; // 速度无限大
        this.color = 'transparent'; // 透明弹道
        this.dotDamage = 5; // 持续伤害/秒
        this.dotDuration = 3000; // 持续时间
        
        // 技能动画帧
        this.animationFrames = [
            new Image(),
            new Image()
        ];
        this.animationFrames[0].src = './resources/skill_moonfire_frame_1.png';
        this.animationFrames[1].src = './resources/skill_moonfire_frame_2.png';
    }
    
    cast(player, enemies, projectiles) {
        console.log(`[${new Date().toISOString()}] 释放技能: ${this.name}`);
        
        // 查找最近的敌人
        let target = null;
        let closestDistance = Infinity;
        
        for (const enemy of enemies) {
            const playerCenterX = player.x + player.width / 2;
            const playerCenterY = player.y + player.height / 2;
            const enemyCenterX = enemy.x + enemy.width / 2;
            const enemyCenterY = enemy.y + enemy.height / 2;
            const dist = distance(playerCenterX, playerCenterY, enemyCenterX, enemyCenterY);
            
            if (dist < this.range && dist < closestDistance) {
                closestDistance = dist;
                target = enemy;
            }
        }
        
        if (target) {
                console.log(`[${new Date().toISOString()}] 技能目标: 距离 ${closestDistance.toFixed(2)}px 的敌人`);
                
                // 计算朝向目标的角度
                const playerCenterX = player.x + player.width / 2;
                const playerCenterY = player.y + player.height / 2;
                const enemyCenterX = target.x + target.width / 2;
                const enemyCenterY = target.y + target.height / 2;
                
                // 月火技能：速度无限大，直接击中目标
                // 对敌人造成直接伤害
                const enemyHealthBefore = target.health;
                target.takeDamage(this.damage);
                
                console.log(`[${new Date().toISOString()}] 技能${this.name}击中敌人，造成 ${this.damage.toFixed(2)} 直接伤害，敌人剩余生命值: ${target.health.toFixed(2)}`);
                
                // 设置敌人月火灼烧效果
                if (target.setMoonfireBurn) {
                    target.setMoonfireBurn(this.dotDuration);
                }
                
                if (target.health <= 0 && enemyHealthBefore > 0) {
                    console.log(`[${new Date().toISOString()}] 技能${this.name}直接击杀敌人`);
                } else {
                    // 在敌人身上创建月火效果
                    const moonfireEffect = {
                        x: enemyCenterX,
                        y: enemyCenterY,
                        damage: this.dotDamage,
                        duration: this.dotDuration,
                        color: this.color,
                        type: 'player',
                        width: 20, // 设置宽度
                        height: 20, // 设置高度
                        collisionSize: 10, // 放大碰撞体积
                        skillId: this.id,
                        skillName: this.name,
                        dotDamage: this.dotDamage,
                        dotDuration: this.dotDuration,
                        targetEnemy: target,
                        isEffect: true,
                        startTime: Date.now(),
                        animationFrames: this.animationFrames,
                        currentFrame: 0,
                        frameDirection: 1,
                        frameRate: 0.2,
                        frameTimer: 0,
                        animationPlayed: false // 和星火术一样，只播放一次动画
                    };
                    
                    projectiles.push(moonfireEffect);
                    console.log(`[${new Date().toISOString()}] 技能${this.name}为敌人添加持续伤害效果，每秒 ${this.dotDamage} 伤害，持续 ${this.dotDuration / 1000} 秒`);
                }
        } else {
            console.log(`[${new Date().toISOString()}] 技能${this.name}：没有找到目标`);
        }
    }
    
    onLevelUp() {
        // 升级效果：持续伤害+3/秒，持续伤害频率+10%
        this.damage += 3;
        this.attackSpeed = Math.max(1000, this.attackSpeed - 150);
        this.dotDamage += 3;
        this.dotDuration += 500;
    }
}

// 德鲁伊技能 - 星火（普通技能）
export class Starfire extends Skill {
    constructor() {
        super({
            id: 'starfire',
            name: '星火',
            description: '以单体为中心群体范围型，追踪单个怪物从天而降的大束月光，对单体高伤害，对范围其他怪物中伤害',
            rarity: RARITY.COMMON,
            damage: 30, // 单体伤害
            range: 500,
            attackSpeed: 4000
        });
        this.projectileSpeed = Infinity; // 速度无限大
        this.color = 'transparent'; // 透明弹道
        this.aoeDamage = 15; // 范围伤害
        this.aoeRadius = 60; // 范围半径
        
        // 技能动画帧
        this.animationFrames = [
            new Image(),
            new Image(),
            new Image()
        ];
        this.animationFrames[0].src = './resources/skill_starfire_frame_1.png';
        this.animationFrames[1].src = './resources/skill_starfire_frame_2.png';
        this.animationFrames[2].src = './resources/skill_starfire_frame_3.png';
    }
    
    cast(player, enemies, projectiles) {
        console.log(`[${new Date().toISOString()}] 释放技能: ${this.name}`);
        
        // 查找最近的敌人
        let target = null;
        let closestDistance = Infinity;
        
        for (const enemy of enemies) {
            const playerCenterX = player.x + player.width / 2;
            const playerCenterY = player.y + player.height / 2;
            const enemyCenterX = enemy.x + enemy.width / 2;
            const enemyCenterY = enemy.y + enemy.height / 2;
            const dist = distance(playerCenterX, playerCenterY, enemyCenterX, enemyCenterY);
            
            if (dist < this.range && dist < closestDistance) {
                closestDistance = dist;
                target = enemy;
            }
        }
        
        if (target) {
            console.log(`[${new Date().toISOString()}] 技能目标: 距离 ${closestDistance.toFixed(2)}px 的敌人`);
            
            // 计算目标位置
            const playerCenterX = player.x + player.width / 2;
            const playerCenterY = player.y + player.height / 2;
            const enemyCenterX = target.x + target.width / 2;
            const enemyCenterY = target.y + target.height / 2;
            
            // 星火技能：速度无限大，直接击中目标
            // 对目标造成直接伤害
            const enemyHealthBefore = target.health;
            target.takeDamage(this.damage);
            
            console.log(`[${new Date().toISOString()}] 技能${this.name}击中主目标，造成 ${this.damage.toFixed(2)} 伤害，敌人剩余生命值: ${target.health.toFixed(2)}`);
            
            if (target.health <= 0 && enemyHealthBefore > 0) {
                console.log(`[${new Date().toISOString()}] 技能${this.name}击杀主目标`);
            }
            
            // 对范围敌人造成伤害
            let aoeHitCount = 0;
            let totalAoeDamage = 0;
            let aoeKillCount = 0;
            
            for (const otherEnemy of enemies) {
                if (otherEnemy !== target) {
                    const otherEnemyCenterX = otherEnemy.x + otherEnemy.width / 2;
                    const otherEnemyCenterY = otherEnemy.y + otherEnemy.height / 2;
                    const dist = distance(enemyCenterX, enemyCenterY, otherEnemyCenterX, otherEnemyCenterY);
                    
                    if (dist <= this.aoeRadius) {
                        const otherEnemyHealthBefore = otherEnemy.health;
                        otherEnemy.takeDamage(this.aoeDamage);
                        
                        aoeHitCount++;
                        totalAoeDamage += this.aoeDamage;
                        
                        if (otherEnemy.health <= 0 && otherEnemyHealthBefore > 0) {
                            aoeKillCount++;
                        }
                    }
                }
            }
            
            if (aoeHitCount > 0) {
                console.log(`[${new Date().toISOString()}] 技能${this.name}击中 ${aoeHitCount} 个范围敌人，造成总伤害 ${totalAoeDamage.toFixed(2)}，击杀 ${aoeKillCount} 个敌人`);
            }
            
            // 在目标敌人身上创建星火效果
            const starfireEffect = {
                x: enemyCenterX,
                y: enemyCenterY,
                damage: this.aoeDamage,
                duration: 1000, // 短暂的爆炸效果
                color: this.color,
                type: 'player',
                width: this.aoeRadius * 2, // 设置宽度为范围的两倍
                height: this.aoeRadius * 2, // 设置高度为范围的两倍
                collisionSize: this.aoeRadius, // 范围大小
                skillId: this.id,
                skillName: this.name,
                aoeDamage: this.aoeDamage,
                aoeRadius: this.aoeRadius,
                isAoE: true,
                isEffect: true,
                startTime: Date.now(),
                animationFrames: this.animationFrames,
                currentFrame: 0,
                frameDirection: 1,
                frameRate: 0.2,
                frameTimer: 0,
                animationPlayed: false // 只播放一次动画
            };
            
            projectiles.push(starfireEffect);
        } else {
            console.log(`[${new Date().toISOString()}] 技能${this.name}：没有找到目标`);
        }
    }
    
    onLevelUp() {
        // 升级效果：单体伤害+10，范围伤害+5，范围半径+10
        this.damage += 10;
        this.aoeDamage += 5;
        this.aoeRadius += 10;
        this.attackSpeed = Math.max(2000, this.attackSpeed - 300);
    }
}

// 德鲁伊技能 - 树皮（普通技能）
export class Barkskin extends Skill {
    constructor() {
        super({
            id: 'barkskin',
            name: '树皮',
            description: '降低20%收到的伤害，被动',
            rarity: RARITY.COMMON,
            damage: 0, // 被动技能，无直接伤害
            range: 0,
            attackSpeed: 0 // 被动技能，无需攻击
        });
        this.damageReduction = 0.2; // 20%伤害减免
        this.isPassive = true;
        this.maxLevel = 1; // 最多升到1级
    }
    
    // 被动技能，重写update方法
    update(player) {
        // 持续生效，无需攻击
    }
    
    // 应用被动效果
    applyEffect(player) {
        player.damageReduction = this.damageReduction;
        console.log(`[${new Date().toISOString()}] 被动技能${this.name}生效：减少 ${this.damageReduction * 100}% 受到的伤害`);
    }
    
    onLevelUp() {
        // 该技能最多1级，无需升级效果
    }
}

// 德鲁伊技能 - 星涌术（稀有技能）
export class StarSurge extends Skill {
    constructor() {
        super({
            id: 'starSurge',
            name: '星涌术',
            description: '直线弹道技能，蓝色，可穿透，速度快伤害高',
            rarity: RARITY.RARE,
            damage: 25,
            range: 600,
            attackSpeed: 2000
        });
        this.projectileSpeed = 400; // 降低到原来的50%（800*0.5=400）
        this.color = '#0070dd';
        this.pierce = Infinity; // 无限穿透
        this.hasExplosion = false; // 5级时获得小范围爆炸效果
        
        // 技能动画帧 - 星涌术技能有12帧动画
        this.animationFrames = Array.from({ length: 12 }, () => new Image());
        // 加载动画帧（这里假设资源文件有12帧，实际可能需要调整）
        for (let i = 0; i < this.animationFrames.length; i++) {
            this.animationFrames[i].src = `./resources/skill_starsurge_frame_${i % 2 + 1}.png`; // 目前只有2帧，循环使用
        }
    }
    
    cast(player, enemies, projectiles) {
        console.log(`[${new Date().toISOString()}] 释放技能: ${this.name}`);
        
        // 查找最近的敌人
        let target = null;
        let closestDistance = Infinity;
        
        for (const enemy of enemies) {
            const playerCenterX = player.x + player.width / 2;
            const playerCenterY = player.y + player.height / 2;
            const enemyCenterX = enemy.x + enemy.width / 2;
            const enemyCenterY = enemy.y + enemy.height / 2;
            const dist = distance(playerCenterX, playerCenterY, enemyCenterX, enemyCenterY);
            
            if (dist < this.range && dist < closestDistance) {
                closestDistance = dist;
                target = enemy;
            }
        }
        
        if (target) {
            console.log(`[${new Date().toISOString()}] 技能目标: 距离 ${closestDistance.toFixed(2)}px 的敌人`);
            
            // 计算朝向目标的角度，直接加上Math.PI修复方向反向问题
            const playerCenterX = player.x + player.width / 2;
            const playerCenterY = player.y + player.height / 2;
            const enemyCenterX = target.x + target.width / 2;
            const enemyCenterY = target.y + target.height / 2;
            const angle = angleBetween(playerCenterX, playerCenterY, enemyCenterX, enemyCenterY) + Math.PI;
            
            // 创建投射物，使用12帧动画
            const projectile = {
                x: playerCenterX,
                y: playerCenterY,
                angle: angle,
                speed: this.projectileSpeed,
                damage: this.damage,
                pierce: this.pierce,
                color: this.color,
                width: 48, // [修复] 加大为原来的2倍
                height: 48, // [修复] 加大为原来的2倍
                type: 'player',
                collisionSize: 24, // [修复] 加大为原来的2倍
                skillId: this.id,
                skillName: this.name,
                hasExplosion: this.hasExplosion,
                explosionRadius: 60, // [修复] 加大为原来的2倍
                animationFrames: this.animationFrames,
                currentFrame: 0,
                frameDirection: 1, // 1表示正向播放，-1表示反向播放
                frameRate: 0.2, // 帧切换速度
                frameTimer: 0,
                rotationOffset: Math.PI, // [修复] 添加旋转偏移量，使图片旋转180度
                // 添加日志记录属性
                startTime: Date.now(),
                hits: 0,
                totalDamage: 0
            };
            
            projectiles.push(projectile);
            console.log(`[${new Date().toISOString()}] 技能${this.name}发射投射物，速度: ${this.projectileSpeed}，伤害: ${this.damage}`);
        } else {
            console.log(`[${new Date().toISOString()}] 技能${this.name}：没有找到目标`);
        }
    }
    
    onLevelUp() {
        // 升级效果：伤害+12，冷却时间-0.2秒（最低0.8秒）
        this.damage += 12;
        this.attackSpeed = Math.max(800, this.attackSpeed - 200);
        this.projectileSpeed += 50;
        
        // 5级时获得小范围爆炸效果
        if (this.level === 5) {
            this.hasExplosion = true;
        }
    }
}

// 德鲁伊技能 - 阳炎术（稀有技能）
export class Sunfire extends Skill {
    constructor() {
        super({
            id: 'sunfire',
            name: '阳炎术',
            description: '被动，身上有月火持续伤害的敌人死亡会爆炸',
            rarity: RARITY.RARE,
            damage: 0, // 被动技能，无直接伤害
            range: 0,
            attackSpeed: 0 // 被动技能，无需攻击
        });
        this.explosionDamage = 40;
        this.explosionRadius = 80;
        this.isPassive = true;
    }
    
    // 被动技能，重写update方法
    update(player) {
        // 持续生效，无需攻击
        console.log(`[${new Date().toISOString()}] 被动技能${this.name}生效：敌人身上有月火持续伤害时死亡会爆炸，爆炸伤害: ${this.explosionDamage}，爆炸范围: ${this.explosionRadius}px`);
    }
    
    onLevelUp() {
        // 升级效果：爆炸伤害+15，爆炸范围+10
        this.explosionDamage += 15;
        this.explosionRadius += 10;
    }
}

// 德鲁伊技能 - 回春术（稀有技能）
export class Rejuvenation extends Skill {
    constructor() {
        super({
            id: 'rejuvenation',
            name: '回春术',
            description: '被动，缓慢回血',
            rarity: RARITY.RARE,
            damage: 0, // 被动技能，无直接伤害
            range: 0,
            attackSpeed: 1000 // 每秒回血
        });
        this.regenAmount = 5; // 回血量/秒
        this.isPassive = true;
    }
    
    // 被动技能，重写update方法
    update(player, enemies, deltaTime) {
        // 每秒回血
        if (player.health < player.maxHealth) {
            const healAmount = this.regenAmount * deltaTime;
            player.health = Math.min(player.maxHealth, player.health + healAmount);
            console.log(`[${new Date().toISOString()}] 被动技能${this.name}生效：为玩家恢复 ${healAmount.toFixed(2)} 生命值，当前生命值: ${player.health.toFixed(2)}/${player.maxHealth.toFixed(2)}`);
        }
    }
    
    onLevelUp() {
        // 升级效果：回血量+2/秒
        this.regenAmount += 2;
    }
}

// 德鲁伊技能 - 台风（稀有技能）
export class Typhoon extends Skill {
    constructor() {
        super({
            id: 'typhoon',
            name: '台风',
            description: '以玩家为中心，扇形范围，无伤害，击退敌人，中等CD',
            rarity: RARITY.RARE,
            damage: 0, // 无伤害，只有击退效果
            range: 200,
            attackSpeed: 8000
        });
        this.color = '#87ceeb';
        this.pushDistance = 150; // 击退距离
        this.fanAngle = Math.PI / 2; // 扇形角度（90度）
        this.maxLevel = 1; // 最多升到1级
    }
    
    cast(player, enemies, projectiles) {
        console.log(`[${new Date().toISOString()}] 释放技能: ${this.name}`);
        
        // 计算玩家中心点
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;
        
        // 计算玩家朝向
        const playerAngle = player.facing === 'right' ? 0 : Math.PI;
        
        // 对扇形范围内的敌人造成击退效果
        let pushedEnemiesCount = 0;
        for (const enemy of enemies) {
            const enemyCenterX = enemy.x + enemy.width / 2;
            const enemyCenterY = enemy.y + enemy.height / 2;
            const dist = distance(playerCenterX, playerCenterY, enemyCenterX, enemyCenterY);
            
            if (dist < this.range) {
                // 计算敌人相对于玩家的角度
                const enemyAngle = angleBetween(playerCenterX, playerCenterY, enemyCenterX, enemyCenterY);
                const angleDiff = Math.abs(enemyAngle - playerAngle);
                
                // 检查是否在扇形范围内
                if (angleDiff <= this.fanAngle / 2) {
                    // 计算击退方向
                    const pushX = Math.cos(enemyAngle) * this.pushDistance;
                    const pushY = Math.sin(enemyAngle) * this.pushDistance;
                    
                    // 击退敌人
                    enemy.x += pushX;
                    enemy.y += pushY;
                    pushedEnemiesCount++;
                }
            }
        }
        
        console.log(`[${new Date().toISOString()}] 技能${this.name}击退了 ${pushedEnemiesCount} 个敌人`);
        
        // 创建台风视觉效果
        projectiles.push({
            x: playerCenterX,
            y: playerCenterY,
            angle: playerAngle,
            color: this.color,
            range: this.range,
            fanAngle: this.fanAngle,
            type: 'player',
            skillId: this.id,
            isEffect: true,
            duration: 500,
            skillName: this.name
        });
    }
    
    onLevelUp() {
        // 该技能最多1级，无需升级效果
    }
}

// 德鲁伊技能 - 星辰坠落（史诗技能）
export class Starfall extends Skill {
    constructor() {
        super({
            id: 'starfall',
            name: '星辰坠落',
            description: '随机地点落下，范围小，轰炸战场，每0.5秒生成一颗陨石',
            rarity: RARITY.EPIC,
            damage: 35,
            range: 400,
            attackSpeed: 500 // 每0.5秒生成一颗陨石
        });
        this.color = '#a335ee';
        this.radius = 40; // 范围半径
        this.spawnRate = 500; // 生成频率（毫秒）
    }
    
    cast(player, enemies, projectiles) {
        console.log(`[${new Date().toISOString()}] 释放技能: ${this.name}`);
        
        const canvas = player.canvas || { width: 800, height: 600 };
        let startX, startY;
        
        // 随机选择落下区域
        const spawnArea = Math.random();
        if (spawnArea < 0.5) {
            // 区域1: 超越竖直线从左到右1/3到最右边开始随机落下
            // 即X轴范围：canvas.width * 2/3 到 canvas.width + 100
            startX = canvas.width * 2/3 + Math.random() * (canvas.width/3 + 100);
            // Y轴范围：屏幕外上方（-50到0）
            startY = Math.random() * 50 - 50;
        } else {
            // 区域2: 从最右边从下到上1/3到最上点开始随机落下
            // 即X轴范围：canvas.width到canvas.width + 100
            startX = canvas.width + Math.random() * 100;
            // Y轴范围：屏幕高度的0到2/3（因为是从下到上1/3到最上点，即从底部的1/3到顶部）
            startY = Math.random() * (canvas.height * 2/3) - 50;
        }
        
        // 落下方向为右上到坐下，角度在30°~60°之间随机
        // 30° = Math.PI / 6, 60° = Math.PI / 3
        const minAngle = Math.PI / 6; // 30°
        const maxAngle = Math.PI / 3; // 60°
        const angle = minAngle + Math.random() * (maxAngle - minAngle);
        
        console.log(`[${new Date().toISOString()}] 技能${this.name}从位置 (${startX.toFixed(0)}, ${startY.toFixed(0)}) 以 ${(angle * 180 / Math.PI).toFixed(0)}° 角度落下`);
        
        // 创建陨石投射物（下落过程中就能造成伤害，不能穿透）
        projectiles.push({
            x: startX,
            y: startY,
            angle: angle,
            speed: 300, // 下落速度
            color: '#a335ee',
            width: 15,
            height: 15,
            type: 'player',
            collisionSize: 7,
            skillId: this.id,
            isMeteor: true,
            hasLanded: false,
            damage: this.damage, // 下落过程中就能造成伤害
            pierce: 1, // 不能穿透，只能击中一个敌人
            explosionRadius: 0, // 不再需要爆炸范围
            skillName: this.name,
            duration: 3000, // 持续时间，超过则消失
            finalDamage: 0, // 不再需要最终伤害
            finalRadius: 0, // 不再需要最终范围
            canvas: canvas // 保存canvas引用，用于边界检查
        });
    }
    
    onLevelUp() {
        // 升级效果：伤害+15，范围+8，频率+0.1次/秒
        this.damage += 15;
        this.radius += 8;
        this.attackSpeed = Math.max(100, this.attackSpeed - 100); // 频率增加
    }
}

// 德鲁伊技能 - 化身艾露恩之眷（史诗技能）
export class EluneAspect extends Skill {
    constructor() {
        super({
            id: 'eluneAspect',
            name: '化身艾露恩之眷',
            description: '被动，增加法术伤害，对月火灼烧目标额外增加伤害',
            rarity: RARITY.EPIC,
            damage: 0, // 被动技能，无直接伤害
            range: 0,
            attackSpeed: 0 // 被动技能，无需攻击
        });
        this.damageIncrease = 0.15; // 15%法术伤害提升
        this.moonfireBonus = 0.1; // 对月火灼烧目标额外增加10%伤害
        this.isPassive = true;
    }
    
    // 被动技能，重写update方法
    update(player) {
        // 持续生效，无需攻击
        console.log(`[${new Date().toISOString()}] 被动技能${this.name}生效：增加 ${this.damageIncrease * 100}% 法术伤害，对月火灼烧目标额外增加 ${this.moonfireBonus * 100}% 伤害`);
    }
    
    // 应用被动效果
    applyEffect(player) {
        player.spellDamageBonus = this.damageIncrease;
        player.moonfireDamageBonus = this.moonfireBonus;
        console.log(`[${new Date().toISOString()}] 被动技能${this.name}效果应用：法术伤害+${this.damageIncrease * 100}%，月火目标额外伤害+${this.moonfireBonus * 100}%`);
    }
    
    onLevelUp() {
        // 升级效果：法术伤害提升+5%，对月火灼烧目标额外增加伤害+3%
        this.damageIncrease += 0.05;
        this.moonfireBonus += 0.03;
    }
}

// 德鲁伊技能 - 向日蘑菇（史诗技能）
export class SunMushroom extends Skill {
    constructor() {
        super({
            id: 'sunMushroom',
            name: '向日蘑菇',
            description: '随机召唤蘑菇，范围内敌人持续掉血加减速，消失时爆炸',
            rarity: RARITY.EPIC,
            damage: 10, // 持续伤害/秒
            range: 300,
            attackSpeed: 4000
        });
        this.color = '#32cd32';
        this.mushroomCount = 2; // 蘑菇数量
        this.radius = 70; // 范围半径
        this.slowEffect = 0.3; // 30%基础减速效果
        this.explosionDamage = 50; // 爆炸伤害
        this.duration = 5000; // 蘑菇持续时间
    }
    
    cast(player, enemies, projectiles) {
        console.log(`[${new Date().toISOString()}] 释放技能: ${this.name}`);
        
        // 随机位置生成蘑菇
        const canvas = player.canvas || { width: 800, height: 600 };
        
        for (let i = 0; i < this.mushroomCount; i++) {
            const targetX = Math.random() * canvas.width;
            const targetY = Math.random() * canvas.height;
            
            console.log(`[${new Date().toISOString()}] 技能${this.name}在位置 (${targetX.toFixed(0)}, ${targetY.toFixed(0)}) 生成蘑菇`);
            
            // 创建蘑菇投射物
            projectiles.push({
                x: targetX,
                y: targetY,
                damage: this.damage,
                color: this.color,
                width: 30,
                height: 30,
                type: 'player',
                collisionSize: this.radius,
                skillId: this.id,
                isMushroom: true,
                duration: this.duration,
                slowEffect: this.slowEffect,
                explosionDamage: this.explosionDamage,
                explosionRadius: this.radius,
                skillName: this.name
            });
        }
    }
    
    onLevelUp() {
        // 升级效果：爆炸伤害+20，范围+10，减速效果+20%（最高50%），蘑菇数量+1
        this.explosionDamage += 20;
        this.radius += 10;
        // 减速效果最高50%
        this.slowEffect = Math.min(0.5, this.slowEffect + 0.2);
        this.mushroomCount += 1;
        this.damage += 3; // 持续伤害也增加
    }
}

// 德鲁伊技能 - 万灵之召（史诗技能）
export class CallOfTheWild extends Skill {
    constructor() {
        super({
            id: 'callOfTheWild',
            name: '万灵之召',
            description: '被动，所有技能冷却-20%',
            rarity: RARITY.EPIC,
            damage: 0, // 被动技能，无直接伤害
            range: 0,
            attackSpeed: 0 // 被动技能，无需攻击
        });
        this.cooldownReduction = 0.2; // 20%冷却时间减少
        this.isPassive = true;
        this.maxLevel = 1; // 最多升到1级
    }
    
    // 被动技能，重写update方法
    update(player) {
        // 持续生效，无需攻击
        console.log(`[${new Date().toISOString()}] 被动技能${this.name}生效：所有技能冷却时间减少 ${this.cooldownReduction * 100}%`);
    }
    
    // 应用被动效果
    applyEffect(player) {
        player.cooldownReduction = this.cooldownReduction;
        console.log(`[${new Date().toISOString()}] 被动技能${this.name}效果应用：所有技能冷却时间-${this.cooldownReduction * 100}%`);
    }
    
    onLevelUp() {
        // 该技能最多1级，无需升级效果
    }
}

// 德鲁伊技能 - 艾露恩之怒（传说技能，主动释放）
export class ElunesWrath extends Skill {
    constructor() {
        super({
            id: 'elunesWrath',
            name: '艾露恩之怒',
            description: '主动释放：召唤一道超强白色月光，持续追踪最近敌人，产生持续的范围伤害',
            rarity: RARITY.LEGENDARY,
            damage: 50,
            range: 300,
            attackSpeed: 60000 // 60秒冷却时间
        });
        this.color = '#ffffff';
        this.duration = 10000; // 10秒持续时间
        this.radius = 120;
        this.isActiveSkill = true; // 标记为主动释放技能
        this.currentCooldown = 0;
        this.maxLevel = 1; // 最多升到1级
    }
    
    // 主动技能重写update方法，不自动释放
    update(player, enemies, deltaTime) {
        // 只更新冷却时间
        if (this.currentCooldown > 0) {
            this.currentCooldown -= deltaTime * 1000;
        }
    }
    
    // 主动释放方法
    activate(player, enemies, projectiles) {
        console.log(`[${new Date().toISOString()}] 尝试激活主动技能: ${this.name}`);
        
        if (this.currentCooldown > 0) {
            console.log(`[${new Date().toISOString()}] 技能${this.name}正在冷却中，剩余冷却时间: ${this.getCurrentCooldownSeconds()}秒`);
            return false;
        }
        
        // 查找最近的敌人
        let target = null;
        let closestDistance = Infinity;
        
        for (const enemy of enemies) {
            const playerCenterX = player.x + player.width / 2;
            const playerCenterY = player.y + player.height / 2;
            const enemyCenterX = enemy.x + enemy.width / 2;
            const enemyCenterY = enemy.y + enemy.height / 2;
            const dist = distance(playerCenterX, playerCenterY, enemyCenterX, enemyCenterY);
            
            if (dist < this.range && dist < closestDistance) {
                closestDistance = dist;
                target = enemy;
            }
        }
        
        if (target) {
            console.log(`[${new Date().toISOString()}] 技能${this.name}锁定目标: 距离 ${closestDistance.toFixed(2)}px 的敌人`);
            
            // 创建艾露恩之怒效果
            const elunesWrath = {
                x: target.x + target.width / 2,
                y: target.y + target.height / 2,
                target: target,
                damage: this.damage,
                radius: this.radius,
                duration: this.duration,
                color: this.color,
                type: 'player',
                skillId: this.id,
                isElunesWrath: true,
                skillName: this.name
            };
            
            projectiles.push(elunesWrath);
            this.currentCooldown = this.attackSpeed;
            console.log(`[${new Date().toISOString()}] 技能${this.name}激活成功，持续时间: ${this.duration / 1000}秒，冷却时间: ${this.attackSpeed / 1000}秒`);
            return true;
        } else {
            console.log(`[${new Date().toISOString()}] 技能${this.name}：没有找到目标`);
            return false;
        }
    }
    
    cast(player, enemies, projectiles) {
        // 主动技能，不自动释放
    }
    
    onLevelUp() {
        this.damage += 20;
        this.radius += 20;
        this.duration += 2000;
        this.attackSpeed = Math.max(30000, this.attackSpeed - 5000); // 冷却时间减少5秒
    }
    
    // 获取冷却时间百分比（用于UI显示）
    getCooldownPercentage() {
        return this.currentCooldown / this.attackSpeed;
    }
    
    // 获取当前冷却时间（秒）
    getCurrentCooldownSeconds() {
        return Math.ceil(this.currentCooldown / 1000);
    }
}

// 获取所有可用技能
export function getAllSkills() {
    return [
        new Anger(),
        new Moonfire(),
        new Starfire(),
        new Barkskin(),
        new StarSurge(),
        new Sunfire(),
        new Rejuvenation(),
        new Typhoon(),
        new Starfall(),
        new EluneAspect(),
        new SunMushroom(),
        new CallOfTheWild(),
        new ElunesWrath()
    ];
}

// 技能工厂 - 根据ID创建技能实例
export function createSkill(skillId) {
    switch(skillId) {
        case 'anger':
            return new Anger();
        case 'moonfire':
            return new Moonfire();
        case 'starfire':
            return new Starfire();
        case 'barkskin':
            return new Barkskin();
        case 'starSurge':
            return new StarSurge();
        case 'sunfire':
            return new Sunfire();
        case 'rejuvenation':
            return new Rejuvenation();
        case 'typhoon':
            return new Typhoon();
        case 'starfall':
            return new Starfall();
        case 'eluneAspect':
            return new EluneAspect();
        case 'sunMushroom':
            return new SunMushroom();
        case 'callOfTheWild':
            return new CallOfTheWild();
        case 'elunesWrath':
            return new ElunesWrath();
        default:
            console.error(`未知技能ID: ${skillId}`);
            return null;
    }
}

// 根据稀有度获取技能
export function getSkillsByRarity(rarity) {
    return getAllSkills().filter(skill => skill.rarity === rarity);
}

// 获取随机技能选项（用于升级）
export function getRandomSkillOptions(count = 3, playerLevel = 1, playerClass = 'druid', player = null) {
    // 获取所有技能，并过滤出玩家等级达到要求且与玩家职业匹配的技能
    const allSkills = getAllSkills();
    
    // 过滤可用技能：等级要求、职业匹配，并且考虑玩家已有的技能是否满级
    let availableSkills = allSkills.filter(skill => {
        // 基础过滤条件
        const basicRequirements = skill.levelRequirement <= playerLevel && skill.class === playerClass;
        
        // 如果没有玩家对象或玩家没有技能数组，直接返回基础条件
        if (!player || !player.skills) {
            return basicRequirements;
        }
        
        // 检查玩家是否已经拥有该技能
        const playerSkill = player.skills.find(playerSkill => playerSkill.id === skill.id);
        
        // 如果玩家没有该技能，或者该技能还没有满级，则可用
        return basicRequirements && (!playerSkill || playerSkill.level < playerSkill.maxLevel);
    });
    
    // 15级时，必须包含艾露恩之怒（如果玩家还没有获得或者还没满级）
    if (playerLevel === 15) {
        const elunesWrathSkill = createSkill('elunesWrath');
        if (elunesWrathSkill) {
            // 检查玩家是否已经拥有艾露恩之怒且已满级
            const playerHasElunesWrath = player && player.skills && player.skills.some(skill => 
                skill.id === 'elunesWrath' && skill.level >= skill.maxLevel
            );
            
            // 只有当玩家没有获得或没满级时，才需要确保包含艾露恩之怒
            if (!playerHasElunesWrath) {
                // 确保可用技能中包含艾露恩之怒
                if (!availableSkills.some(skill => skill.id === 'elunesWrath')) {
                    availableSkills.push(elunesWrathSkill);
                }
                
                // 如果可用技能少于请求数量，返回所有可用技能
                if (availableSkills.length <= count) {
                    return availableSkills;
                }
                
                // 确保返回的选项中包含艾露恩之怒
                const filteredSkills = availableSkills.filter(skill => skill.id !== 'elunesWrath');
                const shuffled = [...filteredSkills].sort(() => Math.random() - 0.5);
                const result = [elunesWrathSkill]; // 先添加艾露恩之怒
                
                // 再添加其他随机技能，直到达到指定数量
                for (let i = 0; i < count - 1 && i < filteredSkills.length; i++) {
                    result.push(shuffled[i]);
                }
                
                return result;
            }
        }
    } else if (playerLevel === 20 || playerLevel === 25 || playerLevel === 30) {
        // 20、25、30级时，检查玩家是否已经拥有艾露恩之怒且已满级
        const playerHasElunesWrath = player && player.skills && player.skills.some(skill => 
            skill.id === 'elunesWrath' && skill.level >= skill.maxLevel
        );
        
        // 如果玩家已经拥有艾露恩之怒且已满级，则不返回该技能
        if (playerHasElunesWrath) {
            // 从可用技能中选择其他技能
            const filteredSkills = availableSkills.filter(skill => skill.id !== 'elunesWrath');
            if (filteredSkills.length <= count) {
                return filteredSkills;
            }
            const shuffled = [...filteredSkills].sort(() => Math.random() - 0.5);
            return shuffled.slice(0, count);
        }
        
        // 否则返回艾露恩之怒
        return [createSkill('elunesWrath')];
    }
    
    // 其他等级，正常选择技能
    // 如果可用技能少于请求数量，返回所有可用技能
    if (availableSkills.length <= count) {
        return availableSkills;
    }
    
    // 否则随机选择指定数量的技能
    const shuffled = [...availableSkills].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}
