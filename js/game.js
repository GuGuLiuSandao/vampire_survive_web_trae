// 游戏核心逻辑

import { Druid } from './classes/druid.js';
import { Enemy, spawnEnemy } from './enemy.js';
import { UI } from './ui.js';
import { clamp, ResourceManager, checkCollision, distance } from './utils.js';
import { getRandomSkillOptions, Anger, Moonfire } from './skills.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.gameState = 'start'; 
        this.score = 0;
        this.survivalTime = 0;
        this.debugMode = false;

        this.lastTime = 0;
        this.deltaTime = 0;
        this.fps = 0;
        this.frameCount = 0;
        this.fpsLastUpdate = 0;
        
        this.player = null;
        this.enemies = [];
        this.projectiles = [];
        
        this.enemySpawnTimer = 0;
        this.enemySpawnInterval = 1000;
        this.maxEnemies = 100;
        
        this.ui = new UI();
        this.keys = {};
        
        this.init();
    }
    
    init() {
        ResourceManager.preload();
        this.setupEventListeners();
        requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'KeyP') {
                this.debugMode = !this.debugMode;
                console.log("调试模式:", this.debugMode);
            }
            if (this.gameState === 'levelUp') {
                switch(e.code) {
                    case 'Digit1': this.handleLevelUp(0); break;
                    case 'Digit2': this.handleLevelUp(1); break;
                    case 'Digit3': this.handleLevelUp(2); break;
                }
            }
            if (this.gameState === 'playing' && e.code === 'KeyQ') {
                this.activateActiveSkill();
            }
        });
        
        document.addEventListener('keyup', (e) => this.keys[e.code] = false);
        this.canvas.addEventListener('click', () => {
            if (this.gameState === 'playing') this.activateActiveSkill();
        });
        document.getElementById('restart-btn').addEventListener('click', () => this.restart());
        
        this.setupStartMenuListeners();
    }
    
    setupStartMenuListeners() {
        const difficultyBtns = document.querySelectorAll('.difficulty-btn');
        let selectedDifficulty = 'easy';
        difficultyBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                difficultyBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedDifficulty = btn.dataset.difficulty;
            });
        });
        
        const classBtns = document.querySelectorAll('.class-btn');
        classBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                classBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                // 目前只有德鲁伊，后续可扩展
            });
        });
        
        document.getElementById('start-game-btn').addEventListener('click', () => {
            document.getElementById('start-menu').classList.add('hidden');
            this.player = new Druid(this.canvas.width / 2, this.canvas.height / 2);
            
            // 难度设置
            if(selectedDifficulty === 'easy') {
                this.enemySpawnInterval = 1000;
                // [修复] 大幅度降低简单模式下升级所需经验
                this.player.expRequired = 10; // 初始经验需求从20降到10
                // 保存经验增长系数，用于后续修改
                this.player._expGrowthFactor = 1.2; // 从1.5降到1.2，大幅度降低升级所需经验
            }
            else if(selectedDifficulty === 'normal') {
                this.enemySpawnInterval = 800;
                this.player.expRequired = 20; // 正常模式保持默认值
                this.player._expGrowthFactor = 1.3; // 稍微降低经验增长系数
            }
            else {
                this.enemySpawnInterval = 600;
                this.player.expRequired = 25; // 困难模式保持较高经验需求
                this.player._expGrowthFactor = 1.5; // 保持默认增长系数
            }

            // 初始技能
            this.player.addSkill(new Anger());
            this.player.addSkill(new Moonfire());
            
            this.gameState = 'playing';
        });
    }

    gameLoop(timestamp) {
        if (this.lastTime === 0) this.lastTime = timestamp;
        this.deltaTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        this.deltaTime = clamp(this.deltaTime, 0, 0.1);
        
        this.updateFPS(timestamp);
        
        if (this.gameState === 'playing') {
            this.update();
            this.survivalTime += this.deltaTime;
        }
        
        this.render();
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
        if (!this.player) return;
        
        // 1. 更新玩家
        this.player.update(this.keys, this.deltaTime, this.canvas);
        
        // 2. 更新敌人生成
        this.updateEnemySpawner();
        
        // 3. 更新敌人 (确保重置速度)
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            // [修复] 蘑菇减速逻辑：先重置回基础速度，防止无限叠加
            if (enemy.baseSpeed) {
                enemy.speed = enemy.baseSpeed;
            } else {
                enemy.baseSpeed = enemy.speed; // 初始化基础速度
            }

            enemy.update(this.player, this.deltaTime, this.projectiles);
            
            // 边界删除 - 限制在屏幕范围内，确保游戏边界和屏幕边界保持一致
            if (enemy.x < -50 || enemy.x > this.canvas.width + 50 || enemy.y < -50 || enemy.y > this.canvas.height + 50) {
                this.enemies.splice(i, 1);
                continue;
            }
            // 死亡逻辑
            if (enemy.health <= 0) {
                this.handleEnemyDeath(enemy);
                this.enemies.splice(i, 1);
                continue;
            }
            // 玩家碰撞
            if (checkCollision(this.player, enemy)) {
                this.player.takeDamage(enemy.damage * this.deltaTime);
                if (this.player.health <= 0) this.gameOver();
            }
        }
        
        // 4. 更新技能 (CD等)
        this.player.skills.forEach(skill => {
            skill.update(this.player, this.enemies, this.deltaTime, this.projectiles);
        });
        
        // 5. 更新投射物
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            
            // 动画 - 尊重animationPlayed属性，只播放一次动画
            if (p.animationFrames) {
                p.frameTimer += this.deltaTime;
                if (p.frameTimer >= p.frameRate) {
                    // 只有在没有播放完成时才更新帧
                    if (!p.animationPlayed) {
                        p.currentFrame += 1;
                        // 检查是否播放到最后一帧
                        if (p.currentFrame >= p.animationFrames.length - 1) {
                            p.animationPlayed = true;
                            p.currentFrame = p.animationFrames.length - 1; // 停留在最后一帧
                        }
                    }
                    p.frameTimer = 0;
                }
            }

            // --- 特殊投射物逻辑 ---

            // A. 向日蘑菇 (范围减速 + 伤害)
            if (p.isMushroom) {
                p.duration -= this.deltaTime * 1000;
                
                // 持续效果
                for (const enemy of this.enemies) {
                    const d = distance(p.x, p.y, enemy.x + enemy.width/2, enemy.y + enemy.height/2);
                    if (d <= p.collisionSize) {
                        enemy.takeDamage(p.damage * this.deltaTime);
                        // [修复] 应用减速: 基于当前已重置的速度
                        enemy.speed = enemy.speed * (1 - p.slowEffect);
                    }
                }
                
                // 爆炸
                if (p.duration <= 0) {
                    for (const enemy of this.enemies) {
                        const d = distance(p.x, p.y, enemy.x + enemy.width/2, enemy.y + enemy.height/2);
                        if (d <= p.explosionRadius) enemy.takeDamage(p.explosionDamage);
                    }
                    this.projectiles.splice(i, 1);
                }
                continue;
            }

            // B. 艾露恩之怒 (光柱追踪)
            if (p.isElunesWrath) {
                p.duration -= this.deltaTime * 1000;

                // 追踪最近敌人
                let target = null;
                let minDist = Infinity;
                for(const e of this.enemies) {
                    const d = distance(p.x, p.y, e.x + e.width/2, e.y + e.height/2);
                    if(d < minDist) { minDist = d; target = e; }
                }
                // 缓慢移动向目标
                if (target) {
                    const tx = target.x + target.width/2;
                    const ty = target.y + target.height/2;
                    p.x += (tx - p.x) * 2 * this.deltaTime; // 追踪速度
                    p.y += (ty - p.y) * 2 * this.deltaTime;
                }

                // 范围伤害
                for (const enemy of this.enemies) {
                    const d = distance(p.x, p.y, enemy.x + enemy.width/2, enemy.y + enemy.height/2);
                    if (d <= p.radius) {
                        enemy.takeDamage(p.damage * this.deltaTime);
                    }
                }

                // 结束逻辑
                if (p.duration <= 0) {
                    // [新增] "天涯共银辉" 爆炸效果
                    if (p.hasSilverHorizon) {
                         // 全屏/大范围爆炸
                         for (const enemy of this.enemies) {
                             if (distance(p.x, p.y, enemy.x, enemy.y) < 500) {
                                 enemy.takeDamage(200); // 高额爆炸伤害
                             }
                         }
                    }
                    this.projectiles.splice(i, 1);
                }
                continue;
            }
            
            // C. 普通特效 (月火等)
            if (p.isEffect) {
                p.duration -= this.deltaTime * 1000;
                if (p.targetEnemy && p.targetEnemy.health > 0) {
                    p.x = p.targetEnemy.x + p.targetEnemy.width/2;
                    p.y = p.targetEnemy.y + p.targetEnemy.height/2;
                    if (p.dotDamage) p.targetEnemy.takeDamage(p.dotDamage * this.deltaTime);
                } else if (p.targetEnemy) {
                    p.duration = 0; 
                }
                if (p.duration <= 0) this.projectiles.splice(i, 1);
                continue;
            }
            
            // D. 星辰坠落陨石
            if (p.isMeteor) {
                // 更新陨石位置
                p.x += Math.cos(p.angle) * p.speed * this.deltaTime;
                p.y += Math.sin(p.angle) * p.speed * this.deltaTime;
                
                // 更新持续时间
                p.duration -= this.deltaTime * 1000;
                
                let hit = false;
                // 碰撞检测 - 下落过程中就能造成伤害
                for (let j = this.enemies.length - 1; j >= 0; j--) {
                    const enemy = this.enemies[j];
                    const pRect = {
                        x: p.x - p.width/2, y: p.y - p.height/2, 
                        width: p.width, height: p.height, collisionSize: p.collisionSize 
                    };
                    
                    if (checkCollision(pRect, enemy)) {
                        const dmg = p.damage * (1 + (this.player.spellDamageBonus || 0));
                        enemy.takeDamage(dmg);
                        hit = true;
                        if (enemy.health <= 0) {
                             this.handleEnemyDeath(enemy);
                             this.enemies.splice(j, 1);
                        }
                        break; // 不能穿透，只击中一个敌人
                    }
                }
                
                // 边界检查 - 限制在屏幕范围内
                const canvas = p.canvas || this.canvas;
                if (hit || p.duration <= 0 || p.x < -50 || p.x > canvas.width + 50 || p.y < -50 || p.y > canvas.height + 50) {
                    this.projectiles.splice(i, 1);
                }
                continue;
            }
            
            // D. 普通弹道
            p.x += Math.cos(p.angle) * p.speed * this.deltaTime;
            p.y += Math.sin(p.angle) * p.speed * this.deltaTime;
            
            let hit = false;
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const enemy = this.enemies[j];
                const pRect = {
                    x: p.x - p.width/2, y: p.y - p.height/2, 
                    width: p.width, height: p.height, collisionSize: p.collisionSize 
                };
                
                if (checkCollision(pRect, enemy)) {
                    const dmg = p.damage * (1 + (this.player.spellDamageBonus || 0));
                    enemy.takeDamage(dmg);
                    hit = true;
                    if (enemy.health <= 0) {
                         this.handleEnemyDeath(enemy);
                         this.enemies.splice(j, 1);
                    }
                    if (!p.pierce || --p.pierce <= 0) break;
                }
            }
            
            // 边界检查 - 限制在屏幕范围内，确保游戏边界和屏幕边界保持一致
            if ((hit && !p.pierce) || p.x < -50 || p.x > this.canvas.width + 50 || p.y < -50 || p.y > this.canvas.height + 50) {
                this.projectiles.splice(i, 1);
            }
        }
        
        // 更新UI
        this.ui.update({
            health: this.player.health, maxHealth: this.player.maxHealth,
            exp: this.player.exp, expRequired: this.player.expRequired,
            level: this.player.level, score: this.score, fps: this.fps,
            skills: this.player.skills
        });
        
        // 升级检查
        if (this.player.shouldLevelUp()) this.enterLevelUp();
    }
    
    // 渲染
    render() {
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.gameState !== 'start' && this.player) {
            const renderList = [];
            renderList.push(this.player);
            this.enemies.forEach(e => renderList.push(e));
            // Y-Sort
            renderList.sort((a, b) => (a.y + a.height) - (b.y + b.height));
            
            renderList.forEach(entity => {
                if (entity.render) entity.render(this.ctx, this.debugMode);
            });
            
            this.projectiles.forEach(p => {
                this.ctx.save();
                this.ctx.translate(p.x, p.y + (p.yOffset || 0));
                
                // [修复] 应用旋转偏移
                if (!p.isEffect && !p.isElunesWrath && !p.isMushroom && p.angle !== undefined) {
                    this.ctx.rotate(p.angle + (p.rotationOffset || 0));
                }
                
                // 渲染不同类型投射物
                if (p.isElunesWrath) {
                    // 艾露恩之怒范围伤害虚线显示
                    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
                    this.ctx.setLineDash([5, 5]); // 设置虚线样式
                    this.ctx.lineWidth = 3;
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, p.radius, 0, Math.PI*2);
                    this.ctx.stroke();
                    this.ctx.setLineDash([]); // 重置为实线
                    
                    // 艾露恩之怒核心效果
                    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, p.radius, 0, Math.PI*2);
                    this.ctx.fill();
                    this.ctx.strokeStyle = '#fff';
                    this.ctx.lineWidth = 2;
                    this.ctx.stroke();
                } else if (p.isMushroom) {
                    this.ctx.fillStyle = p.color;
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, 15, 0, Math.PI*2);
                    this.ctx.fill();
                    // [修复] 添加虚线范围提示，始终显示
                    this.ctx.strokeStyle = 'rgba(50, 205, 50, 0.3)';
                    this.ctx.setLineDash([5, 5]); // 设置虚线样式
                    this.ctx.lineWidth = 2;
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, p.collisionSize, 0, Math.PI*2);
                    this.ctx.stroke();
                    this.ctx.setLineDash([]); // 重置为实线
                    if (this.debugMode) {
                        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                        this.ctx.beginPath();
                        this.ctx.arc(0, 0, p.collisionSize, 0, Math.PI*2);
                        this.ctx.stroke();
                    }

                } else if (p.isMeteor) {
                    // 星辰坠落陨石效果
                    this.ctx.fillStyle = p.color;
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, 8, 0, Math.PI*2);
                    this.ctx.fill();
                    
                    // 陨石落地后的范围伤害虚线显示
                    if (p.hasLanded) {
                        this.ctx.strokeStyle = 'rgba(163, 53, 238, 0.6)';
                        this.ctx.setLineDash([5, 5]); // 设置虚线样式
                        this.ctx.lineWidth = 2;
                        this.ctx.beginPath();
                        this.ctx.arc(0, 0, 40, 0, Math.PI*2);
                        this.ctx.stroke();
                        this.ctx.setLineDash([]); // 重置为实线
                    }
                } else if (p.isAoE) {
                    // 星火术范围伤害虚线显示
                    this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
                    this.ctx.setLineDash([5, 5]); // 设置虚线样式
                    this.ctx.lineWidth = 2;
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, p.aoeRadius || 60, 0, Math.PI*2);
                    this.ctx.stroke();
                    this.ctx.setLineDash([]); // 重置为实线
                    
                    // 星火术核心效果
                    if (p.animationFrames && p.animationFrames.length > 0) {
                        const img = p.animationFrames[Math.floor(p.currentFrame)];
                        if (img && img.complete && img.naturalWidth > 0) {
                            this.ctx.drawImage(img, -p.width/2, -p.height/2, p.width, p.height);
                        } else {
                            this.ctx.fillStyle = 'rgba(255, 215, 0, 0.8)';
                            this.ctx.beginPath();
                            this.ctx.arc(0, 0, 20, 0, Math.PI*2);
                            this.ctx.fill();
                        }
                    }
                } else if (p.isExplosion) {
                    // 阳炎术爆炸效果 - 和星火术一样的黄色圆形虚线范围
                    const progress = (Date.now() - p.startTime) / p.duration;
                    const alpha = 0.8 * (1 - progress); // 逐渐消失
                    
                    // 爆炸核心 - 简单的橙色圆形
                    this.ctx.fillStyle = `rgba(255, 165, 0, ${alpha})`;
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, 20, 0, Math.PI*2);
                    this.ctx.fill();
                    
                    // 黄色圆形虚线范围 - 和星火术一致，固定透明度确保1秒内清晰可见
                    this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
                    this.ctx.setLineDash([5, 5]); // 设置虚线样式
                    this.ctx.lineWidth = 2;
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, p.radius, 0, Math.PI*2);
                    this.ctx.stroke();
                    this.ctx.setLineDash([]); // 重置为实线
                } else if (p.animationFrames && p.animationFrames.length > 0) {
                    const img = p.animationFrames[Math.floor(p.currentFrame)];
                    if (img && img.complete && img.naturalWidth > 0) {
                        this.ctx.drawImage(img, -p.width/2, -p.height/2, p.width, p.height);
                    } else {
                        this.ctx.fillStyle = p.color || 'yellow';
                        this.ctx.fillRect(-p.width/2, -p.height/2, p.width, p.height);
                    }
                } else {
                    this.ctx.fillStyle = p.color || 'yellow';
                    this.ctx.fillRect(-p.width/2, -p.height/2, p.width, p.height);
                }
                
                if (this.debugMode) {
                    this.ctx.strokeStyle = 'orange';
                    this.ctx.strokeRect(-p.width/2, -p.height/2, p.width, p.height);
                }
                this.ctx.restore();
            });
        }
    }
    
    updateEnemySpawner() {
        this.enemySpawnTimer += this.deltaTime * 1000;
        if (this.enemySpawnTimer >= this.enemySpawnInterval && this.enemies.length < this.maxEnemies) {
            const enemy = spawnEnemy(this.canvas, this.player);
            this.enemies.push(enemy);
            this.enemySpawnTimer = 0;
            this.enemySpawnInterval = Math.max(200, 1000 - this.survivalTime * 5);
        }
    }
    
    handleEnemyDeath(enemy) {
        this.player.gainExp(enemy.expReward);
        this.score += enemy.scoreReward;
        
        // 阳炎术效果：敌人死亡时如果有月火效果，触发爆炸
        this.triggerSunfireExplosion(enemy);
    }
    
    triggerSunfireExplosion(enemy) {
        // 检查玩家是否有阳炎术技能
        const sunfireSkill = this.player.skills.find(skill => skill.id === 'sunfire');
        if (!sunfireSkill) return;
        
        // 检查敌人是否有月火灼烧效果（通过isMoonfireBurning属性或projectiles中的月火特效）
        const hasMoonfireEffect = enemy.isMoonfireBurning || 
            this.projectiles.some(p => p.isEffect && p.skillId === 'moonfire' && p.targetEnemy === enemy);
        
        if (hasMoonfireEffect) {
            console.log(`[${new Date().toISOString()}] 阳炎术触发：敌人死亡时爆炸`);
            
            // 创建爆炸效果
            const explosion = {
                x: enemy.x + enemy.width / 2,
                y: enemy.y + enemy.height / 2,
                damage: sunfireSkill.explosionDamage,
                radius: sunfireSkill.explosionRadius,
                duration: 1000, // 爆炸持续时间1秒，和星火术一致
                color: '#ffa500',
                type: 'player',
                skillId: 'sunfire',
                skillName: '阳炎术爆炸',
                isExplosion: true,
                startTime: Date.now()
            };
            
            this.projectiles.push(explosion);
            
            // 对爆炸范围内的敌人造成伤害
            let hitCount = 0;
            let totalDamage = 0;
            let killCount = 0;
            
            for (const otherEnemy of this.enemies) {
                if (otherEnemy !== enemy) {
                    const otherEnemyCenterX = otherEnemy.x + otherEnemy.width / 2;
                    const otherEnemyCenterY = otherEnemy.y + otherEnemy.height / 2;
                    const dist = distance(explosion.x, explosion.y, otherEnemyCenterX, otherEnemyCenterY);
                    
                    if (dist <= sunfireSkill.explosionRadius) {
                        const enemyHealthBefore = otherEnemy.health;
                        otherEnemy.takeDamage(sunfireSkill.explosionDamage);
                        
                        hitCount++;
                        totalDamage += sunfireSkill.explosionDamage;
                        
                        if (otherEnemy.health <= 0 && enemyHealthBefore > 0) {
                            killCount++;
                        }
                    }
                }
            }
            
            if (hitCount > 0) {
                console.log(`[${new Date().toISOString()}] 阳炎术爆炸击中 ${hitCount} 个敌人，造成总伤害 ${totalDamage.toFixed(2)}，击杀 ${killCount} 个敌人`);
            }
        }
    }
    
    activateActiveSkill() {
        for (const skill of this.player.skills) {
            if (skill.isActiveSkill) {
                skill.activate(this.player, this.enemies, this.projectiles);
                break;
            }
        }
    }

    enterLevelUp() {
        this.generateLevelUpOptions();
        this.gameState = 'levelUp';
        this.ui.showLevelUpPanel();
    }
    
    generateLevelUpOptions() {
        // [修复] 传递 this.player
        this.currentLevelUpOptions = getRandomSkillOptions(3, this.player.level, this.player.classType, this.player);
        this.updateLevelUpPanel();
    }
    
    updateLevelUpPanel() {
        const optionsContainer = document.querySelector('.level-up-options');
        optionsContainer.innerHTML = '';
        this.currentLevelUpOptions.forEach((skill, index) => {
            const optionElement = document.createElement('div');
            optionElement.className = 'option';
            optionElement.dataset.option = index;
            optionElement.dataset.keyHint = index + 1;
            const rarityColor = skill.getRarityColor();
            
            const isNew = !this.player.skills.find(s => s.id === skill.id);
            const levelText = isNew ? "获取" : `升级到 Lv.${skill.level + 1}`;
            
            optionElement.innerHTML = `
                <h3 style="color: ${rarityColor};">${skill.name}</h3>
                <p>${skill.description}</p>
                <div style="margin-top:10px; font-weight:bold; color:#fff">${levelText}</div>
                <div class="skill-rarity" style="color: ${rarityColor};">稀有度: ${skill.rarity.toUpperCase()}</div>
            `;
            optionElement.addEventListener('click', () => this.handleLevelUp(index));
            optionsContainer.appendChild(optionElement);
        });
    }

    handleLevelUp(index) {
        if (index >= 0 && index < this.currentLevelUpOptions.length) {
            const skill = this.currentLevelUpOptions[index];
            this.player.addSkill(skill);
            this.player.levelUp();
            this.gameState = 'playing';
            this.ui.hideLevelUpPanel();
        }
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        this.ui.showGameOverPanel({ score: this.score, survivalTime: this.survivalTime });
    }

    restart() {
        this.gameState = 'start';
        this.score = 0;
        this.survivalTime = 0;
        this.enemies = [];
        this.projectiles = [];
        this.player = null;
        document.getElementById('start-menu').classList.remove('hidden');
        this.ui.hideGameOverPanel();
    }
}

export { Game };