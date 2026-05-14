import React, { useEffect, useRef, useState } from 'react';
import { Mail, Shield, Share2, Users, AlertTriangle, CheckCircle, Target, Activity, Send, TrendingUp, ChevronDown } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  Scene,
  OrthographicCamera,
  WebGLRenderer,
  PlaneGeometry,
  Mesh,
  ShaderMaterial,
  Vector3,
  Vector2,
  Clock
} from 'three';
import emailjs from '@emailjs/browser';
import zigtexLogo from "./assets/Zigtex-logo.png";
// --- Three.js FloatingLines Component ---

const vertexShader = `
precision highp float;
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
precision highp float;
uniform float iTime;
uniform vec3  iResolution;
uniform float animationSpeed;
uniform bool enableTop;
uniform bool enableMiddle;
uniform bool enableBottom;
uniform int topLineCount;
uniform int middleLineCount;
uniform int bottomLineCount;
uniform float topLineDistance;
uniform float middleLineDistance;
uniform float bottomLineDistance;
uniform vec3 topWavePosition;
uniform vec3 middleWavePosition;
uniform vec3 bottomWavePosition;
uniform vec2 iMouse;
uniform bool interactive;
uniform float bendRadius;
uniform float bendStrength;
uniform float bendInfluence;
uniform bool parallax;
uniform float parallaxStrength;
uniform vec2 parallaxOffset;
uniform vec3 lineGradient[8];
uniform int lineGradientCount;

const vec3 BLACK = vec3(0.0);
const vec3 PINK  = vec3(233.0, 71.0, 245.0) / 255.0;
const vec3 BLUE  = vec3(47.0,  75.0, 162.0) / 255.0;

mat2 rotate(float r) {
  return mat2(cos(r), sin(r), -sin(r), cos(r));
}

vec3 background_color(vec2 uv) {
  vec3 col = vec3(0.0);
  float y = sin(uv.x - 0.2) * 0.3 - 0.1;
  float m = uv.y - y;
  col += mix(BLUE, BLACK, smoothstep(0.0, 1.0, abs(m)));
  col += mix(PINK, BLACK, smoothstep(0.0, 1.0, abs(m - 0.8)));
  return col * 0.5;
}

vec3 getLineColor(float t, vec3 baseColor) {
  if (lineGradientCount <= 0) {
    return baseColor;
  }
  vec3 gradientColor;
  
  if (lineGradientCount == 1) {
    gradientColor = lineGradient[0];
  } else {
    float clampedT = clamp(t, 0.0, 0.9999);
    float scaled = clampedT * float(lineGradientCount - 1);
    int idx = int(floor(scaled));
    float f = fract(scaled);
    int idx2 = min(idx + 1, lineGradientCount - 1);
    vec3 c1 = lineGradient[idx];
    vec3 c2 = lineGradient[idx2];
    
    gradientColor = mix(c1, c2, f);
  }
  
  return gradientColor * 0.5;
}

float wave(vec2 uv, float offset, vec2 screenUv, vec2 mouseUv, bool shouldBend) {
  float time = iTime * animationSpeed;
  float x_offset   = offset;
  float x_movement = time * 0.1;
  float amp        = sin(offset + time * 0.2) * 0.3;
  float y          = sin(uv.x + x_offset + x_movement) * amp;
  
  if (shouldBend) {
    vec2 d = screenUv - mouseUv;
    float influence = exp(-dot(d, d) * bendRadius); 
    float bendOffset = (mouseUv.y - screenUv.y) * influence * bendStrength * bendInfluence;
    y += bendOffset;
  }
  
  float m = uv.y - y;
  return 0.0175 / max(abs(m) + 0.01, 1e-3) + 0.01;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 baseUv = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
  baseUv.y *= -1.0;
  
  if (parallax) {
    baseUv += parallaxOffset;
  }
  
  vec3 col = vec3(0.0);
  vec3 b = lineGradientCount > 0 ? vec3(0.0) : background_color(baseUv);
  vec2 mouseUv = vec2(0.0);
  
  if (interactive) {
    mouseUv = (2.0 * iMouse - iResolution.xy) / iResolution.y;
    mouseUv.y *= -1.0;
  }
  
  if (enableBottom) {
    for (int i = 0; i < bottomLineCount; ++i) {
      float fi = float(i);
      float t = fi / max(float(bottomLineCount - 1), 1.0);
      vec3 lineCol = getLineColor(t, b);
      
      float angle = bottomWavePosition.z * log(length(baseUv) + 1.0);
      vec2 ruv = baseUv * rotate(angle);
      col += lineCol * wave(
        ruv + vec2(bottomLineDistance * fi + bottomWavePosition.x, bottomWavePosition.y),
        1.5 + 0.2 * fi,
        baseUv,
        mouseUv,
        interactive
      ) * 0.2;
    }
  }
  
  if (enableMiddle) {
    for (int i = 0; i < middleLineCount; ++i) {
      float fi = float(i);
      float t = fi / max(float(middleLineCount - 1), 1.0);
      vec3 lineCol = getLineColor(t, b);
      
      float angle = middleWavePosition.z * log(length(baseUv) + 1.0);
      vec2 ruv = baseUv * rotate(angle);
      col += lineCol * wave(
        ruv + vec2(middleLineDistance * fi + middleWavePosition.x, middleWavePosition.y),
        2.0 + 0.15 * fi,
        baseUv,
        mouseUv,
        interactive
      );
    }
  }
  
  if (enableTop) {
    for (int i = 0; i < topLineCount; ++i) {
      float fi = float(i);
      float t = fi / max(float(topLineCount - 1), 1.0);
      vec3 lineCol = getLineColor(t, b);
      
      float angle = topWavePosition.z * log(length(baseUv) + 1.0);
      vec2 ruv = baseUv * rotate(angle);
      ruv.x *= -1.0;
      col += lineCol * wave(
        ruv + vec2(topLineDistance * fi + topWavePosition.x, topWavePosition.y),
        1.0 + 0.2 * fi,
        baseUv,
        mouseUv,
        interactive
      ) * 0.1;
    }
  }
  
  fragColor = vec4(col, 1.0);
}

void main() {
  vec4 color = vec4(0.0);
  mainImage(color, gl_FragCoord.xy);
  gl_FragColor = color;
}
`;

