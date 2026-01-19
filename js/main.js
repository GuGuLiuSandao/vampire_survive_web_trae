// 游戏入口文件

// 确保DOM加载完成后再初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    // 导入游戏核心逻辑
    import('./game.js').then(({ Game }) => {
        // 在DOM加载完成后创建游戏实例
        const game = new Game();
        console.log('游戏初始化完成');
    }).catch(error => {
        console.error('游戏初始化失败:', error);
    });
});

// 添加一些全局错误处理
window.addEventListener('error', (event) => {
    console.error('全局错误:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('未处理的Promise拒绝:', event.reason);
});