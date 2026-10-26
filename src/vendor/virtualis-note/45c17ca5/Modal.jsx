import React, { forwardRef } from 'react';
import { motion } from '../../../lib/note-embed/boundary';
/**
 * Simple modal component with backdrop.
 * Uses forwardRef to avoid ref warnings with AnimatePresence.
 */
const Modal = forwardRef(({ children, onClose }, ref) => (React.createElement("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4" },
    React.createElement(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.15 }, onClick: onClose, className: "absolute inset-0 bg-black/50" }),
    React.createElement(motion.div, { ref: ref, initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 20 }, transition: { duration: 0.15 }, onClick: (e) => e.stopPropagation(), className: "relative z-10 w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto bg-card border border-border rounded-2xl shadow-2xl" }, children))));
Modal.displayName = 'Modal';
export default Modal;
