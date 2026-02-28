// 德鲁伊职业类

import { Player } from '../player.js';
import { distance, angleBetween, ResourceManager } from '../utils.js';

// 德鲁伊职业类
class Druid extends Player {
    constructor(x, y) {
        super(x, y);
        
        // 德鲁伊特有属性
        this.classType = 'druid';
        
        // 加载德鲁伊专用图像资源
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
        
        // 设置德鲁伊专用图像路径
        this.images.stand.left.src = './resources/player_druid_stand_left.png';
        this.images.stand.right.src = './resources/player_druid_stand_right.png';
        this.images.walk.left.src = './resources/player_druid_walk_left.png';
        this.images.walk.right.src = './resources/player_druid_walk_right.png';
        
        // 初始化当前图像为站立向右
        this.currentImage = this.images.stand.right;
    }
    
    
    render(ctx) {
        // 确保图像加载完成后再渲染
        if (this.currentImage && this.currentImage.complete) {
            // 调用父类的render方法绘制角色精灵
            super.render(ctx);
        } else {
            // 图像未加载完成时，绘制一个临时矩形作为占位符
            ctx.save();
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.restore();
        }
    }
}

export { Druid };