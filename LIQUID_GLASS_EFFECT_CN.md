# 液体玻璃效果：让文字像素神奇偏移的秘密

你有没有想过，怎样才能在网页上实现液体玻璃效果呢？**其实就是让背景文字产生偏移！** 那我们马上可以想到用 `backdropFilter` 滤镜，唯一棘手的问题是：**如何可靠地去设置滤镜的偏移效果，让它看起来像真正的玻璃扭曲？**

## 核心思路：像素搬家的智能指挥

想象一下屏幕上的每个像素都是一个小人，玻璃效果就是给这些小人下达"搬家指令"：

```
原始画面：      玻璃扭曲后：
A B C D         A   C D
E F G H    →    E F   H  
I J K L         I J K L
```

**关键问题是：怎样精确地告诉每个像素该往哪里搬？**

## 第一个挑战：CSS原生滤镜的局限

我们的第一反应可能是直接用CSS的 `backdropFilter`：

```css
.glass {
  backdrop-filter: blur(10px);  /* 只能模糊，不能精确控制像素移动 */
}
```

但很快就会发现，CSS原生滤镜虽然强大，却**无法精确控制每个像素的移动方向和距离**。它只能提供模糊、亮度、对比度等固定效果。

既然CSS做不到，那怎么办？这时候我们需要引入SVG滤镜来扩展CSS的能力。

## 解决方案：SVG滤镜接管像素移动

SVG提供了一个神奇的滤镜叫 `feDisplacementMap`，它就像一个"智能交通指挥员"，能够根据一张特殊的"地图"来指挥每个像素的移动。

我们把这个SVG滤镜嵌入到CSS的 `backdropFilter` 中：

