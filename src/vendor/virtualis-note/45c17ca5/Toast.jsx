import React, { forwardRef } from 'react';
import { motion } from '../../../../lib/note-embed/boundary';
/**
 * Simple toast notification component.
 * Uses forwardRef to avoid ref warnings with AnimatePresence.
 */
const Toast = forwardRef(({ message }, ref) => (React.createElement(motion.div, { ref: ref, initial: { opacity: 0, y: 50 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 50 }, className: "fixed bottom-24 md:bottom-8 inset-x-0 mx-auto w-fit px-6 py-3 bg-card border border-border rounded-full text-sm font-medium text-foreground z-50 backdrop-blur-sm shadow-lg" }, message)));
Toast.displayName = 'Toast';
export default Toast;
