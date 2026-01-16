// 游戏核心逻辑

import { Player } from './player.js';
import { Enemy, spawnEnemy } from './enemy.js';
import { Weapon } from './weapon.js';
import { UI } from './ui.js';
import { clamp, randomInt } from './utils.js';

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
        this.weapons = [];
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
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
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
        // 难度选择按钮
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
        
        // 开始游戏按钮
        document.getElementById('start-game-btn').addEventListener('click', () => {
            // 隐藏开始菜单
            document.getElementById('start-menu').classList.add('hidden');
            // 初始化玩家
            this.player = new Player(this.canvas.width / 2, this.canvas.height / 2);
            // 设置游戏难度
            this.setDifficulty(selectedDifficulty);
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
        if (this.gameState !== 'start') {
            this.render();
        }
        
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
        
        // 更新武器
        this.player.weapons.forEach(weapon => {
            weapon.update(this.player, this.enemies, this.deltaTime, this.projectiles);
        });
        
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
                    // 这里不需要额外的死亡检查，因为update方法末尾有通用检查
                    continue;
                }
                
                // 检查敌人投射物是否超出屏幕
                if (projectile.x < 0 || projectile.x > this.canvas.width || 
                    projectile.y < 0 || projectile.y > this.canvas.height) {
                    this.projectiles.splice(i, 1);
                    continue;
                }
            } else {
                // 更新玩家投射物
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
                
                // 检查玩家投射物是否击中敌人
                if (!projectile.isExploding) {
                    for (let j = this.enemies.length - 1; j >= 0; j--) {
                        const enemy = this.enemies[j];
                        if (this.checkCollision(projectile, enemy)) {
                            enemy.takeDamage(projectile.damage);
                            // 处理投射物的弹跳和爆炸
                            if (projectile.handleHit(enemy, this.enemies)) {
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
            fps: this.fps
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
        // 清空画布
        this.ctx.fillStyle = '#2a2a2a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 渲染玩家
        this.player.render(this.ctx);
        
        // 渲染敌人
        this.enemies.forEach(enemy => {
            enemy.render(this.ctx);
        });
        
        // 渲染投射物
        this.projectiles.forEach(projectile => {
            if (projectile.type === 'enemy') {
                // 渲染敌人投射物
                this.ctx.save();
                this.ctx.fillStyle = projectile.color;
                this.ctx.translate(projectile.x, projectile.y);
                this.ctx.rotate(projectile.angle);
                this.ctx.fillRect(-projectile.width / 2, -projectile.height / 2, projectile.width, projectile.height);
                this.ctx.restore();
            } else {
                // 渲染玩家投射物
                projectile.render(this.ctx);
            }
        });
        
        // 渲染武器
        this.player.weapons.forEach(weapon => {
            weapon.render(this.ctx, this.player);
        });
        
        // 渲染粒子
        this.particles.forEach(particle => {
            particle.render(this.ctx);
        });
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
    
    checkCollision(obj1, obj2) {
        return obj1.x < obj2.x + obj2.width &&
               obj1.x + obj1.width > obj2.x &&
               obj1.y < obj2.y + obj2.height &&
               obj1.y + obj1.height > obj2.y;
    }
    
    enterLevelUp() {
        // 生成随机的升级选项
        this.generateLevelUpOptions();
        
        // 显示升级面板
        this.gameState = 'levelUp';
        this.ui.showLevelUpPanel();
    }
    
    handleLevelUp(optionIndex) {
        // 获取当前选中的武器类型
        const selectedWeapon = this.currentLevelUpOptions[optionIndex];
        
        // 为玩家添加或升级武器
        this.player.addWeapon(selectedWeapon);
        
        // 升级玩家
        this.player.levelUp();
        
        // 继续游戏
        this.gameState = 'playing';
        this.ui.hideLevelUpPanel();
    }
    
    // 生成随机的升级选项（从4种武器中选择3种）
    generateLevelUpOptions() {
        // 所有可用武器类型
        const allWeapons = ['knife', 'magicBall', 'whip', 'laser'];
        
        // 随机打乱武器顺序
        const shuffledWeapons = [...allWeapons].sort(() => Math.random() - 0.5);
        
        // 选择前3种
        this.currentLevelUpOptions = shuffledWeapons.slice(0, 3);
        
        // 更新UI显示
        this.updateLevelUpPanel();
    }
    
    // 更新升级面板显示
    updateLevelUpPanel() {
        const optionsContainer = document.querySelector('.level-up-options');
        optionsContainer.innerHTML = '';
        
        // 武器名称映射
        const weaponNames = {
            'knife': '飞刀',
            'magicBall': '魔法球',
            'whip': '环刃',
            'laser': '激光炮'
        };
        
        // 武器描述映射
        const weaponDescriptions = {
            'knife': '投掷锋利的飞刀攻击敌人，可弹跳',
            'magicBall': '发射大型魔法球，击中后产生爆炸',
            'whip': '旋转的环刃攻击周围的敌人',
            'laser': '瞬间发射激光，穿透多个敌人'
        };
        
        // 创建选项元素
        this.currentLevelUpOptions.forEach((weaponType, index) => {
            const optionElement = document.createElement('div');
            optionElement.className = 'option';
            optionElement.dataset.option = index;
            
            optionElement.innerHTML = `
                <h3>${weaponNames[weaponType]}</h3>
                <p>${weaponDescriptions[weaponType]}</p>
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
        this.weapons = [];
        this.projectiles = [];
        this.particles = [];
        this.player = null;
        
        // 显示开始菜单
        document.getElementById('start-menu').classList.remove('hidden');
        
        // 隐藏游戏结束面板
        this.ui.hideGameOverPanel();
    }
}

// 导出游戏实例
export const game = new Game();