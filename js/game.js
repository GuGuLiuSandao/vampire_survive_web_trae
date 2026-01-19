// 游戏核心逻辑

import { Druid } from './classes/druid.js';
import { Enemy, spawnEnemy } from './enemy.js';
import { UI } from './ui.js';
import { clamp, randomInt } from './utils.js';
import { getRandomSkillOptions, createSkill, Anger, Moonfire } from './skills.js';

class Game {
    constructor() {
        // 游戏画布和上下文
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 游戏状态
        this.gameState = 'playing'; // playing, paused, gameOver, levelUp
        this.score = 0;
        this.survivalTime = 0;
        
        // 时间相关
        this.lastTime = 0;
        this.deltaTime = 0;
        this.fps = 0;
        this.frameCount = 0;
        this.fpsLastUpdate = 0;
        
        // 游戏对象
        this.player = null;
        this.enemies = [];
        this.projectiles = [];
        this.particles = [];
        
        // 敌人生成
        this.enemySpawnTimer = 0;
        this.enemySpawnInterval = 800; // 缩短初始敌人生成间隔（毫秒）
        this.maxEnemies = 80; // 增加最大敌人数量
        
        // UI
        this.ui = new UI();
        
        // 键盘输入
        this.keys = {};
        
        // 初始化游戏
        this.init();
    }
    
