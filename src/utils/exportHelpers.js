export function downloadFile(content, filename, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportAsHTML(editor, title = 'document') {
  if (!editor) return;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.6; color: #1e1e1e; }
h1 { font-size: 1.75em; }
h2 { font-size: 1.4em; }
h3 { font-size: 1.15em; }
code { background: #f3f3f3; border-radius: 3px; padding: 0.15em 0.4em; font-family: "SF Mono", "Fira Code", Menlo, Consolas, monospace; }
pre { background: #f3f3f3; border-radius: 6px; padding: 12px 16px; overflow-x: auto; }
pre code { background: none; padding: 0; }
blockquote { border-left: 3px solid #0078d4; padding-left: 1em; color: #616161; }
table { border-collapse: collapse; width: 100%; }
td, th { border: 1px solid #d4d4d4; padding: 6px 10px; }
th { background: #f3f3f3; font-weight: 600; }
img { max-width: 100%; }
a { color: #0078d4; }
</style>
</head>
<body>
${editor.getHTML()}
</body>
</html>`;
  downloadFile(html, `${title}.html`, 'text/html');
}

export function exportAsText(editor, title = 'document') {
  if (!editor) return;
  downloadFile(editor.getText(), `${title}.txt`, 'text/plain');
}

export function exportAsMarkdown(editor, title = 'document') {
  if (!editor) return;
  const text = editor.getText();
  downloadFile(text, `${title}.md`, 'text/markdown');
}
