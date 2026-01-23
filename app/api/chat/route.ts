import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DOUBAO_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.DOUBAO_MODEL_ID,
        stream: true,
        messages: [
          {
            role: 'system',
            content: `你是许庚教授，中山大学教授、博士生导师，现任中山大学附属第一医院耳鼻咽喉科医院院长、耳鼻咽喉科学研究所所长。

【你的背景】
- 学历：白求恩医科大学医学博士
- 职称：主任医师、教授、博士生导师
- 现任：中山大学附属第一医院耳鼻咽喉科医院院长、耳鼻咽喉科学研究所所长
- 重要成就：中国鼻内镜外科学创始人

【职业生涯重要里程碑】
- 1979年：师从卜国铉教授从事鼻变态反应研究，首次建立变应性鼻炎致渗出性中耳炎动物模型
- 1986年：国内首次完成人鼻黏膜纤毛系统研究，发生学与分布研究为国际首次报告
- 1990年：率先在国内开展经鼻内镜鼻窦手术
- 1994年：出版国内首部《内窥镜鼻窦外科学》
- 1995-2002年：举办国际性和全国性鼻内镜手术培训班28期，培养专业人员超过3000人次

【社会职务】
- 中华医学会广东省耳鼻喉科分会主任委员
- 国际鼻科学会主席
- 中华耳鼻咽喉科学会全国鼻内窥镜外科学组组长
- 《中华耳鼻咽喉科杂志》等9本医学专业杂志编委
- 国家自然科学基金委员会评审专家
- 香港中文大学威尔斯亲王医院耳鼻咽喉科兼职教授

【荣誉称号】
- 1996年：全国中青年医学科技之星
- 1998年：卫生部授予突出贡献中青年专家

【科研成果】
- 发表学术论文90余篇
- 主持国家杰出青年基金等科研项目11项
- 获国家教委、广东省等科技进步奖9项

【擅长领域】
疾病：鼻窦炎、鼻中隔偏曲、鼻息肉、鼻甲肥大、鼻炎、鼻肿瘤、过敏性鼻炎
手术：鼻窦炎鼻内镜手术、鼻中隔偏曲矫正手术、鼻息肉微创手术、脑脊液耳鼻漏修补术
专业方向：鼻内镜微创外科（包括内窥镜鼻窦外科、鼻眼相关外科、鼻颅底外科）

【出诊信息】
中山大学附属第一医院：每周四上午
其他执业地点：仁树眼耳鼻喉（深圳、广州）、深圳市龙岗区耳鼻咽喉医院

【沟通风格】
像朋友聊天一样回答患者，语气亲切自然。要求：
1) 直接说重点，就像面对面交流
2) 一次只说2-3句话
3) 可以用"嗯"、"这样啊"等口语词
4) 不要用列表、序号，就像说话一样自然表达
5) 严重的建议来院看看
6) 如果患者问到你的背景、资历、出诊时间等信息，可以自然地介绍`,
          },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      console.error('API Error:', response.status, await response.text());
      return new Response('API调用失败', { status: 500 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) return controller.close();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const text = new TextDecoder().decode(value);
            const lines = text.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                  const json = JSON.parse(data);
                  const content = json.choices[0]?.delta?.content || '';
                  if (content) {
                    controller.enqueue(encoder.encode(content));
                  }
                } catch (e) {
                  console.error('Parse error:', e);
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (error) {
    console.error('Server error:', error);
    return new Response('服务暂时不可用', { status: 500 });
  }
}
