// UI系统

import { formatTime } from './utils.js';

class UI {
    constructor() {
        // 获取DOM元素
        this.healthValue = document.getElementById('health-value');
        this.healthFill = document.getElementById('health-fill');
        this.expValue = document.getElementById('exp-value');
        this.expRequired = document.getElementById('exp-required');
        this.expFill = document.getElementById('exp-fill');
        this.levelValue = document.getElementById('level-value');
        this.scoreValue = document.getElementById('score-value');
        this.fpsValue = document.getElementById('fps-value');
        
        // 面板元素
        this.levelUpPanel = document.getElementById('level-up-panel');
        this.gameOverPanel = document.getElementById('game-over-panel');
        this.finalScore = document.getElementById('final-score');
        this.survivalTime = document.getElementById('survival-time');
    }
    
    update(gameState) {
        // 更新生命值显示
        this.updateHealthBar(gameState.health, gameState.maxHealth);
        
        // 更新经验值显示
        this.updateExpBar(gameState.exp, gameState.expRequired);
        
        // 更新等级显示
        this.levelValue.textContent = gameState.level;
        
        // 更新得分显示
        this.scoreValue.textContent = gameState.score;
        
        // 更新FPS显示
        this.fpsValue.textContent = gameState.fps;
    }
    
    updateHealthBar(current, max) {
        // 更新生命值文本
        this.healthValue.textContent = Math.floor(current);
        
        // 更新生命值条宽度
        const healthPercent = current / max;
        this.healthFill.style.width = `${healthPercent * 100}%`;
    }
    
    updateExpBar(current, required) {
        // 更新经验值文本
        this.expValue.textContent = Math.floor(current);
        this.expRequired.textContent = required;
        
        // 更新经验值条宽度
        const expPercent = current / required;
        this.expFill.style.width = `${expPercent * 100}%`;
    }
    
    showLevelUpPanel() {
        this.levelUpPanel.classList.remove('hidden');
    }
    
    hideLevelUpPanel() {
        this.levelUpPanel.classList.add('hidden');
    }
    
    showGameOverPanel(gameStats) {
        // 更新最终得分
        this.finalScore.textContent = gameStats.score;
        
        // 更新生存时间
        this.survivalTime.textContent = formatTime(gameStats.survivalTime);
        
        // 显示游戏结束面板
        this.gameOverPanel.classList.remove('hidden');
    }
    
    hideGameOverPanel() {
        this.gameOverPanel.classList.add('hidden');
    }
    
    // 显示暂停菜单
    showPauseMenu() {
        // 实现暂停菜单显示逻辑
    }
    
    // 隐藏暂停菜单
    hidePauseMenu() {
        // 实现暂停菜单隐藏逻辑
    }
    
    // 显示主菜单
    showMainMenu() {
        // 实现主菜单显示逻辑
    }
    
    // 隐藏主菜单
    hideMainMenu() {
        // 实现主菜单隐藏逻辑
    }
    
    // 更新技能选择选项
    updateLevelUpOptions(options) {
        // 获取选项容器
        const optionsContainer = document.querySelector('.level-up-options');
        
        // 清空现有选项
        optionsContainer.innerHTML = '';
        
        // 添加新选项
        options.forEach((option, index) => {
            const optionElement = document.createElement('div');
            optionElement.className = 'option';
            optionElement.dataset.option = index;
            
            optionElement.innerHTML = `
                <h3>${option.name}</h3>
                <p>${option.description}</p>
            `;
            
            optionsContainer.appendChild(optionElement);
        });
    }
}

export { UI };