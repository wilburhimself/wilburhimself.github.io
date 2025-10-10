import mermaid from 'mermaid';

mermaid.initialize({ 
  startOnLoad: false,
  theme: 'default'
});

// Convert code blocks with language-mermaid to mermaid diagrams
async function initMermaid() {
  // Target the pre element directly since Prism adds the class there
  const mermaidBlocks = document.querySelectorAll('pre.language-mermaid');
  
  console.log('Found mermaid blocks:', mermaidBlocks.length);
  
  for (const pre of mermaidBlocks) {
    // Get the text content from the code element inside
    const code = pre.textContent;
    
    // Create a div with mermaid class
    const div = document.createElement('div');
    div.className = 'mermaid';
    div.textContent = code;
    
    // Replace the pre element with the div
    pre.replaceWith(div);
  }
  
  // Now render all mermaid diagrams
  if (mermaidBlocks.length > 0) {
    await mermaid.run();
  }
}

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMermaid);
} else {
  initMermaid();
}
