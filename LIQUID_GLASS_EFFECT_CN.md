# 解密苹果最新 Liquid Glass 效果：如何用代码重现 iOS 设计系统的视觉魔法

苹果在最新的设计系统中引入了令人惊艳的 Liquid Glass 效果，这种视觉魔法让界面元素仿佛具有了真实玻璃的质感。最近在研究这个效果，发现核心原理其实就是让背景文字产生精确的偏移！听起来简单，用 `backdropFilter` 滤镜就行了，但问题是：怎么让滤镜的偏移效果看起来像真正的玻璃扭曲呢？

## 基本思路：给像素发搬家指令

可以把屏幕上的每个像素想象成一个小人，玻璃效果就是给这些小人下达"搬家指令"。下图清晰地展示了这个过程：

![液体玻璃扭曲效果示意图](https://private-us-east-1.manuscdn.com/sessionFile/pBvyu3BUgWdnCq8C15T1UU/sandbox/9tNhqfFTkQXjghBxkCzqrr-images_1754280772513_na1fn_L2hvbWUvdWJ1bnR1L3BpeGVsX2Rpc3BsYWNlbWVudF9pbGx1c3RyYXRpb24.png?Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvcEJ2eXUzQlVnV2RuQ3E4QzE1VDFVVS9zYW5kYm94Lzl0TmhxZkZUa1FYamdoQnhrQ3pxcnItaW1hZ2VzXzE3NTQyODA3NzI1MTNfbmExZm5fTDJodmJXVXZkV0oxYm5SMUwzQnBlR1ZzWDJScGMzQnNZV05sYldWdWRGOXBiR3gxYzNSeVlYUnBiMjQucG5nIiwiQ29uZGl0aW9uIjp7IkRhdGVMZXNzVGhhbiI6eyJBV1M6RXBvY2hUaW1lIjoxNzk4NzYxNjAwfX19XX0_&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=Me5YjhrvfiOvFq2lxgnmlOlTn9gU7kAP~5o7eZ4Sy3JvplR2vjMVqof2O6aWuyaCJaV2C3ntzn5sGsyGvY0KtizbripoFyZYhcWotcVcxfiSsTHbw5w3f~vIkX5EN2ocTpQHSdRP5JBGlPpkEaXhVHmS5mGpsOu1Bsnvn1ywI1hMXMnzimhg4yIswlwSnfk0NqURkfvvtiUyOHaW8FTM5BMdfxGZUb7AURHCu7okpPSvIRT4~55Vatczh1JWGEVdJhylZsjPHi~hH1w7yOsuKJ3ihMeHPwC5j9gIESohlBUorPaLxBy72qVS3W01O6T-oh~Juaigr5I5Aq-cIJNLcQ__)

左边是原始的规整网格，右边展示了被液体玻璃扭曲后的效果。可以看到：
- 中心区域被放大聚焦
- 周围区域产生弯曲变形  
- 每个格子都还在，只是位置和形状发生了变化

**问题是：怎样精确地告诉每个像素该往哪里搬？**

## 第一个坑：CSS原生滤镜不够用

最开始我想直接用CSS的 `backdropFilter`：

```css
.glass {
  backdrop-filter: blur(10px);  /* 只能模糊，不能精确控制像素移动 */
}
```

结果发现CSS原生滤镜虽然挺强大，但**没法精确控制每个像素的移动方向和距离**。它就只能搞搞模糊、亮度、对比度这些基础效果。

CSS搞不定，咋办？得想办法引入SVG滤镜来扩展CSS的能力。

## 解决方案：SVG滤镜接管像素移动

SVG有个厉害的滤镜叫 `feDisplacementMap`，这东西就像个"交通指挥员"，能根据一张特殊的"指挥图"来让每个像素该往哪移往哪移。

把这个SVG滤镜嵌入到CSS的 `backdropFilter` 里：

```typescript
backdropFilter: `url(#${id}_filter) blur(0.25px) contrast(1.2) brightness(1.05) saturate(1.1)`
```

这里的 `url(#${id}_filter)` 就是秘密武器！但问题来了，这滤镜怎么知道每个像素该往哪移呢？

## 下一个问题：怎么做"移动指令地图"？

`feDisplacementMap` 得有张特殊的图片当"指挥地图"，这图片用颜色来编码移动指令：

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

现在问题变成了：**怎么生成这张"移动指令地图"？**

## 关键问题：玻璃的扭曲规律是啥？

要生成指令地图，得先搞清楚：真实的玻璃球是怎么扭曲背景的？

观察真实玻璃，能发现个规律：
- **中心区域**：像素几乎不动，看起来正常
- **边缘区域**：像素被"拉"向玻璃球中心
- **过渡区域**：从正常到扭曲，平滑过渡

要用代码描述这个规律，得：
1. 先知道每个点是在玻璃内部、边缘还是外部
2. 根据位置算出扭曲强度
3. 决定像素的新位置

这就要用到数学工具：**有向距离场（SDF）**。

## 数学建模：用距离场描述玻璃边界

想象你站在圆形游泳池旁边：
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

要解决这个问题，我们需要一个桥梁函数，把前面定义的数学模型转换成SVG滤镜能够理解的实际图片数据。这个桥梁就是 `updateShader` 函数：

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

这函数挺巧妙的，相当于个"翻译官"：把数学逻辑（每个像素该移动多少）翻译成SVG滤镜能懂的"颜色语言"（红色=水平移动，绿色=垂直移动）。就像把中文翻译成英文，内容不变，表达方式不同。

到这里整个流程就通了！从数学公式到最终的视觉效果，每一步都有明确的目的。

## 让效果更自然：平滑过渡的秘密

前面代码里有个特殊函数 `smoothStep`，别看它不起眼，但这东西是让玻璃效果看起来自然的关键：

```typescript
function smoothStep(a: number, b: number, t: number): number {
  t = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return t * t * (3 - 2 * t);  // 这个公式确保了平滑过渡
}
```

这个看似简单的公式 `t * t * (3 - 2 * t)` 其实大有讲究：它创造的不是匀速的线性变化，而是一种"慢→快→慢"的节奏感。想象一下汽车启动的过程——刚开始缓慢加速，中间快速提速，最后平缓到达目标速度。这种渐进式的变化让玻璃边缘的扭曲显得无比自然，而不是生硬的"开关式"跳跃。

## 整体实现思路总结

到这里，整个液体玻璃效果的实现路径就清晰了：

```
距离场SDF定义玻璃形状
          ↓
fragmentShader + smoothStep 计算每个像素该往哪移动
          ↓
updateShader 把数学结果编码成颜色 (R=水平移动, G=垂直移动)
          ↓
生成颜色贴图传给SVG滤镜
          ↓
feDisplacementMap 根据颜色指令移动像素
          ↓
CSS backdrop-filter 应用SVG滤镜
          ↓
背景文字被"玻璃"扭曲 (最终效果)
```

简单来说，就是：**定义形状 → 计算移动 → 编码颜色 → 应用滤镜**。每一步都在为下一步做准备，最终形成一个完整的处理链条。

## 相关链接

-  **在线演示**: [https://eloquent-beijinho-4a6d83.netlify.app/](https://eloquent-beijinho-4a6d83.netlify.app/)
-  **完整代码**: [https://github.com/childrentime/liquid-glass](https://github.com/childrentime/liquid-glass)
-  **参考实现**: [https://github.com/shuding/liquid-glass/blob/main/liquid-glass.js](https://github.com/shuding/liquid-glass/blob/main/liquid-glass.js)

## 总结

回头看整个实现过程，思路其实挺清楚的：

1. **问题起点**：想精确控制像素移动，但CSS原生滤镜搞不定
2. **技术选择**：用SVG的 `feDisplacementMap` 滤镜
3. **关键难点**：怎么生成滤镜要的"移动指令地图"？
4. **数学建模**：用SDF描述玻璃形状，定义扭曲规律
5. **数据转换**：把数学计算结果编码成颜色图片
6. **应用渲染**：实时生成位移贴图，驱动SVG滤镜