    init() {
        // 游戏状态初始化为开始菜单
        this.gameState = 'start';
        
        // 监听键盘事件
        this.setupEventListeners();
        
        // 开始游戏循环
        requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    setupEventListeners() {
        // 键盘事件
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            // 升级选项键盘控制
            if (this.gameState === 'levelUp') {
                switch(e.code) {
                    case 'Digit1':
                        this.handleLevelUp(0);
                        break;
                    case 'Digit2':
                        this.handleLevelUp(1);
                        break;
                    case 'Digit3':
                        this.handleLevelUp(2);
                        break;
                }
            }
            
            // 主动技能释放
            if (this.gameState === 'playing' && e.code === 'KeyQ') {
                this.activateActiveSkill();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        // 添加鼠标点击释放技能的事件监听
        this.canvas.addEventListener('click', () => {
            if (this.gameState === 'playing') {
                this.activateActiveSkill();
            }
        });
        
        // 技能选择事件
        document.querySelectorAll('.option').forEach(option => {
            option.addEventListener('click', (e) => {
                const optionIndex = parseInt(e.currentTarget.dataset.option);
                this.handleLevelUp(optionIndex);
            });
        });
        
        // 重新开始按钮
        document.getElementById('restart-btn').addEventListener('click', () => {
            this.restart();
        });
        
        // 开始菜单事件
        this.setupStartMenuListeners();
    }
    
    setupStartMenuListeners() {
        // 难度选择
        const difficultyBtns = document.querySelectorAll('.difficulty-btn');
        let selectedDifficulty = 'easy';
        
        difficultyBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // 移除所有按钮的active类
                difficultyBtns.forEach(b => b.classList.remove('active'));
                // 添加当前按钮的active类
                btn.classList.add('active');
                // 保存选中的难度
                selectedDifficulty = btn.dataset.difficulty;
            });
        });
        
        // 职业选择
        const classBtns = document.querySelectorAll('.class-btn');
        let selectedClass = 'druid';
        
        classBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // 移除所有按钮的active类
                classBtns.forEach(b => b.classList.remove('active'));
                // 添加当前按钮的active类
                btn.classList.add('active');
                // 保存选中的职业
                selectedClass = btn.dataset.class;
            });
        });
        
        // 开始游戏按钮
        document.getElementById('start-game-btn').addEventListener('click', () => {
            // 隐藏开始菜单
            document.getElementById('start-menu').classList.add('hidden');
            // 初始化玩家（根据选择的职业）
            this.player = new Druid(this.canvas.width / 2, this.canvas.height / 2);
            // 设置游戏难度
            this.setDifficulty(selectedDifficulty);
            
            // 添加初始技能：一级愤怒和一级月火术
            const angerSkill = new Anger();
            const moonfireSkill = new Moonfire();
            this.player.addSkill(angerSkill);
            this.player.addSkill(moonfireSkill);
            
            // 开始游戏
            this.gameState = 'playing';
        });
    }
    
    setDifficulty(difficulty) {
        // 根据难度调整游戏参数
        switch(difficulty) {
            case 'easy':
                this.enemySpawnInterval = 1000;
                this.maxEnemies = 50;
                break;
            case 'normal':
                this.enemySpawnInterval = 800;
                this.maxEnemies = 80;
                break;
            case 'hard':
                this.enemySpawnInterval = 600;
                this.maxEnemies = 120;
                break;
        }
        
        // 如果玩家已经创建，调整玩家属性
        if (this.player) {
            switch(difficulty) {
                case 'easy':
                    this.player.speed = 160;
                    this.player.health = 100;
                    this.player.maxHealth = 100;
                    break;
                case 'normal':
                    this.player.speed = 140;
                    this.player.health = 80;
                    this.player.maxHealth = 80;
                    break;
                case 'hard':
                    this.player.speed = 120;
                    this.player.health = 60;
                    this.player.maxHealth = 60;
                    break;
            }
        }
    }
    
    gameLoop(timestamp) {
        // 计算Delta时间
        if (this.lastTime === 0) {
            this.lastTime = timestamp;
        }
        
        this.deltaTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        
        // 限制Delta时间，防止游戏在低性能设备上崩溃
        this.deltaTime = clamp(this.deltaTime, 0, 0.1);
        
        // 更新FPS
        this.updateFPS(timestamp);
        
        // 更新游戏状态
        if (this.gameState === 'playing') {
            this.update();
            this.survivalTime += this.deltaTime;
        }
        
        // 渲染游戏
        this.render();
        
        // 继续下一帧
        requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    updateFPS(timestamp) {
        this.frameCount++;
        if (timestamp - this.fpsLastUpdate >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.fpsLastUpdate = timestamp;
        }
    }
    
    update() {
        // 检查玩家是否存在
        if (!this.player) {
            return;
        }
        
        // 更新玩家
        this.player.update(this.keys, this.deltaTime, this.canvas);
        
        // 更新敌人生成器
        this.updateEnemySpawner();
        
        // 更新敌人
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.update(this.player, this.deltaTime, this.projectiles);
            
            // 检查敌人是否超出屏幕
            if (enemy.x < -100 || enemy.x > this.canvas.width + 100 || 
                enemy.y < -100 || enemy.y > this.canvas.height + 100) {
                this.enemies.splice(i, 1);
                continue;
            }
            
            // 检查敌人是否死亡
            if (enemy.health <= 0) {
                this.handleEnemyDeath(enemy);
                this.enemies.splice(i, 1);
                continue;
            }
            
            // 检查敌人是否与玩家碰撞
            if (this.checkCollision(this.player, enemy)) {
                this.player.takeDamage(enemy.damage);
                // 将敌人推开，防止持续碰撞
                enemy.x += Math.sign(enemy.x - this.player.x) * 20;
                enemy.y += Math.sign(enemy.y - this.player.y) * 20;
                
                // 检查玩家是否死亡
                if (this.player.health <= 0) {
                    this.gameOver();
                }
            }
        }
        
        // 更新技能
        if (this.player.skills && Array.isArray(this.player.skills)) {
            this.player.skills.forEach(skill => {
                skill.update(this.player, this.enemies, this.deltaTime, this.projectiles);
            });
        }
        
        // 更新投射物
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            
            // 检查是否是敌人投射物
            if (projectile.type === 'enemy') {
                // 更新敌人投射物位置
                const moveX = Math.cos(projectile.angle) * projectile.speed * this.deltaTime;
                const moveY = Math.sin(projectile.angle) * projectile.speed * this.deltaTime;
                projectile.x += moveX;
                projectile.y += moveY;
                
                // 检查敌人投射物是否击中玩家
                if (this.checkCollision(this.player, projectile)) {
                    this.player.takeDamage(projectile.damage);
                    this.projectiles.splice(i, 1);
                    continue;
                }
                
                // 检查敌人投射物是否超出屏幕
                if (projectile.x < 0 || projectile.x > this.canvas.width || 
                    projectile.y < 0 || projectile.y > this.canvas.height) {
                    this.projectiles.splice(i, 1);
                    continue;
                }
            } else if (projectile.isEffect) {
                // 处理特效投射物
                projectile.duration -= this.deltaTime * 1000;
                
                // 如果是附加在敌人身上的效果（月火、星火）
                if (projectile.targetEnemy) {
                    // 跟随敌人移动
                    projectile.x = projectile.targetEnemy.x + projectile.targetEnemy.width / 2;
                    projectile.y = projectile.targetEnemy.y + projectile.targetEnemy.height / 2;
                    
                    // 处理持续伤害
                    if (projectile.dotDamage) {
                        projectile.targetEnemy.takeDamage(projectile.dotDamage * this.deltaTime);
                    }
                }
                
                // 更新动画帧
                if (projectile.animationFrames && projectile.animationFrames.length > 0 && !projectile.animationPlayed) {
                    projectile.frameTimer += this.deltaTime;
                    if (projectile.frameTimer >= projectile.frameRate) {
                        projectile.currentFrame += 1;
                        projectile.frameTimer = 0;
                        
                        // 如果动画播放完毕，标记为已播放
                        if (projectile.currentFrame >= projectile.animationFrames.length - 1) {
                            projectile.animationPlayed = true;
                        }
                    }
                }
                
                // 检查是否结束
                if (projectile.duration <= 0) {
                    this.projectiles.splice(i, 1);
                    continue;
                }
            } else if (projectile.isMeteor) {
                if (!projectile.hasLanded) {
                    // 处理陨石下落动画
                    // 从右上方30°到60°随机往左下落下
                    projectile.x -= Math.cos(projectile.angle) * projectile.speed * this.deltaTime;
                    projectile.y += Math.sin(projectile.angle) * projectile.speed * this.deltaTime;
                    
                    // 检查是否到达目标位置或超时
                    if (projectile.y >= projectile.targetY || projectile.duration <= 0) {
                        // 标记为已落地
                        projectile.hasLanded = true;
                        
                        // 更新位置为目标位置
                        projectile.x = projectile.targetX;
                        projectile.y = projectile.targetY;
                        
                        // 对范围内敌人造成瞬间伤害
                        let hitCount = 0;
                        for (const enemy of this.enemies) {
                            const enemyCenterX = enemy.x + enemy.width / 2;
                            const enemyCenterY = enemy.y + enemy.height / 2;
                            const dist = Math.sqrt(
                                Math.pow(projectile.targetX - enemyCenterX, 2) + 
                                Math.pow(projectile.targetY - enemyCenterY, 2)
                            );
                            
                            if (dist <= projectile.finalRadius) {
                                enemy.takeDamage(projectile.finalDamage);
                                hitCount++;
                            }
                        }
                        
                        console.log(`[${new Date().toISOString()}] 技能${projectile.skillName}陨石落地，对 ${hitCount} 个敌人造成 ${projectile.finalDamage.toFixed(2)} 伤害`);
                        
                        // 设置蓝圈持续时间为1秒
                        projectile.duration = 1000;
                        projectile.speed = 0;
                        projectile.damage = 0; // 蓝圈持续期间无伤害
                    } else {
                        // 减少持续时间
                        projectile.duration -= this.deltaTime * 1000;
                    }
                } else {
                    // 处理落地后的蓝圈效果
                    projectile.duration -= this.deltaTime * 1000;
                    
                    // 检查蓝圈效果是否结束
                    if (projectile.duration <= 0) {
                        this.projectiles.splice(i, 1);
                    }
                }
            } else if (projectile.isMushroom) {
                // 处理蘑菇投射物
                projectile.duration -= this.deltaTime * 1000;
                
                // 持续伤害和减速效果
                for (const enemy of this.enemies) {
                    const enemyCenterX = enemy.x + enemy.width / 2;
                    const enemyCenterY = enemy.y + enemy.height / 2;
                    const dist = Math.sqrt(
                        Math.pow(projectile.x - enemyCenterX, 2) + 
                        Math.pow(projectile.y - enemyCenterY, 2)
                    );
                    
                    if (dist <= projectile.collisionSize) {
                        // 持续伤害
                        enemy.takeDamage(projectile.damage * this.deltaTime);
                        // 减速效果
                        enemy.speed *= (1 - projectile.slowEffect);
                    }
                }
                
                // 检查是否结束
                if (projectile.duration <= 0) {
                    // 爆炸伤害
                    for (const enemy of this.enemies) {
                        const enemyCenterX = enemy.x + enemy.width / 2;
                        const enemyCenterY = enemy.y + enemy.height / 2;
                        const dist = Math.sqrt(
                            Math.pow(projectile.x - enemyCenterX, 2) + 
                            Math.pow(projectile.y - enemyCenterY, 2)
                        );
                        
                        if (dist <= projectile.explosionRadius) {
                            enemy.takeDamage(projectile.explosionDamage);
                        }
                    }
                    this.projectiles.splice(i, 1);
                    continue;
                }
            } else if (projectile.isElunesWrath) {
                // 处理艾露恩之怒投射物
                projectile.duration -= this.deltaTime * 1000;
                
                // 持续追踪最近的敌人
                let closestEnemy = null;
                let closestDistance = Infinity;
                for (const enemy of this.enemies) {
                    const enemyCenterX = enemy.x + enemy.width / 2;
                    const enemyCenterY = enemy.y + enemy.height / 2;
                    const dist = Math.sqrt(
                        Math.pow(projectile.x - enemyCenterX, 2) + 
                        Math.pow(projectile.y - enemyCenterY, 2)
                    );
                    
                    if (dist < closestDistance) {
                        closestDistance = dist;
                        closestEnemy = enemy;
                    }
                }
                
                // 跟随目标移动
                if (closestEnemy) {
                    projectile.x += (closestEnemy.x + closestEnemy.width / 2 - projectile.x) * 0.1;
                    projectile.y += (closestEnemy.y + closestEnemy.height / 2 - projectile.y) * 0.1;
                }
                
                // 持续范围伤害
                for (const enemy of this.enemies) {
                    const enemyCenterX = enemy.x + enemy.width / 2;
                    const enemyCenterY = enemy.y + enemy.height / 2;
                    const dist = Math.sqrt(
                        Math.pow(projectile.x - enemyCenterX, 2) + 
                        Math.pow(projectile.y - enemyCenterY, 2)
                    );
                    
                    if (dist <= projectile.radius) {
                        enemy.takeDamage(projectile.damage * this.deltaTime);
                    }
                }
                
                // 检查是否结束
                if (projectile.duration <= 0) {
                    this.projectiles.splice(i, 1);
                    continue;
                }
            } else if (projectile.isEffect) {
                // 效果投射物（月火、星火、艾露恩之怒等）
                // 更新动画帧
                if (projectile.animationFrames) {
                    projectile.frameTimer += this.deltaTime;
                    if (projectile.frameTimer >= projectile.frameRate) {
                        projectile.currentFrame += projectile.frameDirection || 1; // 默认正向播放
                        
                        // 循环播放动画
                        if (projectile.currentFrame >= projectile.animationFrames.length) {
                            if (projectile.animationPlayed) {
                                // 如果只需要播放一次，保持在最后一帧
                                projectile.currentFrame = projectile.animationFrames.length - 1;
                            } else {
                                // 否则循环播放
                                projectile.currentFrame = 0;
                                projectile.animationPlayed = true;
                            }
                        }
                        
                        projectile.frameTimer = 0;
                    }
                }
                
                // 更新持续时间
                if (projectile.duration !== undefined) {
                    projectile.duration -= this.deltaTime * 1000; // 转换为毫秒
                    
                    // 处理持续伤害效果
                    if (projectile.dotDamage && projectile.targetEnemy) {
                        const damage = projectile.dotDamage * this.deltaTime;
                        projectile.targetEnemy.takeDamage(damage);
                        console.log(`[${new Date().toISOString()}] 技能${projectile.skillName}持续伤害：对敌人造成 ${damage.toFixed(2)} 伤害，敌人剩余生命值: ${projectile.targetEnemy.health.toFixed(2)}`);
                        
                        // 检查敌人是否死亡
                        if (projectile.targetEnemy.health <= 0) {
                            // 如果敌人死亡，移除效果
                            this.projectiles.splice(i, 1);
                            continue;
                        }
                    }
                    
                    // 检查效果是否结束
                    if (projectile.duration <= 0) {
                        this.projectiles.splice(i, 1);
                        continue;
                    }
                }
                
                // 处理艾露恩之怒效果
                if (projectile.isElunesWrath) {
                    // 跟随目标移动 - 降低追踪速度
                    if (projectile.target && projectile.target.health > 0) {
                        // 计算目标中心位置
                        const targetCenterX = projectile.target.x + projectile.target.width / 2;
                        const targetCenterY = projectile.target.y + projectile.target.height / 2;
                        
                        // 计算当前位置与目标位置的差距
                        const dx = targetCenterX - projectile.x;
                        const dy = targetCenterY - projectile.y;
                        
                        // 降低追踪速度，0.3为追踪系数，数值越小速度越慢
                        const trackingSpeed = 0.3;
                        projectile.x += dx * trackingSpeed;
                        projectile.y += dy * trackingSpeed;
                    }
                    
                    // 对范围内敌人造成伤害
                    for (const enemy of this.enemies) {
                        const enemyCenterX = enemy.x + enemy.width / 2;
                        const enemyCenterY = enemy.y + enemy.height / 2;
                        const dist = Math.sqrt(
                            Math.pow(projectile.x - enemyCenterX, 2) + 
                            Math.pow(projectile.y - enemyCenterY, 2)
                        );
                        
                        if (dist <= projectile.radius) {
                            const damage = projectile.damage * this.deltaTime;
                            enemy.takeDamage(damage);
                            console.log(`[${new Date().toISOString()}] 技能${projectile.skillName}范围伤害：对敌人造成 ${damage.toFixed(2)} 伤害，敌人剩余生命值: ${enemy.health.toFixed(2)}`);
                        }
                    }
                }
            } else {                // 普通投射物（包括技能投射物）
                // 更新动画帧
                if (projectile.animationFrames) {
                    projectile.frameTimer += this.deltaTime;
                    if (projectile.frameTimer >= projectile.frameRate) {
                        projectile.currentFrame += projectile.frameDirection || 1; // 默认正向播放
                        
                        // 12帧来回替换动画
                        if (projectile.currentFrame >= projectile.animationFrames.length - 1) {
                            projectile.frameDirection = -1; // 反向播放
                        } else if (projectile.currentFrame <= 0) {
                            projectile.frameDirection = 1; // 正向播放
                        }
                        
                        projectile.frameTimer = 0;
                    }
                }
                
                if (projectile.update) {
                    // 旧投射物系统的投射物
                    projectile.update(this.deltaTime, this.enemies);
                    
                    // 检查爆炸是否结束
                    if (projectile.isExplosionFinished()) {
                        this.projectiles.splice(i, 1);
                        continue;
                    }
                    
                    // 检查玩家投射物是否超出屏幕
                    if (!projectile.isExploding && (projectile.x < 0 || projectile.x > this.canvas.width || 
                        projectile.y < 0 || projectile.y > this.canvas.height)) {
                        this.projectiles.splice(i, 1);
                        continue;
                    }
                    
                    // 处理爆炸伤害
                    if (projectile.isExploding && projectile.explosionRadius > 0) {
                        for (const enemy of this.enemies) {
                            const enemyCenterX = enemy.x + enemy.width / 2;
                            const enemyCenterY = enemy.y + enemy.height / 2;
                            const dist = Math.sqrt(
                                Math.pow(projectile.x - enemyCenterX, 2) + 
                                Math.pow(projectile.y - enemyCenterY, 2)
                            );
                            
                            if (dist <= projectile.explosionRadius) {
                                enemy.takeDamage(projectile.damage);
                            }
                        }
                    }
                } else {
                    // 新技能系统的投射物
                    // 如果速度是无限大，不更新位置（已经直接击中目标）
                    if (projectile.speed !== Infinity) {
                        // 更新位置
                        const moveX = Math.cos(projectile.angle) * projectile.speed * this.deltaTime;
                        const moveY = Math.sin(projectile.angle) * projectile.speed * this.deltaTime;
                        projectile.x += moveX;
                        projectile.y += moveY;
                        
                        // 检查是否超出屏幕
                        if (projectile.x < 0 || projectile.x > this.canvas.width || 
                            projectile.y < 0 || projectile.y > this.canvas.height) {
                            this.projectiles.splice(i, 1);
                            continue;
                        }
                    }
                    
                    // 处理击中逻辑
                    for (let j = this.enemies.length - 1; j >= 0; j--) {
                        const enemy = this.enemies[j];
                        if (this.checkCollision(projectile, enemy)) {
                            // 应用伤害，考虑玩家的法术伤害加成
                            const finalDamage = projectile.damage * (1 + (this.player.spellDamageBonus || 0));
                            const enemyHealthBefore = enemy.health;
                            enemy.takeDamage(finalDamage);
                            
                            // 记录命中和伤害
                            if (projectile.skillName) {
                                projectile.hits++;
                                projectile.totalDamage += finalDamage;
                                console.log(`[${new Date().toISOString()}] 技能${projectile.skillName}击中敌人，造成 ${finalDamage.toFixed(2)} 伤害，累计命中 ${projectile.hits} 次，总伤害 ${projectile.totalDamage.toFixed(2)}`);
                            }
                            
                            // 检查是否击杀敌人
                            if (enemy.health <= 0 && enemyHealthBefore > 0) {
                                console.log(`[${new Date().toISOString()}] 技能${projectile.skillName}击杀敌人，敌人剩余生命值: ${enemyHealthBefore.toFixed(2)}，造成总伤害: ${finalDamage.toFixed(2)}`);
                            }
                            
                            // 处理范围伤害
                            if (projectile.isAoE) {
                                for (const otherEnemy of this.enemies) {
                                    if (otherEnemy !== enemy) {
                                        const otherEnemyCenterX = otherEnemy.x + otherEnemy.width / 2;
                                        const otherEnemyCenterY = otherEnemy.y + otherEnemy.height / 2;
                                        const dist = Math.sqrt(
                                            Math.pow(enemy.x + enemy.width / 2 - otherEnemyCenterX, 2) + 
                                            Math.pow(enemy.y + enemy.height / 2 - otherEnemyCenterY, 2)
                                        );
                                        
                                        if (dist <= projectile.aoeRadius) {
                                            const aoeDamage = projectile.aoeDamage * (1 + (this.player.spellDamageBonus || 0));
                                            const aoeEnemyHealthBefore = otherEnemy.health;
                                            otherEnemy.takeDamage(aoeDamage);
                                            
                                            // 记录范围伤害
                                            if (projectile.skillName) {
                                                console.log(`[${new Date().toISOString()}] 技能${projectile.skillName}范围伤害击中敌人，造成 ${aoeDamage.toFixed(2)} 伤害`);
                                            }
                                            
                                            // 检查范围伤害是否击杀敌人
                                            if (otherEnemy.health <= 0 && aoeEnemyHealthBefore > 0) {
                                                console.log(`[${new Date().toISOString()}] 技能${projectile.skillName}范围伤害击杀敌人`);
                                            }
                                        }
                                    }
                                }
                            }
                            
                            // 处理穿透
                            if (projectile.pierce !== undefined) {
                                projectile.pierce--;
                                if (projectile.pierce <= 0) {
                                    this.projectiles.splice(i, 1);
                                }
                            } else {
                                // 没有穿透属性，直接移除
                                this.projectiles.splice(i, 1);
                            }
                            break;
                        }
                    }
                }
            }
        }
        
        // 更新UI
        this.ui.update({
            health: this.player.health,
            maxHealth: this.player.maxHealth,
            exp: this.player.exp,
            expRequired: this.player.expRequired,
            level: this.player.level,
            score: this.score,
            fps: this.fps,
            skills: this.player.skills // 添加技能信息
        });
        
        // 检查玩家是否升级
        if (this.player.shouldLevelUp()) {
            this.enterLevelUp();
        }
        
        // 检查玩家是否死亡（无论何种伤害来源）
        if (this.player.health <= 0) {
            this.gameOver();
        }
    }
    
    render() {
        // 清空画布，设置为黑色背景
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 只有当游戏状态不是开始菜单且玩家存在时，才渲染游戏元素
        if (this.gameState !== 'start' && this.player) {
            // 渲染玩家
            this.player.render(this.ctx);
            
            // 渲染敌人
            this.enemies.forEach(enemy => {
                enemy.render(this.ctx);
            });
            
            // 渲染投射物
            this.projectiles.forEach(projectile => {
                try {
                    if (projectile.type === 'enemy') {
                        // 渲染敌人投射物
                        this.ctx.save();
                        this.ctx.fillStyle = projectile.color;
                        this.ctx.translate(projectile.x, projectile.y);
                        this.ctx.rotate(projectile.angle);
                        this.ctx.fillRect(-projectile.width / 2, -projectile.height / 2, projectile.width, projectile.height);
                        this.ctx.restore();
                    } else if (projectile.render) {
                        // 渲染玩家投射物
                        this.ctx.save();
                        projectile.render(this.ctx);
                        this.ctx.restore();
                    } else {
                        // 直接渲染投射物
                        this.ctx.save();
                        
                        // 检查是否有动画帧
                        if (projectile.animationFrames && projectile.animationFrames.length > 0) {
                            // 渲染动画帧
                            this.ctx.translate(projectile.x, projectile.y);
                            
                            // 如果有旋转角度，应用旋转
                            if (projectile.angle !== undefined) {
                                this.ctx.rotate(projectile.angle);
                            }
                            
                            // 渲染当前帧
                            const currentFrame = Math.floor(projectile.currentFrame);
                            const frameImage = projectile.animationFrames[currentFrame];
                            if (frameImage && frameImage.complete) {
                                this.ctx.drawImage(
                                    frameImage, 
                                    -projectile.width / 2, 
                                    -projectile.height / 2, 
                                    projectile.width, 
                                    projectile.height
                                );
                            } else {
                                // 图像未加载完成，使用临时颜色渲染
                                this.ctx.fillStyle = projectile.color || '#ff0000';
                                this.ctx.fillRect(-projectile.width / 2, -projectile.height / 2, projectile.width, projectile.height);
                            }
                        } else if (projectile.isElunesWrath) {
                            // 渲染艾露恩之怒效果
                            this.ctx.translate(projectile.x, projectile.y);
                            this.ctx.globalAlpha = 0.7;
                            this.ctx.fillStyle = '#ffffff';
                            this.ctx.beginPath();
                            this.ctx.arc(0, 0, projectile.radius, 0, Math.PI * 2);
                            this.ctx.fill();
                            // 添加光晕效果
                            this.ctx.fillStyle = '#ffff00';
                            this.ctx.globalAlpha = 0.3;
                            this.ctx.beginPath();
                            this.ctx.arc(0, 0, projectile.radius * 1.5, 0, Math.PI * 2);
                            this.ctx.fill();
                            this.ctx.globalAlpha = 1;
                        } else if (projectile.isEffect) {
                            // 渲染效果投射物（月火、星火等）
                            if (projectile.targetEnemy) {
                                // 跟随敌人移动
                                this.ctx.translate(projectile.targetEnemy.x + projectile.targetEnemy.width / 2, 
                                                  projectile.targetEnemy.y + projectile.targetEnemy.height / 2);
                            } else {
                                this.ctx.translate(projectile.x, projectile.y);
                            }
                            
                            if (projectile.animationFrames && projectile.animationFrames.length > 0) {
                                // 渲染动画效果
                                const currentFrame = Math.floor(projectile.currentFrame);
                                const frameImage = projectile.animationFrames[currentFrame];
                                if (frameImage && frameImage.complete) {
                                    // 优先使用width和height属性，如果没有则使用collisionSize
                                    const width = projectile.width || (projectile.collisionSize * 2);
                                    const height = projectile.height || (projectile.collisionSize * 2);
                                    this.ctx.drawImage(
                                        frameImage, 
                                        -width / 2, 
                                        -height / 2, 
                                        width, 
                                        height
                                    );
                                } else {
                                    // 图像未加载完成，使用临时颜色渲染
                                    this.ctx.fillStyle = '#ffcc00';
                                    this.ctx.beginPath();
                                    this.ctx.arc(0, 0, projectile.collisionSize, 0, Math.PI * 2);
                                    this.ctx.fill();
                                }
                            } else {
                                // 没有动画帧，使用普通渲染
                                this.ctx.fillStyle = projectile.color || '#ffcc00';
                                this.ctx.beginPath();
                                this.ctx.arc(0, 0, projectile.collisionSize, 0, Math.PI * 2);
                                this.ctx.fill();
                            }
                        } else if (projectile.isMeteor) {
                if (!projectile.hasLanded) {
                    // 渲染陨石下落动画
                    this.ctx.save();
                    this.ctx.translate(projectile.x, projectile.y);
                    this.ctx.fillStyle = projectile.color;
                    this.ctx.fillRect(-projectile.width / 2, -projectile.height / 2, projectile.width, projectile.height);
                    // 添加火焰尾迹
                    this.ctx.fillStyle = '#ff6600';
                    this.ctx.fillRect(-2, projectile.height / 2, 4, 20);
                    this.ctx.restore();
                } else {
                    // 渲染落地后的蓝圈效果
                    this.ctx.save();
                    this.ctx.translate(projectile.x, projectile.y);
                    
                    // 绘制蓝圈
                    this.ctx.strokeStyle = '#4444ff';
                    this.ctx.lineWidth = 3;
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, projectile.finalRadius, 0, Math.PI * 2);
                    this.ctx.stroke();
                    
                    // 绘制内部填充（半透明）
                    this.ctx.fillStyle = 'rgba(68, 68, 255, 0.3)';
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, projectile.finalRadius, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    this.ctx.restore();
                }
            } else if (projectile.isMushroom) {
                            // 渲染蘑菇效果
                            this.ctx.translate(projectile.x, projectile.y);
                            this.ctx.fillStyle = projectile.color;
                            this.ctx.beginPath();
                            this.ctx.arc(0, 0, projectile.width / 2, 0, Math.PI * 2);
                            this.ctx.fill();
                            // 添加减速效果指示器
                            this.ctx.strokeStyle = '#87ceeb';
                            this.ctx.setLineDash([5, 5]);
                            this.ctx.beginPath();
                            this.ctx.arc(0, 0, projectile.collisionSize, 0, Math.PI * 2);
                            this.ctx.stroke();
                            this.ctx.setLineDash([]);
                        } else {
                            // 渲染普通投射物
                            this.ctx.translate(projectile.x, projectile.y);
                            this.ctx.rotate(projectile.angle);
                            this.ctx.fillStyle = projectile.color;
                            this.ctx.fillRect(-projectile.width / 2, -projectile.height / 2, projectile.width, projectile.height);
                        }
                        
                        this.ctx.restore();
                    }
                } catch (error) {
                    // 捕获渲染错误，防止游戏崩溃
                    console.error('投射物渲染错误:', error);
                    this.ctx.restore();
                }
            });
            
            // 渲染粒子
            this.particles.forEach(particle => {
                particle.render(this.ctx);
            });
        }
    }
    
    updateEnemySpawner() {
        this.enemySpawnTimer += this.deltaTime * 1000;
        
        if (this.enemySpawnTimer >= this.enemySpawnInterval && this.enemies.length < this.maxEnemies) {
            // 生成敌人
            const enemy = spawnEnemy(this.canvas, this.player);
            this.enemies.push(enemy);
            
            // 重置计时器
            this.enemySpawnTimer = 0;
            
            // 随时间减少生成间隔（增加难度）
            this.enemySpawnInterval = Math.max(200, this.enemySpawnInterval - 5);
        }
    }
    
    handleEnemyDeath(enemy) {
        // 增加玩家经验值
        this.player.gainExp(enemy.expReward);
        
        // 增加分数
        this.score += enemy.scoreReward;
    }
    
    // 激活主动技能
    activateActiveSkill() {
        // 遍历玩家的技能，找到主动技能
        for (const skill of this.player.skills) {
            if (skill.isActiveSkill) {
                // 调用技能的activate方法
                skill.activate(this.player, this.enemies, this.projectiles);
                break;
            }
        }
    }
    
    checkCollision(obj1, obj2) {
        // 碰撞体积：使用固定值，与图片大小无关
        const obj1ColSize = obj1.collisionSize || 16;
        const obj2ColSize = obj2.collisionSize || 16;

        // 计算物体中心点（基于图片大小）
        const obj1CenterX = obj1.x + obj1.width / 2;
        const obj1CenterY = obj1.y + obj1.height / 2;
        const obj2CenterX = obj2.x + obj2.width / 2;
        const obj2CenterY = obj2.y + obj2.height / 2;

        // 计算基于中心点的碰撞盒边界（使用固定碰撞体积）
        const obj1Left = obj1CenterX - obj1ColSize / 2;
        const obj1Right = obj1CenterX + obj1ColSize / 2;
        const obj1Top = obj1CenterY - obj1ColSize / 2;
        const obj1Bottom = obj1CenterY + obj1ColSize / 2;

        const obj2Left = obj2CenterX - obj2ColSize / 2;
        const obj2Right = obj2CenterX + obj2ColSize / 2;
        const obj2Top = obj2CenterY - obj2ColSize / 2;
        const obj2Bottom = obj2CenterY + obj2ColSize / 2;

        // 使用矩形碰撞检测，完全基于固定碰撞体积和图片中心
        return obj1Left < obj2Right &&
               obj1Right > obj2Left &&
               obj1Top < obj2Bottom &&
               obj1Bottom > obj2Top;
    }
    
    enterLevelUp() {
        // 生成随机的升级选项
        this.generateLevelUpOptions();
        
        // 显示升级面板
        this.gameState = 'levelUp';
        this.ui.showLevelUpPanel();
    }
    
    handleLevelUp(optionIndex) {
        // 获取当前选中的技能
        const selectedSkill = this.currentLevelUpOptions[optionIndex];
        
        // 为玩家添加或升级技能
        this.player.addSkill(selectedSkill);
        
        // 升级玩家
        this.player.levelUp();
        
        // 继续游戏
        this.gameState = 'playing';
        this.ui.hideLevelUpPanel();
    }
    
    // 生成随机的升级选项（从技能池中选择3个技能）
    generateLevelUpOptions() {
        // 获取随机技能选项，传入玩家当前等级和职业
        this.currentLevelUpOptions = getRandomSkillOptions(3, this.player.level, this.player.classType);
        
        // 更新UI显示
        this.updateLevelUpPanel();
    }
    
    // 更新升级面板显示
    updateLevelUpPanel() {
        const optionsContainer = document.querySelector('.level-up-options');
        optionsContainer.innerHTML = '';
        
        // 创建选项元素
        this.currentLevelUpOptions.forEach((skill, index) => {
            const optionElement = document.createElement('div');
            optionElement.className = 'option';
            optionElement.dataset.option = index;
            
            // 根据技能稀有度设置颜色
            const rarityColor = skill.getRarityColor();
            
            optionElement.innerHTML = `
                <h3 style="color: ${rarityColor};">${skill.name}</h3>
                <p>${skill.description}</p>
                <div class="skill-rarity" style="color: ${rarityColor};">
                    稀有度: ${skill.rarity === 'common' ? '普通' : 
                           skill.rarity === 'rare' ? '稀有' : 
                           skill.rarity === 'epic' ? '史诗' : '传说'}
                </div>
            `;
            
            // 添加点击事件监听
            optionElement.addEventListener('click', (e) => {
                const optionIndex = parseInt(e.currentTarget.dataset.option);
                this.handleLevelUp(optionIndex);
            });
            
            optionsContainer.appendChild(optionElement);
        });
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        this.ui.showGameOverPanel({
            score: this.score,
            survivalTime: this.survivalTime
        });
    }
    
    restart() {
        // 重置游戏状态
        this.gameState = 'start';
        this.score = 0;
        this.survivalTime = 0;
        this.lastTime = 0;
        this.deltaTime = 0;
        this.fps = 0;
        this.frameCount = 0;
        this.fpsLastUpdate = 0;
        
        // 重置敌人生成器
        this.enemySpawnTimer = 0;
        this.enemySpawnInterval = 1000;
        
        // 清空游戏对象
        this.enemies = [];
        this.projectiles = [];
        this.particles = [];
        this.player = null;
        
        // 显示开始菜单
        document.getElementById('start-menu').classList.remove('hidden');
        
        // 隐藏游戏结束面板
        this.ui.hideGameOverPanel();
    }
}

// 导出Game类
export { Game };