const MAX_GRADIENT_STOPS = 8;

function hexToVec3(hex) {
  let value = hex.trim();
  if (value.startsWith('#')) {
    value = value.slice(1);
  }
  let r = 255, g = 255, b = 255;
  if (value.length === 3) {
    r = parseInt(value[0] + value[0], 16);
    g = parseInt(value[1] + value[1], 16);
    b = parseInt(value[2] + value[2], 16);
  } else if (value.length === 6) {
    r = parseInt(value.slice(0, 2), 16);
    g = parseInt(value.slice(2, 4), 16);
    b = parseInt(value.slice(4, 6), 16);
  }
  return new Vector3(r / 255, g / 255, b / 255);
}

function FloatingLines({
  linesGradient,
  enabledWaves = ['top', 'middle', 'bottom'],
  lineCount = [6],
  lineDistance = [5],
  topWavePosition,
  middleWavePosition,
  bottomWavePosition = { x: 2.0, y: -0.7, rotate: -1 },
  animationSpeed = 1,
  interactive = true,
  bendRadius = 5.0,
  bendStrength = -0.5,
  mouseDamping = 0.05,
  parallax = true,
  parallaxStrength = 0.2,
  mixBlendMode = 'screen'
}) {
  const containerRef = useRef(null);
  const targetMouseRef = useRef(new Vector2(-1000, -1000));
  const currentMouseRef = useRef(new Vector2(-1000, -1000));
  const targetInfluenceRef = useRef(0);
  const currentInfluenceRef = useRef(0);
  const targetParallaxRef = useRef(new Vector2(0, 0));
  const currentParallaxRef = useRef(new Vector2(0, 0));

  const getLineCount = (waveType) => {
    if (typeof lineCount === 'number') return lineCount;
    const index = ['top', 'middle', 'bottom'].indexOf(waveType);
    return lineCount[index] ?? 6;
  };

  const getLineDistance = (waveType) => {
    if (typeof lineDistance === 'number') return lineDistance;
    const index = ['top', 'middle', 'bottom'].indexOf(waveType);
    return lineDistance[index] ?? 0.1;
  };

  const topLineCount = enabledWaves.includes('top') ? getLineCount('top') : 0;
  const middleLineCount = enabledWaves.includes('middle') ? getLineCount('middle') : 0;
  const bottomLineCount = enabledWaves.includes('bottom') ? getLineCount('bottom') : 0;

  const topLineDistance = enabledWaves.includes('top') ? getLineDistance('top') * 0.01 : 0.01;
  const middleLineDistance = enabledWaves.includes('middle') ? getLineDistance('middle') * 0.01 : 0.01;
  const bottomLineDistance = enabledWaves.includes('bottom') ? getLineDistance('bottom') * 0.01 : 0.01;

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new Scene();
    const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    camera.position.z = 1;

    const renderer = new WebGLRenderer({ antialias: false, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    containerRef.current.appendChild(renderer.domElement);

    const uniforms = {
      iTime: { value: 0 },
      iResolution: { value: new Vector3(1, 1, 1) },
      animationSpeed: { value: animationSpeed },
      enableTop: { value: enabledWaves.includes('top') },
      enableMiddle: { value: enabledWaves.includes('middle') },
      enableBottom: { value: enabledWaves.includes('bottom') },
      topLineCount: { value: topLineCount },
      middleLineCount: { value: middleLineCount },
      bottomLineCount: { value: bottomLineCount },
      topLineDistance: { value: topLineDistance },
      middleLineDistance: { value: middleLineDistance },
      bottomLineDistance: { value: bottomLineDistance },
      topWavePosition: {
        value: new Vector3(topWavePosition?.x ?? 10.0, topWavePosition?.y ?? 0.5, topWavePosition?.rotate ?? -0.4)
      },
      middleWavePosition: {
        value: new Vector3(
          middleWavePosition?.x ?? 5.0,
          middleWavePosition?.y ?? 0.0,
          middleWavePosition?.rotate ?? 0.2
        )
      },
      bottomWavePosition: {
        value: new Vector3(
          bottomWavePosition?.x ?? 2.0,
          bottomWavePosition?.y ?? -0.7,
          bottomWavePosition?.rotate ?? 0.4
        )
      },
      iMouse: { value: new Vector2(-1000, -1000) },
      interactive: { value: interactive },
      bendRadius: { value: bendRadius },
      bendStrength: { value: bendStrength },
      bendInfluence: { value: 0 },
      parallax: { value: parallax },
      parallaxStrength: { value: parallaxStrength },
      parallaxOffset: { value: new Vector2(0, 0) },
      lineGradient: {
        value: Array.from({ length: MAX_GRADIENT_STOPS }, () => new Vector3(1, 1, 1))
      },
      lineGradientCount: { value: 0 }
    };

    if (linesGradient && linesGradient.length > 0) {
      const stops = linesGradient.slice(0, MAX_GRADIENT_STOPS);
      uniforms.lineGradientCount.value = stops.length;
      stops.forEach((hex, i) => {
        const color = hexToVec3(hex);
        uniforms.lineGradient.value[i].set(color.x, color.y, color.z);
      });
    }

    const material = new ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true
    });

    const geometry = new PlaneGeometry(2, 2);
    const mesh = new Mesh(geometry, material);
    scene.add(mesh);

    const clock = new Clock();

    const setSize = () => {
      if (!containerRef.current) return;
      const el = containerRef.current;
      const width = el.clientWidth || 1;
      const height = el.clientHeight || 1;
      renderer.setSize(width, height, false);
      const canvasWidth = renderer.domElement.width;
      const canvasHeight = renderer.domElement.height;
      uniforms.iResolution.value.set(canvasWidth, canvasHeight, 1);
    };

    setSize();
    window.addEventListener('resize', setSize);

    const handlePointerMove = (event) => {
      if (rafIdPointer) cancelAnimationFrame(rafIdPointer);
      
      rafIdPointer = requestAnimationFrame(() => {
        const rect = renderer.domElement.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const dpr = renderer.getPixelRatio();
        targetMouseRef.current.set(x * dpr, (rect.height - y) * dpr);
        targetInfluenceRef.current = 1.0;

        if (parallax) {
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          const offsetX = (x - centerX) / rect.width;
          const offsetY = -(y - centerY) / rect.height;
          targetParallaxRef.current.set(offsetX * parallaxStrength, offsetY * parallaxStrength);
        }
      });
    };

    let rafIdPointer;

    const handlePointerLeave = () => {
      targetInfluenceRef.current = 0.0;
    };

    if (interactive) {
      renderer.domElement.addEventListener('pointermove', handlePointerMove);
      renderer.domElement.addEventListener('pointerleave', handlePointerLeave);
    }

    let raf = 0;
    const renderLoop = () => {
      uniforms.iTime.value = clock.getElapsedTime();
      if (interactive) {
        currentMouseRef.current.lerp(targetMouseRef.current, mouseDamping);
        uniforms.iMouse.value.copy(currentMouseRef.current);
        currentInfluenceRef.current += (targetInfluenceRef.current - currentInfluenceRef.current) * mouseDamping;
        uniforms.bendInfluence.value = currentInfluenceRef.current;
      }
      if (parallax) {
        currentParallaxRef.current.lerp(targetParallaxRef.current, mouseDamping);
        uniforms.parallaxOffset.value.copy(currentParallaxRef.current);
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      cancelAnimationFrame(raf);
      if (rafIdPointer) cancelAnimationFrame(rafIdPointer);
      window.removeEventListener('resize', setSize);
      if (interactive) {
        renderer.domElement.removeEventListener('pointermove', handlePointerMove);
        renderer.domElement.removeEventListener('pointerleave', handlePointerLeave);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
    };
  }, [
    linesGradient,
    enabledWaves,
    lineCount,
    lineDistance,
    topWavePosition,
    middleWavePosition,
    bottomWavePosition,
    animationSpeed,
    interactive,
    bendRadius,
    bendStrength,
    mouseDamping,
    parallax,
    parallaxStrength,
    topLineCount,
    middleLineCount,
    bottomLineCount,
    topLineDistance,
    middleLineDistance,
    bottomLineDistance
  ]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden"
      style={{ mixBlendMode }}
    />
  );
}