```typescript
backdropFilter: `url(#${id}_filter) blur(0.25px) contrast(1.2) brightness(1.05) saturate(1.1)`
```

这里的 `url(#${id}_filter)` 就是我们的秘密武器！但是等等，这个滤镜是怎么知道每个像素该往哪里移动的呢？

## 下一个问题：如何制作"移动指令地图"？

`feDisplacementMap` 需要一张特殊的图片作为"指挥地图"，这张图片用颜色来编码移动指令：

```jsx
<svg>
  <defs>
    <filter id={`${id}_filter`}>
      {/* 这张图片告诉每个像素该怎么移动 */}
      <feImage ref={feImageRef} />
      
      {/* 根据图片指令执行像素移动 */}
      <feDisplacementMap
        in="SourceGraphic"              // 输入：背景内容
        in2={`${id}_map`}               // 参考：移动指令地图
        xChannelSelector="R"            // 红色控制水平移动
        yChannelSelector="G"            // 绿色控制垂直移动
      />
    </filter>
  </defs>
</svg>
```

颜色编码的规则很简单：
- **红色通道（R）**：控制水平移动（255=右移，128=不动，0=左移）
- **绿色通道（G）**：控制垂直移动（255=下移，128=不动，0=上移）

现在问题变成了：**我们怎么生成这张"移动指令地图"？**

## 核心挑战：如何描述玻璃的扭曲规律？

要生成指令地图，我们首先要搞清楚：真实的玻璃球是如何扭曲背景的？

观察真实玻璃，我们发现一个规律：
- **中心区域**：像素几乎不动，看起来正常
- **边缘区域**：像素被"拉"向玻璃球中心
- **过渡区域**：从正常到扭曲，平滑过渡

要用代码描述这个规律，我们需要：
1. 首先知道每个点是在玻璃内部、边缘还是外部
2. 然后根据位置计算扭曲强度
3. 最后决定像素的新位置

这就引出了我们的数学工具：**有向距离场（SDF）**。

## 数学建模：用距离场描述玻璃边界

想象你站在一个圆形游泳池旁：
- 池子里面：距离是**负数**（-2米）
- 池子外面：距离是**正数**（+3米）  
- 池子边缘：距离是**0**

用代码表达这个概念：

```typescript
function roundedRectSDF(x: number, y: number, width: number, height: number, radius: number): number {
  const qx = Math.abs(x) - width + radius;
  const qy = Math.abs(y) - height + radius;
  return Math.min(Math.max(qx, qy), 0) + length(Math.max(qx, 0), Math.max(qy, 0)) - radius;
}
```

有了距离场，我们就能写出默认的玻璃扭曲逻辑：

```typescript
const defaultFragment = (uv) => {
  const ix = uv.x - 0.5;  // 转换到中心坐标系
  const iy = uv.y - 0.5;
  
  // 1. 计算到玻璃边缘的距离
  const distanceToEdge = roundedRectSDF(ix, iy, 0.3, 0.2, 0.6);
  
  // 2. 距离越近，扭曲强度越大
  const displacement = smoothStep(0.8, 0, distanceToEdge - 0.15);
  const scaled = smoothStep(0, 1, displacement);
  
  // 3. 所有像素都被"拉"向中心
  return texture(ix * scaled + 0.5, iy * scaled + 0.5);
};
```

现在我们有了数学模型，但还有最后一个问题：**如何把这个数学公式变成SVG滤镜能理解的"指令地图"？**

## 最后一步：生成并应用位移贴图

关键在于 `updateShader` 函数，它把我们的数学模型转换成实际的图片：

```typescript
const updateShader = () => {
  // 1. 准备画布数据
  const data = new Uint8ClampedArray(w * h * 4);
  let maxScale = 0;
  const rawValues: number[] = [];
  
  // 2. 第一遍：用数学模型计算每个像素的新位置
  for (let i = 0; i < data.length; i += 4) {
    const x = (i / 4) % w;
    const y = Math.floor(i / 4 / w);
    
    // 这里调用我们刚才定义的扭曲逻辑
    const pos = fragmentShader({ x: x / w, y: y / h });
    
    // 计算这个像素需要移动多少
    const dx = pos.x * w - x;  // 水平移动距离
    const dy = pos.y * h - y;  // 垂直移动距离
    
    maxScale = Math.max(maxScale, Math.abs(dx), Math.abs(dy));
    rawValues.push(dx, dy);
  }
  
  // 3. 第二遍：把移动距离编码成颜色
  let index = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = rawValues[index++] / maxScale + 0.5;  // 水平移动 → 红色
    const g = rawValues[index++] / maxScale + 0.5;  // 垂直移动 → 绿色
    
    data[i]     = r * 255;  // 红色通道
    data[i + 1] = g * 255;  // 绿色通道
    data[i + 2] = 0;        // 蓝色不用
    data[i + 3] = 255;      // 不透明
  }
  
  // 4. 把编码好的数据交给SVG滤镜
  context.putImageData(new ImageData(data, w, h), 0, 0);
  feImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', canvas.toDataURL());
  feDisplacementMap.setAttribute('scale', (maxScale / canvasDPI).toString());
};
```

现在整个流程就打通了！从数学公式到最终的视觉效果，每一步都有了明确的目的和逻辑。

## 让效果更自然：平滑过渡的秘密

还有一个细节不能忽略：为什么我们的玻璃效果看起来如此自然？关键在于 `smoothStep` 函数：

```typescript
function smoothStep(a: number, b: number, t: number): number {
  t = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return t * t * (3 - 2 * t);  // 这个公式确保了平滑过渡
}
```

它确保了从正常到扭曲是平滑过渡的，而不是突然跳跃。这就像水波纹的扩散一样自然。

## 相关链接

-  **在线演示**: [https://eloquent-beijinho-4a6d83.netlify.app/](https://eloquent-beijinho-4a6d83.netlify.app/)
-  **完整代码**: [https://github.com/childrentime/liquid-glass](https://github.com/childrentime/liquid-glass)
-  **参考实现**: [https://github.com/shuding/liquid-glass/blob/main/liquid-glass.js](https://github.com/shuding/liquid-glass/blob/main/liquid-glass.js)

## 总结：一个完整的解决方案

现在回头看，整个实现路径就很清晰了：

1. **问题起点**：想要精确控制像素移动，但CSS原生滤镜做不到
2. **技术选择**：引入SVG `feDisplacementMap` 滤镜
3. **核心挑战**：如何生成滤镜需要的"移动指令地图"？
4. **数学建模**：用SDF描述玻璃形状，定义扭曲规律
5. **数据转换**：把数学计算结果编码成颜色图片
6. **渲染应用**：实时生成位移贴图，驱动SVG滤镜