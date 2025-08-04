# Liquid Glass Effect - React 实现

一个基于 React + TypeScript + Vite 的液体玻璃效果组件。

## 🌟 效果预览

本项目实现了一个可交互的液体玻璃效果，具有以下特点：

- ✨ **扭曲变形**：透过玻璃球看到扭曲的背景内容
- 🖱️ **拖拽交互**：可以自由拖拽移动玻璃球
- 📱 **响应式设计**：自动适应不同屏幕尺寸
- ⚡ **高性能渲染**：使用 SVG 滤镜和 Canvas 优化
- 🎨 **可自定义**：支持自定义着色器和样式

## 🚀 快速开始

### 环境要求

- Node.js 18+
- pnpm (推荐) 或 npm

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm run dev
```

### 构建生产版本

```bash
pnpm run build
```

## 📁 项目结构

```
liquid-glass/
├── src/
│   ├── LiquidGlass.tsx      # 核心组件实现
│   ├── App.tsx              # 演示应用
│   ├── App.css              # 样式文件
│   └── main.tsx             # 应用入口
├── LIQUID_GLASS_EFFECT_CN.md  # 详细技术文档
├── README.md                # 项目说明
└── package.json             # 项目配置
```

## 🔧 使用方法

### 基础用法

```tsx
import LiquidGlass from './LiquidGlass';

function App() {
  return (
    <div>
      <LiquidGlass width={300} height={200} />
    </div>
  );
}
```

### 自定义着色器

```tsx
import LiquidGlass from './LiquidGlass';

// 创建波纹效果
const rippleFragment = (uv, mouse) => {
  const dx = uv.x - (mouse?.x || 0.5);
  const dy = uv.y - (mouse?.y || 0.5);
  const distance = Math.sqrt(dx * dx + dy * dy);
  const wave = Math.sin(distance * 20 - Date.now() * 0.01) * 0.1;
  return { type: 't', x: uv.x + wave * dx, y: uv.y + wave * dy };
};

function App() {
  return (
    <LiquidGlass 
      width={400} 
      height={300} 
      fragment={rippleFragment}
    />
  );
}
```

## 🛠️ 技术原理

液体玻璃效果基于以下核心技术：

### 1. SVG 滤镜系统
- 使用 `feDisplacementMap` 实现像素位移
- 通过 `feImage` 引用动态生成的位移贴图

### 2. Canvas 实时渲染
- 动态计算每个像素的位移量
- 将位移数据编码到 RGBA 通道

### 3. 数学着色器
- SDF（有向距离场）定义形状
- 平滑插值函数创造自然过渡

### 4. React Hooks 优化
- 使用 `useRef` 避免不必要的重渲染
- 通过 Proxy 实现懒更新机制

## 📱 浏览器兼容性

| 浏览器 | 最低版本 | 支持状态 |
|--------|----------|----------|
| Chrome | 76+ | ✅ 完全支持 |
| Firefox | 70+ | ✅ 完全支持 |
| Safari | 13+ | ✅ 完全支持 |
| Edge | 79+ | ✅ 完全支持 |

## 🎯 性能优化

1. **懒更新机制**：只在必要时更新着色器
2. **边界约束**：防止无效的位置计算
3. **事件优化**：正确管理事件监听器生命周期
4. **内存管理**：及时清理 Canvas 上下文

## 📚 详细文档

查看 [LIQUID_GLASS_EFFECT_CN.md](./LIQUID_GLASS_EFFECT_CN.md) 获取详细的技术原理和实现指南。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目基于 MIT 许可证开源。

## 🙏 致谢

- 原始 Liquid Glass 效果灵感来自 [Shu Ding](https://github.com/shuding)
- React 和 TypeScript 社区的优秀文档和工具
- 所有为开源社区做出贡献的开发者们

---

**享受创造的乐趣！** 🎨✨
