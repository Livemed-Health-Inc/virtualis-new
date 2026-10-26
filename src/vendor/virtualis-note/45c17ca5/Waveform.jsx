import React from 'react';
import { motion } from '../../../../lib/note-embed/boundary';
import { cn } from '@/lib/utils';
/**
 * Audio waveform visualization component.
 * Animates bars when active (recording).
 */
const Waveform = ({ active, barCount = 20, className }) => (React.createElement("div", { className: cn("flex items-center justify-center gap-0.5 h-12", className) }, [...Array(barCount)].map((_, i) => (React.createElement(motion.div, { key: i, animate: active
        ? { height: [4, Math.random() * 32 + 8, 4] }
        : { height: 4 }, transition: {
        duration: 0.5,
        repeat: active ? Infinity : 0,
        delay: i * 0.02,
    }, className: cn("w-0.5 rounded-full", active ? "bg-cyan-400" : "bg-muted") })))));
export default Waveform;
