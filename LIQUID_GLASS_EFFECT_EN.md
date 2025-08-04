# Decoding Apple's Latest Liquid Glass Effect: How to Recreate iOS Design System's Visual Magic with Code

Apple has introduced a stunning Liquid Glass effect in their latest design system, bringing a magical visual quality that makes interface elements feel like real glass. I've been diving into recreating this effect, and it turns out the core principle is really about making background text shift in precise ways! Sounds simple enough—just use `backdropFilter`, right? But here's the catch: how do you make the filter's displacement look like actual glass distortion that matches Apple's high standards?

## Core Concept: Giving Pixels Moving Instructions

Think of every pixel on your screen as a tiny person, and the glass effect is basically giving these little folks "relocation orders":

```
Original scene:      After glass distortion:
A B C D              A   C D
E F G H    →         E F   H  
I J K L              I J K L
```

**The question is: how do you precisely tell each pixel where to move?**

## First Roadblock: Native CSS Filters Aren't Enough

Initially, I thought I could just use CSS's `backdropFilter`:

```css
.glass {
  backdrop-filter: blur(10px);  /* Can only blur, can't precisely control pixel movement */
}
```

Turns out CSS native filters, while powerful, **can't precisely control each pixel's movement direction and distance**. They're limited to basic effects like blur, brightness, and contrast.

Can't do it with CSS alone? Time to bring in SVG filters to extend CSS capabilities.

## Solution: SVG Filters Take Control of Pixel Movement

SVG has this powerful filter called `feDisplacementMap` that acts like a "traffic controller"—it can move pixels around based on a special "instruction map."

Embed this SVG filter into CSS's `backdropFilter`:

```typescript
backdropFilter: `url(#${id}_filter) blur(0.25px) contrast(1.2) brightness(1.05) saturate(1.1)`
```

That `url(#${id}_filter)` is the secret weapon! But now the question becomes: how does this filter know where each pixel should move?

## Next Challenge: Creating the "Movement Instruction Map"

`feDisplacementMap` needs a special image as its "instruction map," where colors encode movement commands:

```jsx
<svg>
  <defs>
    <filter id={`${id}_filter`}>
      {/* This image tells each pixel how to move */}
      <feImage ref={feImageRef} />
      
      {/* Execute pixel movement based on image instructions */}
      <feDisplacementMap
        in="SourceGraphic"              // Input: background content
        in2={`${id}_map`}               // Reference: movement instruction map
        xChannelSelector="R"            // Red controls horizontal movement
        yChannelSelector="G"            // Green controls vertical movement
      />
    </filter>
  </defs>
</svg>
```

The color encoding rules are straightforward:
- **Red channel (R)**: Controls horizontal movement (255=right, 128=no movement, 0=left)
- **Green channel (G)**: Controls vertical movement (255=down, 128=no movement, 0=up)

Now the problem becomes: **how do you generate this "movement instruction map"?**

## Key Question: What's the Pattern of Glass Distortion?

To generate the instruction map, we first need to understand: how does real glass distort backgrounds?

Observing real glass reveals a pattern:
- **Center area**: Pixels barely move, looking normal
- **Edge areas**: Pixels get "pulled" toward the glass center
- **Transition zones**: Smooth gradient from normal to distorted

To code this pattern, we need to:
1. Know whether each point is inside, on the edge, or outside the glass
2. Calculate distortion intensity based on position
3. Determine the pixel's new location

This calls for a mathematical tool: **Signed Distance Fields (SDF)**.

## Mathematical Modeling: Using Distance Fields to Describe Glass Boundaries

Imagine standing next to a circular swimming pool:
- Inside the pool: distance is **negative** (-2 meters)
- Outside the pool: distance is **positive** (+3 meters)  
- At the pool edge: distance is **zero**

Expressing this concept in code:

```typescript
function roundedRectSDF(x: number, y: number, width: number, height: number, radius: number): number {
  const qx = Math.abs(x) - width + radius;
  const qy = Math.abs(y) - height + radius;
  return Math.min(Math.max(qx, qy), 0) + length(Math.max(qx, 0), Math.max(qy, 0)) - radius;
}
```

With distance fields, we can write the default glass distortion logic:

```typescript
const defaultFragment = (uv) => {
  const ix = uv.x - 0.5;  // Convert to center coordinate system
  const iy = uv.y - 0.5;
  
  // 1. Calculate distance to glass edge
  const distanceToEdge = roundedRectSDF(ix, iy, 0.3, 0.2, 0.6);
  
  // 2. Closer distance = stronger distortion
  const displacement = smoothStep(0.8, 0, distanceToEdge - 0.15);
  const scaled = smoothStep(0, 1, displacement);
  
  // 3. All pixels get "pulled" toward center
  return texture(ix * scaled + 0.5, iy * scaled + 0.5);
};
```

Now we have our mathematical model, but there's one final challenge: **how do we convert this mathematical formula into an "instruction map" that SVG filters can understand?**

## Final Step: Generating and Applying the Displacement Map

To solve this, we need a bridge function that converts our mathematical model into actual image data that SVG filters can understand. This bridge is the `updateShader` function:

```typescript
const updateShader = () => {
  // 1. Prepare canvas data
  const data = new Uint8ClampedArray(w * h * 4);
  let maxScale = 0;
  const rawValues: number[] = [];
  
  // 2. First pass: use mathematical model to calculate new position for each pixel
  for (let i = 0; i < data.length; i += 4) {
    const x = (i / 4) % w;
    const y = Math.floor(i / 4 / w);
    
    // Call our distortion logic defined earlier
    const pos = fragmentShader({ x: x / w, y: y / h });
    
    // Calculate how much this pixel needs to move
    const dx = pos.x * w - x;  // Horizontal movement distance
    const dy = pos.y * h - y;  // Vertical movement distance
    
    maxScale = Math.max(maxScale, Math.abs(dx), Math.abs(dy));
    rawValues.push(dx, dy);
  }
  
  // 3. Second pass: encode movement distances as colors
  let index = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = rawValues[index++] / maxScale + 0.5;  // Horizontal movement → red
    const g = rawValues[index++] / maxScale + 0.5;  // Vertical movement → green
    
    data[i]     = r * 255;  // Red channel
    data[i + 1] = g * 255;  // Green channel
    data[i + 2] = 0;        // Blue unused
    data[i + 3] = 255;      // Opaque
  }
  
  // 4. Pass encoded data to SVG filter
  context.putImageData(new ImageData(data, w, h), 0, 0);
  feImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', canvas.toDataURL());
  feDisplacementMap.setAttribute('scale', (maxScale / canvasDPI).toString());
};
```

This function is quite clever—it acts as a "translator" that converts mathematical logic (how much each pixel should move) into a "color language" that SVG filters understand (red=horizontal movement, green=vertical movement). It's like translating from Chinese to English—the content stays the same, just the expression changes.

At this point, the entire pipeline works! From mathematical formulas to final visual effects, every step has a clear purpose.

## Making Effects More Natural: The Secret of Smooth Transitions

There's a special function in the earlier code called `smoothStep`. Don't underestimate it—this little guy is key to making glass effects look natural:

```typescript
function smoothStep(a: number, b: number, t: number): number {
  t = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return t * t * (3 - 2 * t);  // This formula ensures smooth transitions
}
```

This seemingly simple formula `t * t * (3 - 2 * t)` is actually quite sophisticated: it creates not uniform linear change, but a "slow→fast→slow" rhythm. Think about a car starting up—slowly accelerating at first, rapid acceleration in the middle, then smoothly reaching target speed. This gradual change makes glass edge distortion look incredibly natural, rather than harsh "switch-like" jumps.

## Overall Implementation Strategy Summary

At this point, the entire liquid glass effect implementation path is clear:

```
Distance field SDF defines glass shape
          ↓
fragmentShader + smoothStep calculate where each pixel should move
          ↓
updateShader encodes mathematical results as colors (R=horizontal, G=vertical)
          ↓
Generate color map and pass to SVG filter
          ↓
feDisplacementMap moves pixels based on color instructions
          ↓
CSS backdrop-filter applies SVG filter
          ↓
Background text gets "glass" distortion (final effect)
```

Simply put: **define shape → calculate movement → encode colors → apply filter**. Each step prepares for the next, forming a complete processing chain.

## Related Links

- **Live Demo**: [https://eloquent-beijinho-4a6d83.netlify.app/](https://eloquent-beijinho-4a6d83.netlify.app/)
- **Complete Code**: [https://github.com/childrentime/liquid-glass](https://github.com/childrentime/liquid-glass)
- **Reference Implementation**: [https://github.com/shuding/liquid-glass/blob/main/liquid-glass.js](https://github.com/shuding/liquid-glass/blob/main/liquid-glass.js)

## Summary

Looking back at the entire implementation process, the approach is actually quite clear:

1. **Starting problem**: Want precise pixel movement control, but CSS native filters can't handle it
2. **Technology choice**: Use SVG's `feDisplacementMap` filter
3. **Key challenge**: How to generate the "movement instruction map" the filter needs?
4. **Mathematical modeling**: Use SDF to describe glass shape and define distortion patterns
5. **Data conversion**: Encode mathematical calculation results as color images
6. **Application rendering**: Generate displacement maps in real-time to drive SVG filters 