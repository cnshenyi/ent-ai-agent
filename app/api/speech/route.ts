import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('file') as File;

    if (!audioFile) {
      return Response.json({ error: '缺少音频文件' }, { status: 400 });
    }

    // 转换音频为base64
    const arrayBuffer = await audioFile.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString('base64');

    const requestBody = {
      user: {
        uid: process.env.DOUBAO_SPEECH_APP_ID
      },
      audio: {
        data: base64Audio
      },
      request: {
        model_name: 'bigmodel'
      }
    };

    console.log('Using APP ID:', process.env.DOUBAO_SPEECH_APP_ID);
    console.log('Using Access Token:', process.env.DOUBAO_SPEECH_ACCESS_TOKEN?.substring(0, 10) + '...');

    const response = await fetch('https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-App-Key': process.env.DOUBAO_SPEECH_APP_ID || '',
        'X-Api-Access-Key': process.env.DOUBAO_SPEECH_ACCESS_TOKEN || '',
        'X-Api-Resource-Id': 'volc.bigasr.auc_turbo',
        'X-Api-Request-Id': randomUUID(),
        'X-Api-Sequence': '-1',
      },
      body: JSON.stringify(requestBody),
    });

    const text = await response.text();
    console.log('Speech API raw response:', response.status, text);
    console.log('Response length:', text.length);

    if (!response.ok) {
      return Response.json({ error: `API错误 ${response.status}: ${text}` }, { status: 500 });
    }

    try {
      const result = JSON.parse(text);
      console.log('Parsed result:', JSON.stringify(result, null, 2));

      // 尝试多种可能的字段路径
      const transcript = result.result?.text ||
                        result.text ||
                        result.data?.text ||
                        result.resp?.result?.text ||
                        '';

      console.log('Extracted transcript:', transcript);
      return Response.json({ text: transcript });
    } catch {
      return Response.json({ error: `无法解析响应: ${text}` }, { status: 500 });
    }
  } catch (error) {
    console.error('Server error:', error);
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
