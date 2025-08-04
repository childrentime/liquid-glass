# Liquid Glass Effect - React Implementation

A liquid glass effect component based on React + TypeScript + Vite.

## 🔗 Links

- 🌐 **Live Demo**: [https://eloquent-beijinho-4a6d83.netlify.app/](https://eloquent-beijinho-4a6d83.netlify.app/)
- 📦 **Project Repository**: [https://github.com/childrentime/liquid-glass](https://github.com/childrentime/liquid-glass)
- 📚 **Reference Implementation**: [https://github.com/shuding/liquid-glass/blob/main/liquid-glass.js](https://github.com/shuding/liquid-glass/blob/main/liquid-glass.js)

## 🌟 Features

This project implements an interactive liquid glass effect with the following features:

- ✨ **Distortion Effect**: See distorted background content through the glass sphere
- 🖱️ **Drag Interaction**: Freely drag and move the glass sphere
- 📱 **Responsive Design**: Automatically adapts to different screen sizes
- ⚡ **High Performance**: Optimized with SVG filters and Canvas rendering
- 🎨 **Customizable**: Support for custom shaders and styles

## 🚀 Quick Start

### Requirements

- Node.js 18+
- pnpm (recommended) or npm

### Install Dependencies

```bash
pnpm install
```

### Start Development Server

```bash
pnpm run dev
```

### Build for Production

```bash
pnpm run build
```

## 📁 Project Structure

```
liquid-glass/
├── src/
│   ├── LiquidGlass.tsx      # Core component implementation
│   ├── App.tsx              # Demo application
│   ├── App.css              # Styles
│   └── main.tsx             # Application entry
├── LIQUID_GLASS_EFFECT_CN.md  # Detailed technical documentation (Chinese)
├── README.md                # Project documentation
└── package.json             # Project configuration
```

## 🔧 Usage

### Basic Usage

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

### Custom Shader

```tsx
import LiquidGlass from './LiquidGlass';

// Create ripple effect
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

## 🛠️ Technical Principles

The liquid glass effect is based on the following core technologies:

### 1. SVG Filter System
- Uses `feDisplacementMap` to implement pixel displacement
- References dynamically generated displacement maps through `feImage`

### 2. Real-time Canvas Rendering
- Dynamically calculates displacement amounts for each pixel
- Encodes displacement data into RGBA channels

### 3. Mathematical Shaders
- SDF (Signed Distance Fields) to define shapes
- Smooth interpolation functions for natural transitions

### 4. React Hooks Optimization
- Uses `useRef` to avoid unnecessary re-renders
- Implements lazy update mechanism through Proxy

## 📱 Browser Compatibility

| Browser | Minimum Version | Support Status |
|---------|----------------|----------------|
| Chrome  | 76+            | ✅ Full Support |
| Firefox | 70+            | ✅ Full Support |
| Safari  | 13+            | ✅ Full Support |
| Edge    | 79+            | ✅ Full Support |

## 🎯 Performance Optimization

1. **Lazy Update Mechanism**: Updates shaders only when necessary
2. **Boundary Constraints**: Prevents invalid position calculations
3. **Event Optimization**: Proper management of event listener lifecycle
4. **Memory Management**: Timely cleanup of Canvas contexts

## 📚 Detailed Documentation

See [LIQUID_GLASS_EFFECT_CN.md](./LIQUID_GLASS_EFFECT_CN.md) for detailed technical principles and implementation guide (Chinese).

## 🤝 Contributing

Issues and Pull Requests are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is open sourced under the MIT license.

## 🙏 Acknowledgments

- Original Liquid Glass effect inspiration from [Shu Ding](https://github.com/shuding)
- React and TypeScript community for excellent documentation and tools
- All developers who contribute to the open source community

---

**Enjoy creating magic!** 🎨✨
