// UI系统

import { formatTime } from './utils.js';

class UI {
    constructor() {
        this.healthValue = document.getElementById('health-value');
        this.healthFill = document.getElementById('health-fill');
        this.expValue = document.getElementById('exp-value');
        this.expRequired = document.getElementById('exp-required');
        this.expFill = document.getElementById('exp-fill');
        this.levelValue = document.getElementById('level-value');
        this.scoreValue = document.getElementById('score-value');
        this.fpsValue = document.getElementById('fps-value');
        
        this.skillsPanel = document.querySelector('.skills-panel');
        
        this.levelUpPanel = document.getElementById('level-up-panel');
        this.gameOverPanel = document.getElementById('game-over-panel');
        this.finalScore = document.getElementById('final-score');
        this.survivalTime = document.getElementById('survival-time');
        
        this.legendarySkillBtn = document.getElementById('legendary-skill-btn');
        this.skillCooldown = document.getElementById('skill-cooldown');
        this.skillCooldownOverlay = document.getElementById('skill-cooldown-overlay');
        
        // 底部面板收起/展开功能
        this.bottomLeftPanel = document.querySelector('.bottom-left-panel');
        this.toggleBtn = document.querySelector('.toggle-btn');
        this.setupPanelToggle();
    }
    
    setupPanelToggle() {
        if (this.toggleBtn) {
            // 确保DOM完全加载后再添加事件监听器
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this.toggleBtn.addEventListener('click', () => {
                        this.bottomLeftPanel.classList.toggle('collapsed');
                    });
                });
            } else {
                this.toggleBtn.addEventListener('click', () => {
                    this.bottomLeftPanel.classList.toggle('collapsed');
                });
            }
        }
    }
    
    update(gameState) {
        // 基础信息
        this.healthValue.textContent = Math.ceil(gameState.health);
        this.healthFill.style.width = `${(gameState.health / gameState.maxHealth) * 100}%`;
        
        this.expValue.textContent = Math.floor(gameState.exp);
        this.expRequired.textContent = gameState.expRequired;
        this.expFill.style.width = `${(gameState.exp / gameState.expRequired) * 100}%`;
        
        this.levelValue.textContent = gameState.level;
        this.scoreValue.textContent = gameState.score;
        this.fpsValue.textContent = gameState.fps;
        
        // 技能列表
        this.updateSkillsPanel(gameState.skills);
        
        // 大招显示逻辑
        if (gameState.skills) {
            const elunesWrathSkill = gameState.skills.find(skill => skill.id === 'elunesWrath');
            if (elunesWrathSkill) {
                this.legendarySkillBtn.classList.remove('hidden');
                
                // [适配] 直接读取 currentCooldown (毫秒)
                const cooldownSeconds = Math.ceil(elunesWrathSkill.currentCooldown / 1000);
                this.skillCooldown.textContent = cooldownSeconds > 0 ? `${cooldownSeconds}s` : 'Q';
                
                const pct = elunesWrathSkill.getCooldownPct ? elunesWrathSkill.getCooldownPct() : 0;
                this.skillCooldownOverlay.style.height = `${pct * 100}%`;
            } else {
                this.legendarySkillBtn.classList.add('hidden');
            }
        }
    }
    
    updateSkillsPanel(skills) {
        if (!this.skillsPanel) return;
        this.skillsPanel.innerHTML = '';
        
        skills.forEach(skill => {
            const skillElement = document.createElement('div');
            skillElement.className = 'skill-level-item';
            skillElement.textContent = `${skill.name}: Lv.${skill.level}`;
            skillElement.style.color = skill.getRarityColor();
            this.skillsPanel.appendChild(skillElement);
        });
    }
    
    showLevelUpPanel() {
        this.levelUpPanel.classList.remove('hidden');
    }
    
    hideLevelUpPanel() {
        this.levelUpPanel.classList.add('hidden');
    }
    
    showGameOverPanel(gameStats) {
        this.finalScore.textContent = gameStats.score;
        this.survivalTime.textContent = formatTime(gameStats.survivalTime);
        this.gameOverPanel.classList.remove('hidden');
    }
    
    hideGameOverPanel() {
        this.gameOverPanel.classList.add('hidden');
    }
}

export { UI };