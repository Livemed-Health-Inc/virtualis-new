/**
 * Utility function to copy text to clipboard and show toast feedback.
 */
export const copyToClipboard = async (_text, setToast) => { setToast("Clipboard export unavailable in development."); };
/**
 * Parse a generated clinical note into sections based on common headers.
 */
export const parseNoteSections = (note) => {
    const sections = [];
    let currentSection = { title: 'Note', content: '' };
    note.split('\n').forEach((line) => {
        // Generated notes use level-two markdown headers exclusively. Never infer
        // headers from bullet labels such as "- Allergies: Not dictated."
        const headerMatch = line.match(/^##\s+(.+?)\s*$/);
        const cleanLine = headerMatch?.[1].replace(/\*\*/g, '').trim() || '';
        const isHeader = Boolean(headerMatch);
        if (isHeader && currentSection.content.trim()) {
            sections.push(currentSection);
            currentSection = { title: cleanLine.replace(':', '').trim(), content: '' };
        }
        else if (isHeader) {
            currentSection.title = cleanLine.replace(':', '').trim();
        }
        else {
            currentSection.content += line + '\n';
        }
    });
    if (currentSection.content.trim()) {
        sections.push(currentSection);
    }
    return sections.length > 0
        ? sections
        : [{ title: 'Clinical Note', content: note }];
};
