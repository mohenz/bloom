import fs from 'node:fs';
import path from 'node:path';

export default function handler(request, response) {
  const manualPath = 'D:\\Workspace\\ui_code_helper\\docs\\사용자_매뉴얼.md';
  
  if (fs.existsSync(manualPath)) {
    try {
      const content = fs.readFileSync(manualPath, 'utf8');
      // Set text/plain with UTF-8 encoding to render directly in browser as readable text
      response.setHeader('Content-Type', 'text/plain; charset=utf-8');
      response.status(200).send(content);
    } catch (error) {
      response.status(500).json({ error: '파일을 읽는데 실패했습니다: ' + error.message });
    }
  } else {
    response.status(404).json({ 
      error: '로컬 매뉴얼 파일을 찾을 수 없습니다. D:\\Workspace\\ui_code_helper\\docs\\사용자_매뉴얼.md 경로가 유효한지 확인해주세요.' 
    });
  }
}
