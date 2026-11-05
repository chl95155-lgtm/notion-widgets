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

  // 오늘 기준 -1일부터 +7일까지 데이터 조회 범위 설정
  const now = new Date();
  const startDate = new Date(now.setDate(now.getDate() - 1)).toISOString().split('T')[0];

  const headers = {
    'Authorization': `Bearer ${NOTION_API_KEY}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json'
  };

  try {
    // 1. 일정 DB 조회 (날짜 속성명: '날짜', 제목 속성명: '이름' 기준)
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

    // 2. 할 일 DB 조회 (날짜 속성명: '마감일' 또는 '날짜', 상태 속성: '상태' 또는 체크박스)
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

    // 데이터 가공 및 표준화
    const events = [];

    // 일정 가공
    (scheduleData.results || []).forEach(page => {
      const title = page.properties['이름']?.title?.[0]?.plain_text || '제목 없음';
      const dateProp = page.properties['날짜']?.date;
      if (dateProp) {
        events.push({
          type: 'schedule',
          title: title,
          date: dateProp.start.split('T')[0],
          time: dateProp.start.includes('T') ? dateProp.start.split('T')[1].substring(0, 5) : null
        });
      }
    });

    // 할 일 가공
    (todoData.results || []).forEach(page => {
      const title = page.properties['이름']?.title?.[0]?.plain_text || '할 일 없음';
      const dateProp = page.properties['날짜']?.date;
      const isDone = page.properties['완료']?.checkbox || false;
      if (dateProp) {
        events.push({
          type: 'todo',
          title: title,
          date: dateProp.start.split('T')[0],
          isDone: isDone
        });
      }
    });

    return res.status(200).json({ events });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
