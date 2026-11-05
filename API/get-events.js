export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const NOTION_API_KEY = process.env.NOTION_API_KEY;
  const SCHEDULE_DB_ID = process.env.NOTION_SCHEDULE_DB_ID; // 일정 DB ID
  const TODO_DB_ID = process.env.NOTION_TODO_DB_ID;         // 할 일 DB ID

  if (!NOTION_API_KEY || !SCHEDULE_DB_ID || !TODO_DB_ID) {
    return res.status(500).json({ error: '환경 변수 설정이 누락되었습니다.' });
  }

  // 오늘 기준 어제(-1일)부터 7일간 데이터 필터링 기준일 계산
  const now = new Date();
  const startDate = new Date(now.setDate(now.getDate() - 1)).toISOString().split('T')[0];

  const headers = {
    'Authorization': `Bearer ${NOTION_API_KEY}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json'
  };

  try {
    // 1. 일정 DB 조회 (날짜: '날짜', 제목: '이름')
    const scheduleRes = await fetch(`https://api.notion.com/v1/databases/${SCHEDULE_DB_ID}/query`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        filter: {
          property: '날짜',
          date: { on_or_after: startDate }
        }
      })
    });
    const scheduleData = await scheduleRes.json();

    if (scheduleData.object === 'error') {
      return res.status(500).json({ error: `일정 DB 조회 오류: ${scheduleData.message}` });
    }

    // 2. 할 일 DB 조회 (날짜: '날짜', 제목: '계획')
    const todoRes = await fetch(`https://api.notion.com/v1/databases/${TODO_DB_ID}/query`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        filter: {
          property: '날짜',
          date: { on_or_after: startDate }
        }
      })
    });
    const todoData = await todoRes.json();

    if (todoData.object === 'error') {
      return
