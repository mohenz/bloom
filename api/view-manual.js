import fs from 'node:fs';
import path from 'node:path';

export default function handler(request, response) {
  const manualPath = 'D:\\Workspace\\ui_code_helper\\docs\\사용자_매뉴얼.md';
  
  if (fs.existsSync(manualPath)) {
    try {
      const content = fs.readFileSync(manualPath, 'utf8');
      
      // Escape characters to prevent breaking JavaScript template literals
      const escapedContent = content
        .replace(/\\/g, '\\\\')
        .replace(/`/g, '\\`')
        .replace(/\$/g, '\\$');

      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.status(200).send(`
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UI Code Helper - 사용자 매뉴얼</title>
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%2311110f'/%3E%3Cpath d='M18 44V20h12.5c7.3 0 11.5 3.8 11.5 9.6 0 4.8-2.8 8.1-7.4 9.5L44 44h-8.3l-8.1-4.2H26V44h-8zm8-10.4h4.1c2.7 0 4.2-1.3 4.2-3.6s-1.5-3.5-4.2-3.5H26v7.1z' fill='%23f0a500'/%3E%3C/svg%3E">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@100..800&family=Noto+Sans+KR:wght@300;400;500;700&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet"/>
  <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <style>
    * { border-radius: 0px !important; }
    .hard-shadow {
      box-shadow: 6px 6px 0px 0px #1a1c1e;
    }
    body {
      font-family: 'IBM Plex Sans', 'Noto Sans KR', sans-serif;
      background-color: #f9f9fc;
    }
    code {
      font-family: 'JetBrains Mono', monospace;
    }
  </style>
</head>
<body class="text-on-surface antialiased min-h-screen pb-12">
  <header class="bg-white w-full border-b-2 border-slate-900 sticky top-0 z-50">
    <nav class="flex justify-between items-center max-w-[960px] mx-auto px-6 py-4 w-full">
      <div class="font-bold text-slate-900 tracking-tighter flex items-center gap-2 text-lg">
        <span class="material-symbols-outlined text-[#002366] text-[24px]">extension</span>
        <span>UI CODE HELPER MANUAL</span>
      </div>
      <div>
        <a class="border-2 border-slate-900 px-4 py-1.5 text-sm hover:bg-slate-100 transition-all bg-white font-bold block text-center" href="http://localhost:3000/index.html">대시보드로</a>
      </div>
    </nav>
  </header>

  <main class="max-w-[960px] mx-auto px-6 py-10">
    <article class="bg-white border-2 border-slate-900 p-8 md:p-12 hard-shadow prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-a:text-blue-600 hover:prose-a:text-blue-800 prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-pre:border-2 prose-pre:border-slate-900" id="markdownContent">
      <div class="flex items-center justify-center py-12">
        <span class="material-symbols-outlined animate-spin text-[36px] text-slate-600">sync</span>
      </div>
    </article>
  </main>

  <script>
    document.addEventListener('DOMContentLoaded', () => {
      const markdownRaw = \`${escapedContent}\`;
      const htmlContent = marked.parse(markdownRaw);
      document.getElementById('markdownContent').innerHTML = htmlContent;
    });
  </script>
</body>
</html>
      `);
    } catch (error) {
      response.status(500).json({ error: '파일을 읽어오는데 실패했습니다: ' + error.message });
    }
  } else {
    response.status(404).send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>파일 분실</title>
</head>
<body style="font-family:sans-serif; text-align:center; padding:100px; background-color:#f9f9fc;">
  <h2>매뉴얼 파일을 찾을 수 없습니다.</h2>
  <p>D:\\Workspace\\ui_code_helper\\docs\\사용자_매뉴얼.md 경로가 유효한지 확인해주세요.</p>
  <a href="http://localhost:3000/index.html" style="display:inline-block; border:2px solid #1a1c1e; padding:10px 20px; background-color:#ffffff; text-decoration:none; color:#1a1c1e; font-weight:bold; margin-top:20px;">대시보드로</a>
</body>
</html>
    `);
  }
}