// --- Parallax Components ---

const MouseParallaxOrb = ({ className, speed = 1, reverse = false }) => {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    let rafId;
    const handleMouseMove = (e) => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth - 0.5) * 60 * speed * (reverse ? -1 : 1);
        const y = (e.clientY / window.innerHeight - 0.5) * 60 * speed * (reverse ? -1 : 1);
        setOffset({ x, y });
      });
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, [speed, reverse]);

  return (
    <div 
      className={className} 
      style={{ 
        transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`, 
        transition: 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)',
        willChange: 'transform'
      }} 
    />
  );
};

const ScrollParallax = ({ children, speed = 0.1, className = "", zIndex = 10 }) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });
  const y = useTransform(scrollYProgress, [0, 1], [window.innerHeight * speed, -window.innerHeight * speed]);

  return (
    <motion.div 
      ref={ref}
      className={className} 
      style={{ y, zIndex }}
    >
      {children}
    </motion.div>
  );
};

// --- Components ---

const ShinyButton = ({ children, onClick, className = "" }) => {
  return (
    <button 
      onClick={onClick}
      className={`relative overflow-hidden rounded-full p-[1px] group focus:outline-none focus:ring-2 focus:ring-violet-500/50 ${className}`}
    >
      {/* Spinning conic gradient background */}
      <span className="absolute inset-[-1000%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0%,#8b5cf6_40%,#06b6d4_50%,transparent_60%)]" />
      {/* Inner button content */}
      <span className="relative z-10 flex items-center justify-center bg-[#0a0a0a] px-10 py-4 rounded-full text-white font-sans font-medium text-sm transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:bg-[#151515]">
        {children}
      </span>
    </button>
  );
};

const FeatureCard = ({ icon: Icon, title, description, delay }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{ 
        scale: 1.02, 
        y: -12,
        transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] } 
      }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.7, delay: delay / 1000, ease: [0.23, 1, 0.32, 1] }}
      className={`group relative p-8 md:p-10 rounded-3xl border border-white/5 bg-white/[0.02] transition-all duration-500
        hover:border-violet-500/40 hover:bg-white/[0.04] hover:shadow-[0_20px_40px_-15px_rgba(139,92,246,0.3)]
      `}
    >
      <motion.div 
        animate={{ 
          boxShadow: [
            "0 0 0px rgba(139,92,246,0)", 
            "0 0 20px rgba(6,182,212,0.3)", 
            "0 0 0px rgba(139,92,246,0)"
          ],
          scale: [1, 1.05, 1]
        }}
        transition={{ 
          duration: 4, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
        className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-6 transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-110 group-hover:-rotate-3 group-hover:bg-violet-500/20 group-hover:text-violet-300 text-cyan-400"
      >
        <Icon size={24} strokeWidth={1.5} />
      </motion.div>
      <h3 className="font-heading font-bold text-2xl md:text-3xl text-[#FEFEFE] mb-3 tracking-[-0.02em]">{title}</h3>
      <p className="font-sans text-neutral-300 font-light leading-relaxed whitespace-pre-line text-sm md:text-base">{description}</p>
    </motion.div>
  );
};

const FAQItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="mb-4 rounded-2xl bg-[#1a1f3a]/40 border border-white/5 overflow-hidden transition-all duration-300">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center text-left p-6 group cursor-pointer"
      >
        <span className="font-heading font-bold text-base md:text-lg text-[#FEFEFE] group-hover:text-cyan-400 transition-colors uppercase tracking-tight">{question}</span>
        <span className={`text-neutral-500 transition-transform duration-500 ${isOpen ? 'rotate-180 text-cyan-400' : ''}`}>
          <ChevronDown size={20} />
        </span>
      </button>
      <motion.div
        initial={false}
        animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="overflow-hidden"
      >
        <div className="px-6 pb-6 pt-0">
          <p className="font-sans text-neutral-400 text-sm md:text-base leading-relaxed max-w-2xl">
            {answer}
          </p>
        </div>
      </motion.div>
    </div>
  );
};

const NavPill = ({ onBookClick }) => {
  return (
    <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[92%] sm:w-[95%] max-w-[672px] rounded-full bg-[#0a0a0a]/70 backdrop-blur-2xl border border-white/10 px-3 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between transition-all duration-500">
      <div className="flex items-center pl-1 sm:pl-2">
  <img
    src={zigtexLogo}
    alt="Zigtex Logo"
    className="h-6 sm:h-8 md:h-6 w-auto object-contain"
  />
</div>
      
      <div className="hidden md:flex items-center gap-8 font-sans text-[11px] uppercase tracking-widest text-neutral-300 font-semibold">
        <a href="#problem" className="hover:text-white transition-colors duration-300">The Problem</a>
        <a href="#solution" className="hover:text-white transition-colors duration-300">Platform</a>
        <a href="#faqs" className="hover:text-white transition-colors duration-300">FAQs</a>
      </div>

      <button onClick={onBookClick} className="bg-white text-black px-4 py-1.5 sm:px-5 sm:py-2 rounded-full font-sans text-[12px] sm:text-sm font-semibold hover:bg-neutral-200 transition-colors duration-300 cursor-pointer">
        Book Demo
      </button>
    </nav>
  );
};

const MetricsTicker = () => {
  const metrics = [
    { label: "Inbox Placement", value: "99.8%" },
    { label: "Spam Avoidance", value: "Active" },
    { label: "Bounce Rate", value: "< 0.5%" },
    { label: "Domain Health", value: "Optimal" },
    { label: "Volume Distribution", value: "Dynamic" },
    { label: "Reputation Monitoring", value: "Real-time" },
  ];

  const tickerItems = [...metrics, ...metrics, ...metrics];

  return (
    <div className="w-full h-[60px] bg-[#000000]/40 border-y border-white/5 overflow-hidden flex items-center relative backdrop-blur-sm">
      <div className="absolute left-0 w-24 h-full bg-gradient-to-r from-[#030303] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 w-24 h-full bg-gradient-to-l from-[#030303] to-transparent z-10 pointer-events-none" />
      
      <div className="flex items-center animate-[ticker_40s_linear_infinite] whitespace-nowrap min-w-max">
        {tickerItems.map((item, idx) => (
          <div key={idx} className="flex items-center gap-3 px-12">
            <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-neutral-300 font-bold">
              {item.label}
            </span>
            <span className="font-mono text-base text-cyan-400">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const CustomCursor = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseOver = (e) => {
      const target = e.target;
      if (
        target.tagName === 'A' || 
        target.tagName === 'BUTTON' || 
        target.closest('button') || 
        target.closest('a') ||
        target.classList.contains('cursor-pointer')
      ) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseover', handleMouseOver);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseover', handleMouseOver);
    };
  }, []);

  return (
    <>
      {/* Outer Ring */}
      <motion.div
        className="fixed top-0 left-0 w-[20px] h-[20px] border-2 rounded-full pointer-events-none z-[9999] mix-blend-screen"
        animate={{
          x: mousePos.x - (isHovering ? 25 : 10),
          y: mousePos.y - (isHovering ? 25 : 10),
          scale: isHovering ? 2.5 : 1,
          borderColor: isHovering ? '#ff00ff' : '#00d9ff',
        }}
        transition={{
          type: "spring",
          damping: 30,
          stiffness: 250,
          mass: 0.5,
          translateX: { duration: 0.1 },
          translateY: { duration: 0.1 }
        }}
      />
      {/* Inner Dot */}
      <motion.div
        className="fixed top-0 left-0 w-[6px] h-[6px] bg-[#00d9ff] rounded-full pointer-events-none z-[9999]"
        animate={{
          x: mousePos.x - 3,
          y: mousePos.y - 3,
        }}
        transition={{
          type: "spring",
          damping: 25,
          stiffness: 150,
          mass: 0.8,
          translateX: { duration: 0.25 },
          translateY: { duration: 0.25 }
        }}
      />
    </>
  );
};

export default function App() {
  const [formState, setFormState] = useState({
    fullName: '',
    email: '',
    company: '',
    volume: '',
    challenge: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionProgress, setSubmissionProgress] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    if (!formState.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formState.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formState.company.trim()) newErrors.company = 'Company name is required';
    if (!formState.volume) newErrors.volume = 'Please select your email volume';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  if (!validateForm()) return;

  setIsSubmitting(true);
  setSubmissionProgress(30);

  try {
    const result = await emailjs.send(
      "service_pduslxt",        // your service ID
      "template_jcieyzf",       // your template ID
      {
        fullName: formState.fullName,
        email: formState.email,
        company: formState.company,
        volume: formState.volume,
        challenge: formState.challenge,
      },
      "Tmg-qp-bvyDSQKPZb"       // your public key
    );

    console.log("SUCCESS:", result);

    setSubmissionProgress(100);
    setShowSuccess(true);

    setFormState({
      fullName: '',
      email: '',
      company: '',
      volume: '',
      challenge: ''
    });

    setTimeout(() => setShowSuccess(false), 4000);

  } catch (error) {
    console.error("EmailJS Error:", error);
    alert("Failed to send. Check console.");
  } finally {
    setIsSubmitting(false);
    setSubmissionProgress(0);
  }
};


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Outfit:wght@400;500;600;700;800&display=swap');
      
      :root { --bg-color: #030303; }
      body {
        background-color: var(--bg-color);
        color: #ffffff;
        font-family: 'Inter', sans-serif;
        overflow-x: hidden;
      }
      .font-heading { font-family: 'Outfit', sans-serif; }
      .font-sans { font-family: 'Inter', sans-serif; }

      @keyframes shimmer {
        0% { background-position: 200% center; }
        100% { background-position: -200% center; }
      }
      .text-shimmer {
        background: linear-gradient(90deg, #a78bfa 0%, #ffffff 40%, #ffffff 60%, #22d3ee 100%);
        background-size: 200% auto;
        -webkit-background-clip: text;
        color: transparent;
        animation: shimmer 6s linear infinite;
      }

      @keyframes float {
        0%, 100% { transform: translateY(0) scale(1); }
        50% { transform: translateY(-20px) scale(1.05); }
      }
      .animate-float-slow { animation: float 15s ease-in-out infinite; }
      .animate-float-fast { animation: float 8s ease-in-out infinite; }

      @keyframes ticker {
        0% { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const scrollToDemo = (e) => {
    if (e) e.preventDefault();
    document.getElementById('demo-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#030303] selection:bg-violet-500/30 overflow-x-hidden cursor-none">
      <CustomCursor />
      <NavPill onBookClick={scrollToDemo} />

      {/* Ambient Background Orbs & Three.js Floating Lines */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <FloatingLines 
          enabledWaves={['top', 'middle', 'bottom']}
          lineCount={[10, 15, 20]}
          lineDistance={[8, 6, 4]}
          linesGradient={['#8B5CF6', '#06B6D4', '#030303']}
          interactive={true}
          parallax={true}
          mixBlendMode="screen"
        />
        <MouseParallaxOrb 
          className="absolute top-[20%] left-[-10%] w-[500px] h-[500px] bg-cyan-600/10 blur-[120px] rounded-full animate-float-fast" 
          speed={1.5}
        />
        <MouseParallaxOrb 
          className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-violet-900/20 blur-[140px] rounded-full animate-float-slow" 
          speed={2} 
          reverse={true}
        />
        
        {/* Darkening overlay to ensure text readability */}
        <div className="absolute inset-0 bg-[#030303]/70" />
      </div>

      {/* Hero Section */}
   <main className="relative z-10 flex flex-col items-center justify-center min-h-[100svh] px-4 pt-20">
        <div className="max-w-5xl mx-auto text-center w-full">
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
          >
         <h1 className="font-heading font-bold text-4xl sm:text-6xl md:text-8xl lg:text-[100px] leading-[1] tracking-[-0.04em] mb-8 text-[#FEFEFE] px-4 max-w-[1200px] mx-auto overflow-visible">
  Take Control of Your <br />
  <span className="text-shimmer italic inline-block">
    Outbound Sales Pipeline
  </span>
</h1>
   </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
          >
            <p className="font-sans text-neutral-300 text-base md:text-xl font-light max-w-2xl mx-auto mb-10 md:mb-12 leading-relaxed px-4 md:px-0">
              Stop relying on the "black box" of unpredictable outbound meetings. Zigtex provides a <strong className="font-medium text-white">human-led, technology-backed SDR layer</strong> designed to build a predictable pipeline and maximize your ROI.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6"
          >
            <ShinyButton onClick={scrollToDemo}>Book a Demo</ShinyButton>
          </motion.div>
        </div>
      </main>

      {/* Metrics Ticker */}
      <div className="relative z-10">
        <MetricsTicker />
      </div>

      {/* Problem Section */}
      <motion.section 
        id="problem" 
        className="relative z-10 py-24 md:py-32 px-6 max-w-6xl mx-auto will-change-transform"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 0.6 }}
      >
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        >
          <div className="text-center mb-16">
            <h2 className="font-heading font-bold text-4xl md:text-5xl lg:text-6xl tracking-[-0.03em] mb-4 text-[#FEFEFE]">The Problem with Traditional Outbound</h2>
            <p className="font-sans text-neutral-400 text-lg">Many companies struggle with disconnected tool stacks and high overhead.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-16">
            {[
              { title: "High SDR Costs", desc: "In-house SDRs average $6,500+/month with long ramp times." },
              { title: "Workflow Chaos", desc: "Multiple disconnected tools create data silos and operational complexity." },
              { title: "No Guarantees", desc: "Most agencies and in-house teams offer zero guarantees on actual meetings." },
              { title: "Zero Visibility", desc: "Pipeline growth feels like a guessing game without clear answers." }
            ].map((problem, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="flex flex-col gap-2 p-5 md:p-6 rounded-2xl bg-white/[0.02] border border-white/5"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="text-red-400/80 shrink-0" size={20} />
                  <span className="font-heading text-lg text-white font-bold">{problem.title}</span>
                </div>
                <span className="font-sans text-neutral-400 text-sm leading-relaxed">{problem.desc}</span>
              </motion.div>
            ))}
          </div>

          <div className="relative p-8 md:p-12 rounded-3xl border border-white/10 bg-gradient-to-b from-[#0a0a0a] to-[#030303] text-center overflow-hidden">
            <div className="absolute inset-0 bg-violet-500/5 blur-[100px]" />
            <p className="relative z-10 font-sans text-lg md:text-xl text-neutral-300 mb-2">Most teams try to fix this with better copy.</p>
            <p className="relative z-10 font-heading font-bold text-3xl md:text-4xl text-[#FEFEFE]">The real issue is <span className="text-cyan-400 italic">how</span> emails are being sent.</p>
          </div>
        </motion.div>
      </motion.section>

      {/* Solution & Capabilities Grid */}
      <motion.section 
        id="solution" 
        className="relative z-10 py-24 md:py-32 px-6 max-w-7xl mx-auto border-t border-white/5 will-change-transform"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 0.6 }}
      >
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          className="text-center mb-16 md:mb-24 max-w-3xl mx-auto"
        >
          <h2 className="font-heading font-bold text-4xl md:text-5xl lg:text-6xl tracking-[-0.03em] mb-6 text-[#FEFEFE]">The Zigtex Advantage</h2>
          <p className="font-sans text-neutral-300 text-base md:text-lg">We combine trained human SDRs with proprietary technology to deliver guaranteed results.</p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <FeatureCard 
            icon={Users}
            title="Trained SDRs from Day One"
            description="No training delays or ramp-up time required. Our team is ready to hit the ground running immediately."
            delay={0}
          />
          <FeatureCard 
            icon={Activity}
            title="vConnect IQ Technology"
            description="Our process is powered by proprietary technology for maximum efficiency and deliverability optimization."
            delay={100}
          />
          <FeatureCard 
            icon={Shield}
            title="Full Accountability"
            description="A transparent process where you own the results, not just 'rent' them. Total visibility into your pipeline."
            delay={200}
          />
          <FeatureCard 
            icon={TrendingUp}
            title="Faster Results"
            description="Achieve meetings 47% faster than in-house SDR teams. Scale your outreach with confidence."
            delay={300}
          />
        </div>
      </motion.section>

      {/* Outcome & Social Proof */}
      <motion.section 
        className="relative z-10 py-24 md:py-32 bg-[#050505] border-y border-white/5 will-change-transform"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 0.6 }}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
            >
              <h2 className="font-heading font-bold text-3xl sm:text-4xl md:text-5xl mb-6 md:mb-8 text-[#FEFEFE]">Proven Results</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
                {[
                  { value: "400+", label: "Clients Served" },
                  { value: "94%", label: "Retention Rate" },
                  { value: "3.2x", label: "Pipeline Increase" }
                ].map((stat, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 text-center"
                  >
                    <div className="text-4xl font-heading font-bold text-cyan-400 mb-1">{stat.value}</div>
                    <div className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">{stat.label}</div>
                  </motion.div>
                ))}
              </div>

              <h2 className="font-heading font-bold text-3xl sm:text-4xl md:text-5xl mb-6 md:mb-8 text-[#FEFEFE]">Scaling with Certainty</h2>
              <ul className="space-y-4 md:space-y-6">
                {[
                  "Guaranteed inbox placement with primary delivery",
                  "Significant reduction in SDR management overhead",
                  "A consistent, high-quality meeting volume monthly",
                  "Full control over ICP and domain health"
                ].map((item, i) => (
                  <motion.li 
                    key={i} 
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3 md:gap-4"
                  >
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <CheckCircle size={14} className="md:size-4 text-emerald-400" />
                    </div>
                    <span className="font-sans text-base md:text-lg text-neutral-200">{item}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
              className="p-6 md:p-10 rounded-3xl border border-white/10 bg-[#080808] relative overflow-hidden"
            >
              <div className="absolute top-[-50%] right-[-50%] w-full h-full bg-cyan-500/10 blur-[80px] rounded-full pointer-events-none" />
              <h3 className="font-heading font-bold text-3xl mb-8 relative z-10 text-[#FEFEFE]">Used by teams that care about deliverability</h3>
              <div className="space-y-4 relative z-10">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                  <Target className="text-cyan-400" size={20} />
                  <span className="font-sans text-neutral-200">B2B SaaS teams scaling outbound</span>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                  <Users className="text-violet-400" size={20} />
                  <span className="font-sans text-neutral-200">Agencies managing multiple client campaigns</span>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                  <TrendingUp className="text-emerald-400" size={20} />
                  <span className="font-sans text-neutral-200">Founders running lean outbound systems</span>
                </div>
              </div>
              <p className="mt-8 font-sans font-medium text-white text-lg relative z-10">Outbound becomes stable, not guesswork.</p>
            </motion.div>

          </div>
        </div>
      </motion.section>

      {/* How it Works */}
      <motion.section 
        id="how-it-works" 
        className="relative z-10 py-24 md:py-32 px-6 max-w-6xl mx-auto text-center will-change-transform"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 0.6 }}
      >
        <motion.h2 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
          className="font-heading font-bold text-4xl md:text-5xl lg:text-6xl tracking-[-0.03em] mb-16 md:mb-20 text-[#FEFEFE]"
        >
          How It Works
        </motion.h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12 sm:gap-8 md:gap-8 relative">
          {/* Connector Line */}
          <div className="hidden md:block absolute top-8 left-12 right-12 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent z-0" />
          
          {[
            { step: "01", title: "Connect", desc: "Connect your domains and email accounts securely." },
            { step: "02", title: "Configure", desc: "Set up your ideal sending infrastructure and limits." },
            { step: "03", title: "Launch", desc: "Deploy campaigns with controlled, automated distribution." },
            { step: "04", title: "Monitor", desc: "Track performance and improve continuously in real-time." }
          ].map((item, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.23, 1, 0.32, 1] }}
              className="relative z-10 flex flex-col items-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-[#0a0a0a] border border-white/10 flex items-center justify-center font-heading font-bold text-2xl text-cyan-400 mb-6 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                {item.step}
              </div>
              <h4 className="font-sans font-semibold text-[#FEFEFE] mb-2">{item.title}</h4>
              <p className="font-sans text-sm text-neutral-300 px-4">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* FAQ Section */}
      <motion.section 
        id="faqs" 
        className="relative z-10 py-24 md:py-32 px-6 max-w-4xl mx-auto border-t border-white/5 will-change-transform"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 0.6 }}
      >
        <div className="text-center mb-16 md:mb-24">
          <h2 className="font-heading font-bold text-4xl md:text-5xl lg:text-6xl tracking-[-0.03em] mb-6 text-[#FEFEFE]">Frequently Asked Questions</h2>
          <p className="font-sans text-neutral-400 text-base md:text-lg">Everything you need to know about Zigtex and our outbound engine.</p>
        </div>

        <div className="space-y-4">
          {[
            {
              q: "What is Zigtex?",
              a: "Zigtex is a deliverability-focused outbound platform that combines trained human SDRs with proprietary vConnect IQ technology to build predictable, high-ROI sales pipelines."
            },
            {
              q: "How do you guarantee meetings?",
              a: "Our Scale plan includes guaranteed BANT-qualified meetings annually. This is achieved through our combination of expert human research and technology that ensures your outreach hits the primary inbox."
            },
            {
              q: "What is vConnect IQ?",
              a: "vConnect IQ is our proprietary technology core. It handles intelligent email distribution, real-time domain reputation monitoring, and bounce-aware systems to optimize your deliverability."
            },
            {
              q: "How long does it take to see results?",
              a: "We can have your outbound engine up and running within 2 weeks. Most partners start seeing a consistent meeting flow within the first 30 days of active outreach."
            }
            
          ].map((faq, i) => (
            <FAQItem key={i} question={faq.q} answer={faq.a} />
          ))}
        </div>
      </motion.section>

      {/* Demo Booking Section */}
      <section id="demo-section" className="relative z-10 py-16 md:py-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          className="rounded-[24px] md:rounded-[32px] overflow-hidden bg-[#080808]/90 border border-white/10 shadow-2xl relative"
        >
          <div className="absolute inset-0 backdrop-blur-xl -z-10" />
          <div className="grid grid-cols-1 lg:grid-cols-2 relative z-10">
            
            {/* Left Side: Info */}
            <div className="p-8 sm:p-12 lg:p-16 border-b lg:border-b-0 lg:border-r border-white/5 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full bg-violet-500/5 blur-[100px] pointer-events-none" />
              <h2 className="font-heading font-bold text-3xl sm:text-4xl md:text-5xl mb-6 relative z-10 text-[#FEFEFE]">See how your outbound actually performs</h2>
              <p className="font-sans text-neutral-300 mb-8 md:mb-10 text-base md:text-lg relative z-10">In the demo, you'll get:</p>
              
              <ul className="space-y-4 md:space-y-6 relative z-10">
                {[
                  "A breakdown of how your emails are currently behaving",
                  "How Zigtex improves inbox placement",
                  "How to structure outbound for consistent results",
                  "A walkthrough of the sending and monitoring system"
                ].map((item, i) => (
                  <li key={i} className="flex gap-3 md:gap-4 items-start">
                    <Send size={18} className="md:size-5 text-violet-400 shrink-0 mt-1" />
                    <span className="font-sans text-[15px] md:text-lg text-neutral-200 leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right Side: Form */}
            <div className="p-8 sm:p-12 lg:p-16 bg-[#030303]/50">
              <h3 className="font-heading font-bold text-2xl md:text-3xl mb-2 text-[#FEFEFE]">Book Your Demo</h3>
              <p className="font-sans text-xs md:text-sm text-neutral-300 mb-8 whitespace-pre-line md:whitespace-normal">Fill in your details and we'll schedule a walkthrough tailored to your outbound setup.</p>
              
              <form className="space-y-5" onSubmit={handleSubmit} noValidate>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="font-sans text-xs font-semibold text-neutral-300 uppercase tracking-wider">Full Name</label>
                    <input 
                      type="text" 
                      name="fullName"
                      value={formState.fullName}
                      onChange={handleInputChange}
                      className={`w-full bg-[#0a0a0a] border ${errors.fullName ? 'border-red-500' : 'border-neutral-500'} rounded-xl px-4 py-3 text-white font-sans text-sm focus:outline-none focus:border-violet-500 focus:bg-[#111] transition-colors placeholder:text-neutral-400`} 
                      placeholder="John Doe" 
                    />
                    {errors.fullName && <p className="text-red-400 text-[10px] font-sans uppercase tracking-widest">{errors.fullName}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="font-sans text-xs font-semibold text-neutral-300 uppercase tracking-wider">Work Email</label>
                    <input 
                      type="email" 
                      name="email"
                      value={formState.email}
                      onChange={handleInputChange}
                      className={`w-full bg-[#0a0a0a] border ${errors.email ? 'border-red-500' : 'border-neutral-500'} rounded-xl px-4 py-3 text-white font-sans text-sm focus:outline-none focus:border-violet-500 focus:bg-[#111] transition-colors placeholder:text-neutral-400`} 
                      placeholder="john@company.com" 
                    />
                    {errors.email && <p className="text-red-400 text-[10px] font-sans uppercase tracking-widest">{errors.email}</p>}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="font-sans text-xs font-semibold text-neutral-300 uppercase tracking-wider">Company Name</label>
                  <input 
                    type="text" 
                    name="company"
                    value={formState.company}
                    onChange={handleInputChange}
                    className={`w-full bg-[#0a0a0a] border ${errors.company ? 'border-red-500' : 'border-neutral-500'} rounded-xl px-4 py-3 text-white font-sans text-sm focus:outline-none focus:border-violet-500 focus:bg-[#111] transition-colors placeholder:text-neutral-400`} 
                    placeholder="Acme Corp" 
                  />
                  {errors.company && <p className="text-red-400 text-[10px] font-sans uppercase tracking-widest">{errors.company}</p>}
                </div>

                <div className="space-y-2">
                  <label className="font-sans text-xs font-semibold text-neutral-300 uppercase tracking-wider">Current Monthly Email Volume</label>
                  <select 
                    name="volume"
                    value={formState.volume}
                    onChange={handleInputChange}
                    className={`w-full bg-[#0a0a0a] border ${errors.volume ? 'border-red-500' : 'border-neutral-500'} rounded-xl px-4 py-3 text-white font-sans text-sm focus:outline-none focus:border-violet-500 focus:bg-[#111] transition-colors appearance-none cursor-pointer`}
                  >
                    <option value="" disabled className="text-neutral-400">Select volume...</option>
                    <option value="< 10k" className="text-white">Less than 10,000</option>
                    <option value="10k - 50k" className="text-white">10,000 - 50,000</option>
                    <option value="50k - 100k" className="text-white">50,000 - 100,000</option>
                    <option value="100k+" className="text-white">100,000+</option>
                  </select>
                  {errors.volume && <p className="text-red-400 text-[10px] font-sans uppercase tracking-widest">{errors.volume}</p>}
                </div>

                <div className="space-y-2">
                  <label className="font-sans text-xs font-semibold text-neutral-300 uppercase tracking-wider">What's your biggest outbound challenge?</label>
                  <textarea 
                    name="challenge"
                    value={formState.challenge}
                    onChange={handleInputChange}
                    rows={3} 
                    className="w-full bg-[#0a0a0a] border border-neutral-500 rounded-xl px-4 py-3 text-white font-sans text-sm focus:outline-none focus:border-violet-500 focus:bg-[#111] transition-colors resize-none placeholder:text-neutral-400" 
                    placeholder="e.g., Domain reputation keeps dropping..."
                  ></textarea>
                </div>

                <div className="pt-4">
                  {isSubmitting && (
                    <div className="mb-4 space-y-2">
                      <div className="flex justify-between items-center text-[10px] uppercase tracking-widest font-sans font-bold text-neutral-400">
                        <span>Securing Connection</span>
                        <span>{Math.round(submissionProgress)}%</span>
                      </div>
                      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-gradient-to-r from-violet-500 to-cyan-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${submissionProgress}%` }}
                          transition={{ type: "spring", bounce: 0, duration: 0.1 }}
                        />
                      </div>
                    </div>
                  )}
                  
                  <ShinyButton className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? 'Routing...' : 'Schedule My Demo'}
                  </ShinyButton>
                  
                  {showSuccess && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3"
                    >
                      <CheckCircle className="text-emerald-400 shrink-0" size={18} />
                      <p className="text-emerald-400 text-xs font-sans font-medium uppercase tracking-wider">Demo request sent successfully!</p>
                    </motion.div>
                  )}
                </div>
              </form>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Risk Reversal & Final CTA */}
      <motion.section 
        className="relative z-10 py-24 md:py-32 px-6 max-w-4xl mx-auto text-center will-change-transform"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 0.6 }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <Shield className="w-12 h-12 text-cyan-400 mx-auto mb-8 opacity-80" />
          <h3 className="font-heading font-bold text-3xl md:text-4xl mb-6 text-[#FEFEFE]">Ready to Transform Your Pipeline?</h3>
          <p className="font-sans text-neutral-400 mb-8 max-w-lg mx-auto">Book a 30-minute strategy call today. We will map out your outbound strategy in the first session—no commitment required.</p>
          <div className="flex flex-wrap justify-center gap-3 md:gap-4 mb-20">
            {['Quick Start: 2 Weeks', 'Tailored Targeting', 'GTM Aligned', 'BANT Qualified'].map((badge, i) => (
               <span key={i} className="px-4 py-2 rounded-full border border-neutral-500 bg-white/5 font-sans text-[11px] md:text-sm text-neutral-200">
                 {badge}
               </span>
            ))}
          </div>
        </motion.div>

        <ScrollParallax speed={0.1}>
          <div className="p-8 sm:p-14 md:p-20 rounded-[40px] md:rounded-[56px] bg-gradient-to-br from-violet-900/10 via-[#0a0a0a]/80 to-cyan-900/10 border border-white/10 shadow-[0_0_100px_rgba(139,92,246,0.1)] relative overflow-hidden backdrop-blur-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 blur-[100px] rounded-full -mr-32 -mt-32" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/10 blur-[100px] rounded-full -ml-32 -mb-32" />
            
            <h2 className="font-heading font-bold text-4xl sm:text-6xl md:text-7xl lg:text-8xl tracking-[-0.04em] mb-8 text-[#FEFEFE] relative z-10">
              Stop guessing.<br/>
              <span className="text-shimmer italic">Start growing.</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 text-left max-w-4xl mx-auto border-t border-white/5 pt-12 mt-12 relative z-10">
              <div className="group">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Share2 size={14} className="text-cyan-400" />
                  </div>
                  <h4 className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Website</h4>
                </div>
                <a href="https://www.zigtex.com" className="text-lg font-sans text-white hover:text-cyan-400 transition-colors block">www.zigtex.com</a>
              </div>
              
              <div className="group">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Mail size={14} className="text-violet-400" />
                  </div>
                  <h4 className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Email</h4>
                </div>
                <a href="mailto:info@zigtex.com" className="text-lg font-sans text-white hover:text-violet-400 transition-colors block">info@zigtex.com</a>
              </div>
              
              <div className="group">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <TrendingUp size={14} className="text-emerald-400" />
                  </div>
                  <h4 className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Contact</h4>
                </div>
                <a href="tel:+918530683777" className="text-lg font-sans text-white hover:text-emerald-400 transition-colors block">+91 85306 83777</a>
              </div>
            </div>
            
            <div className="relative z-10 pt-4">
              <ShinyButton onClick={scrollToDemo}>Book a Strategy Call</ShinyButton>
            </div>
          </div>
        </ScrollParallax>
      </motion.section>

      {/* Footer */}
      <footer className="relative z-10 bg-[#050505] border-t border-white/5 pt-12 pb-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
             <div className="flex items-center pl-1 sm:pl-2">
  <img
    src={zigtexLogo}
    alt="Zigtex Logo"
    className="h-6 sm:h-8 md:h-6 w-auto object-contain"
  />
</div>
          </div>
          
          <p className="font-sans text-xs text-neutral-400">
            © {new Date().getFullYear()} Zigtex Systems. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
